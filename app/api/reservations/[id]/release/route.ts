import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status === "confirmed") {
      return NextResponse.json(
        { error: "Cannot release a confirmed reservation" },
        { status: 409 }
      );
    }

    if (reservation.status === "released") {
      return NextResponse.json({ status: "already released" });
    }

    // Release: only decrement reservedUnits (stock returns to available)
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: { status: "released" },
      }),
      prisma.$executeRaw`
        UPDATE "Inventory"
        SET "reservedUnits" = GREATEST(0, "reservedUnits" - ${reservation.quantity})
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `,
    ]);

    return NextResponse.json({ status: "released", reservationId: params.id });
  } catch (error) {
    console.error("POST /api/reservations/[id]/release error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
