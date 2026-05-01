import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, MH" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "Delhi, DL" },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Hub", location: "Bangalore, KA" },
  });

  // Create products with inventory
  const products = [
    {
      name: "Testosterone Support Kit",
      sku: "TSK-001",
      description: "Complete hormone health kit for men. Includes supplements and testing strips.",
      price: 2499,
      stock: [
        { warehouseId: mumbai.id, total: 5 },
        { warehouseId: delhi.id, total: 3 },
        { warehouseId: bangalore.id, total: 8 },
      ],
    },
    {
      name: "Men's Vitality Bundle",
      sku: "MVB-002",
      description: "30-day vitality supplement pack with ashwagandha and zinc.",
      price: 1799,
      stock: [
        { warehouseId: mumbai.id, total: 2 },
        { warehouseId: delhi.id, total: 10 },
        { warehouseId: bangalore.id, total: 1 },
      ],
    },
    {
      name: "Sleep & Recovery Formula",
      sku: "SRF-003",
      description: "Melatonin + magnesium blend for deep sleep and muscle recovery.",
      price: 999,
      stock: [
        { warehouseId: mumbai.id, total: 15 },
        { warehouseId: bangalore.id, total: 7 },
      ],
    },
    {
      name: "Performance Pre-Workout",
      sku: "PPW-004",
      description: "Clean energy formula with creatine and B-vitamins. No artificial colors.",
      price: 1299,
      stock: [
        { warehouseId: mumbai.id, total: 1 },
        { warehouseId: delhi.id, total: 0 },
        { warehouseId: bangalore.id, total: 4 },
      ],
    },
    {
      name: "Hair Growth Serum",
      sku: "HGS-005",
      description: "DHT-blocking topical serum for hair density and scalp health.",
      price: 3299,
      stock: [
        { warehouseId: mumbai.id, total: 6 },
        { warehouseId: delhi.id, total: 3 },
        { warehouseId: bangalore.id, total: 0 },
      ],
    },
    {
      name: "Omega-3 Premium Fish Oil",
      sku: "OFO-006",
      description: "High-potency EPA + DHA from wild-caught fish. 90 softgels.",
      price: 799,
      stock: [
        { warehouseId: mumbai.id, total: 20 },
        { warehouseId: delhi.id, total: 12 },
        { warehouseId: bangalore.id, total: 18 },
      ],
    },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
      },
    });

    for (const s of p.stock) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: s.warehouseId,
          totalUnits: s.total,
          reservedUnits: 0,
        },
      });
    }

    console.log(`  Created: ${product.name}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
