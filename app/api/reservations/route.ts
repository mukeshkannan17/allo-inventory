export const dynamic="force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { createReservationSchema } from "@/lib/schemas";

const RESERVATION_TTL_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;
    const idempotencyKey = req.headers.get("Idempotency-Key");

    // Bonus: Idempotency check
    if (idempotencyKey) {
      const cached = await redis.get(`idempotency:${idempotencyKey}`);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

    // Core: SELECT FOR UPDATE inside a transaction prevents race conditions.
    // If two requests come in for the last unit simultaneously, only one
    // gets the lock. The other waits, then sees reservedUnits already incremented
    // and returns 409.
    const reservation = await prisma.$transaction(async (tx) => {
      // Lock this inventory row exclusively for the duration of the transaction
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          totalUnits: number;
          reservedUnits: number;
        }>
      >`
        SELECT id, "totalUnits", "reservedUnits"
        FROM "Inventory"
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw Object.assign(new Error("Inventory not found"), { code: "NOT_FOUND" });
      }

      const inv = rows[0];
      const available = inv.totalUnits - inv.reservedUnits;

      if (available < quantity) {
        throw Object.assign(new Error("Insufficient stock"), { code: "INSUFFICIENT_STOCK" });
      }

      // Increment reserved count
      await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reservedUnits" = "reservedUnits" + ${quantity}
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
      `;

      // Create the reservation record
      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "pending",
          expiresAt,
          idempotencyKey: idempotencyKey ?? undefined,
        },
        include: {
          product: { select: { name: true, sku: true, price: true } },
        },
      });
    });

    // Cache idempotency response for 24h
    if (idempotencyKey) {
      await redis.set(`idempotency:${idempotencyKey}`, reservation, { ex: 86400 });
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    if (error?.code === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 409 }
      );
    }
    if (error?.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Product/warehouse combination not found" },
        { status: 404 }
      );
    }
    console.error("POST /api/reservations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        product: { select: { name: true, sku: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
