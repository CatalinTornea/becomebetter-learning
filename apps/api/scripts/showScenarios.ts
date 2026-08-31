#!/usr/bin/env ts-node
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({ select: { id: true, title: true } });
  for (const c of courses) {
    const scenarios = await prisma.scenario.findMany({ where: { courseId: c.id }, orderBy: { createdAt: "asc" } });
    console.log(`COURSE: ${c.title} (${c.id})`);
    if (scenarios.length === 0) {
      console.log("  (no scenarios)");
      continue;
    }
    for (const s of scenarios) {
      console.log(`  - ${s.id} | ${s.title} | ownerId=${s.ownerId ?? "null"} | visibility=${s.visibility} | createdAt=${s.createdAt.toISOString()}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
