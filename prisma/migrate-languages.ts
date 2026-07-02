// One-off script: converts legacy language strings (e.g. "EN/FR") stored in the
// old `language` column into the new `languages` String[] column.
// Run AFTER the migration that adds the languages column.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Raw query to read the old column (Prisma client no longer knows about it
  // after the schema change, so we go direct)
  const rows = await prisma.$queryRaw<{ id: string; language: string | null }[]>`
    SELECT id, language FROM "Instructor"
  `;

  let updated = 0;
  for (const row of rows) {
    if (!row.language) continue;
    const langs = row.language
      .split("/")
      .map((l: string) => l.trim())
      .filter(Boolean);
    await prisma.$executeRaw`
      UPDATE "Instructor" SET languages = ${langs} WHERE id = ${row.id}
    `;
    updated++;
  }

  console.log(`Migrated language strings for ${updated} instructors`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
