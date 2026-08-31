#!/usr/bin/env ts-node
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
// Use dev fallback secret from env.ts
const JWT_SECRET = 'dev-secret-not-for-production';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'student@becomebetter.ro' } });
  if (!user) throw new Error('Student user not found');

  const token = jwt.sign({ sub: user.id, email: user.email, fullName: user.fullName, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  const courses = await prisma.course.findMany({ select: { id: true, title: true } });
  for (const c of courses) {
    const url = `http://localhost:4000/scenarios/course/${c.id}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await resp.text();
    console.log('COURSE', c.title, 'status', resp.status);
    console.log(body.slice(0, 1000));
    console.log('----');
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
