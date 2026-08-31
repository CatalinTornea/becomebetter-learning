#!/usr/bin/env ts-node
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main(){
  const courses = await prisma.course.findMany({ select: { id: true, title: true, showAdminScenarios: true } });
  console.log(JSON.stringify(courses, null, 2));
}
main().catch(err=>{ console.error(err); process.exit(1); }).finally(()=>prisma.$disconnect());
