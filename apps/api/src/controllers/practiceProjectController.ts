import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const projectStateSchema = z.record(z.unknown());

const savePracticeProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  state: projectStateSchema,
});

type ProjectParams = { projectId: string };

export async function listPracticeProjects(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const projects = await prisma.practiceProject.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(projects);
  } catch (error) {
    console.error("List practice projects error:", error);
    return res.status(500).json({ message: "Nu am putut încărca proiectele salvate." });
  }
}

export async function getPracticeProject(req: Request<ProjectParams>, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const project = await prisma.practiceProject.findFirst({
      where: {
        id: req.params.projectId,
        userId: req.user.id,
      },
    });

    if (!project) return res.status(404).json({ message: "Proiectul nu a fost găsit." });
    return res.json(project);
  } catch (error) {
    console.error("Get practice project error:", error);
    return res.status(500).json({ message: "Nu am putut deschide proiectul." });
  }
}

export async function createPracticeProject(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = savePracticeProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Numele proiectului este obligatoriu.", errors: parsed.error.flatten() });
    }

    const project = await prisma.practiceProject.create({
      data: {
        userId: req.user.id,
        name: parsed.data.name,
        state: parsed.data.state as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error("Create practice project error:", error);
    return res.status(500).json({ message: "Nu am putut salva proiectul." });
  }
}

export async function updatePracticeProject(req: Request<ProjectParams>, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = savePracticeProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Numele proiectului este obligatoriu.", errors: parsed.error.flatten() });
    }

    const existing = await prisma.practiceProject.findFirst({
      where: {
        id: req.params.projectId,
        userId: req.user.id,
      },
      select: { id: true },
    });

    if (!existing) return res.status(404).json({ message: "Proiectul nu a fost găsit." });

    const project = await prisma.practiceProject.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        state: parsed.data.state as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(project);
  } catch (error) {
    console.error("Update practice project error:", error);
    return res.status(500).json({ message: "Nu am putut actualiza proiectul." });
  }
}

export async function deletePracticeProject(req: Request<ProjectParams>, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const existing = await prisma.practiceProject.findFirst({
      where: {
        id: req.params.projectId,
        userId: req.user.id,
      },
      select: { id: true },
    });

    if (!existing) return res.status(404).json({ message: "Proiectul nu a fost găsit." });

    await prisma.practiceProject.delete({ where: { id: existing.id } });
    return res.status(204).send();
  } catch (error) {
    console.error("Delete practice project error:", error);
    return res.status(500).json({ message: "Nu am putut șterge proiectul." });
  }
}
