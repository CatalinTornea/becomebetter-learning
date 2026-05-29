import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const progressSchema = z.object({
  moduleId: z.string().uuid(),
  completed: z.boolean()
});

export async function updateProgress(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const progress = await prisma.progress.upsert({
    where: {
      userId_moduleId: {
        userId: req.user.id,
        moduleId: parsed.data.moduleId
      }
    },
    create: {
      userId: req.user.id,
      moduleId: parsed.data.moduleId,
      completed: parsed.data.completed,
      completedAt: parsed.data.completed ? new Date() : null
    },
    update: {
      completed: parsed.data.completed,
      completedAt: parsed.data.completed ? new Date() : null
    }
  });

  return res.json(progress);
}

export async function getMyProgress(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const rows = await prisma.progress.findMany({
    where: { userId: req.user.id },
    include: { module: { include: { course: true } } }
  });
  return res.json(rows);
}
