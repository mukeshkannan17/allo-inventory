import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "pending",
        expiresAt: { lt: new Date() },
      },
    });

    let released = 0;

    for (const reservation of expiredReservations) {
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: "released" },
        }),
        prisma.$executeRaw`
          UPDATE "Inventory"
          SET "reservedUnits" = GREATEST(0, "reservedUnits" - ${reservation.quantity})
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `,
      ]);
      released++;
    }

    return NextResponse.json({ released, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Cron expire error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
