#!/usr/bin/env ts-node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const courseId = process.argv[2];

  if (courseId) {
    const res = await prisma.scenario.updateMany({ where: { courseId }, data: { ownerId: null } });
    console.log(`Updated ${res.count} scenario(s) for course ${courseId} (ownerId -> null)`);
  } else {
    const res = await prisma.scenario.updateMany({ data: { ownerId: null } });
    console.log(`Updated ${res.count} scenario(s) (ownerId -> null)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
