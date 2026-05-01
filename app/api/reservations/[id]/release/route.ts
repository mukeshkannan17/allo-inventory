import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation || reservation.status !== "pending") return NextResponse.json({ error: "Gone" }, { status: 410 });
  await prisma.$transaction([prisma.reservation.update({ where: { id }, data: { status: "released" } }), prisma.inventory.updateMany({ where: { productId: reservation.productId, warehouseId: reservation.warehouseId }, data: { reservedUnits: { decrement: reservation.quantity } } })]);
  return NextResponse.json({ status: "released" });
}