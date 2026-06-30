/**
 * Phase 1 seed: brand configuration (PV, PX, VV).
 * Run with: npm run db:seed
 *
 * Vivid (VV) shares PV's price list per the canonical plan's resolved open
 * question — pricesFromBrandId is wired up once both brands exist.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pv = await prisma.brand.upsert({
    where: { code: "PV" },
    update: {},
    create: {
      code: "PV",
      name: "Performance Verbier",
      legalEntity: "Powder Extreme Sarl",
    },
  });

  await prisma.brand.upsert({
    where: { code: "PX" },
    update: {},
    create: {
      code: "PX",
      name: "Powder Extreme",
      legalEntity: "Powder Extreme Sarl",
    },
  });

  await prisma.brand.upsert({
    where: { code: "VV" },
    update: { pricesFromBrandId: pv.id },
    create: {
      code: "VV",
      name: "Vivid",
      legalEntity: "Powder Extreme Sarl",
      pricesFromBrandId: pv.id,
    },
  });

  console.log("Seeded brands: PV, PX, VV");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
