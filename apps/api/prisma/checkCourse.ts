import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = '998dca7d-1f90-498e-90c6-bd478a747f9d';
  const course = await prisma.course.findUnique({ where: { id }, include: { attachments: true, scenarios: true } });
  console.log(JSON.stringify(course, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
