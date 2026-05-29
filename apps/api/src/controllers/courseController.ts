import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
});

export async function getCourses(_req: Request, res: Response) {
  const courses = await prisma.course.findMany({
    include: { modules: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(courses);
}

type CourseParams = { courseId: string };

export async function getCourse(req: Request<CourseParams>, res: Response) {
  const course = await prisma.course.findUnique({
    where: { id: req.params.courseId },
    include: { modules: { include: { quizzes: true }, orderBy: { orderIndex: "asc" } } }
  });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }
  return res.json(course);
}

export async function createCourse(req: Request, res: Response) {
  const parsed = createCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
    return res.status(400).json({ message: firstError, errors });
  }
  const created = await prisma.course.create({ data: parsed.data });
  return res.status(201).json(created);
}

export async function updateCourse(req: Request<CourseParams>, res: Response) {
  const parsed = createCourseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
    return res.status(400).json({ message: firstError, errors });
  }
  const updated = await prisma.course.update({
    where: { id: req.params.courseId },
    data: parsed.data
  });
  return res.json(updated);
}

export async function deleteCourse(req: Request<CourseParams>, res: Response) {
  await prisma.course.delete({ where: { id: req.params.courseId } });
  return res.status(204).send();
}
