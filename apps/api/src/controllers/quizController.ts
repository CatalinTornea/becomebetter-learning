import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const quizSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().nonnegative(),
  moduleId: z.string().uuid()
});

const attemptSchema = z.object({
  quizId: z.string().uuid(),
  selectedIndex: z.number().int().nonnegative()
});

type QuizParams = { quizId: string };

export async function createQuiz(req: Request, res: Response) {
  const parsed = quizSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const created = await prisma.quiz.create({ data: parsed.data });
  return res.status(201).json(created);
}

export async function updateQuiz(req: Request<QuizParams>, res: Response) {
  const parsed = quizSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const updated = await prisma.quiz.update({
    where: { id: req.params.quizId },
    data: parsed.data
  });
  return res.json(updated);
}

export async function deleteQuiz(req: Request<QuizParams>, res: Response) {
  await prisma.quiz.delete({ where: { id: req.params.quizId } });
  return res.status(204).send();
}

export async function submitQuiz(req: Request, res: Response) {
  const parsed = attemptSchema.safeParse(req.body);
  if (!parsed.success || !req.user) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  const quiz = await prisma.quiz.findUnique({ where: { id: parsed.data.quizId } });
  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }
  const score = quiz.correctIndex === parsed.data.selectedIndex ? 100 : 0;
  const attempt = await prisma.quizAttempt.create({
    data: {
      score,
      userId: req.user.id,
      quizId: quiz.id
    }
  });
  return res.status(201).json({ score, attemptId: attempt.id });
}
