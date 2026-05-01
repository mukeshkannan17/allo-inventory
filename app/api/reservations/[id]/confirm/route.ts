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
      return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
    }

    if (reservation.status === "released") {
      return NextResponse.json(
        { error: "Reservation has been released" },
        { status: 410 }
      );
    }

    if (new Date() > reservation.expiresAt) {
      // Auto-release the reservation since it's expired
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
      return NextResponse.json(
        { error: "Reservation has expired" },
        { status: 410 }
      );
    }

    // Confirm: decrement totalUnits and reservedUnits (stock is permanently sold)
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: { status: "confirmed" },
      }),
      prisma.$executeRaw`
        UPDATE "Inventory"
        SET
          "totalUnits" = GREATEST(0, "totalUnits" - ${reservation.quantity}),
          "reservedUnits" = GREATEST(0, "reservedUnits" - ${reservation.quantity})
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `,
    ]);

    return NextResponse.json({ status: "confirmed", reservationId: params.id });
  } catch (error) {
    console.error("POST /api/reservations/[id]/confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
