import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const moduleSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  videoUrl: z.string().url().optional(),
  orderIndex: z.number().int().nonnegative(),
  courseId: z.string().uuid()
});

type ModuleParams = { moduleId: string };

export async function createModule(req: Request, res: Response) {
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
    return res.status(400).json({ message: firstError, errors });
  }
  const created = await prisma.module.create({ data: parsed.data });
  return res.status(201).json(created);
}

export async function updateModule(req: Request<ModuleParams>, res: Response) {
  const parsed = moduleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
    return res.status(400).json({ message: firstError, errors });
  }
  const updated = await prisma.module.update({
    where: { id: req.params.moduleId },
    data: parsed.data
  });
  return res.json(updated);
}

export async function deleteModule(req: Request<ModuleParams>, res: Response) {
  await prisma.module.delete({ where: { id: req.params.moduleId } });
  return res.status(204).send();
}
