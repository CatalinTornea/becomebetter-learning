import type { Request, Response } from "express";
import path from "path";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const evaluationCriteriaItemSchema = z.string().min(1);
const evaluationCriteriaGroupSchema = z.object({
  title: z.string().min(1),
  items: z.array(evaluationCriteriaItemSchema).min(1)
});

const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  theory: z.string().nullable().optional().or(z.literal("")),
  showAdminScenarios: z.boolean().optional().default(true),
  evaluationCriteria: z.array(evaluationCriteriaGroupSchema).optional()
});

export async function getCourses(req: Request, res: Response) {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "ADMIN";

  const courses = await prisma.course.findMany({
    include: { 
      scenarios: { 
        select: { id: true, title: true, ownerId: true, owner: { select: { role: true } } }
      } 
    },
    orderBy: { createdAt: "desc" }
  });

  if (!isAdmin) {
    for (const course of courses) {
      if (course.showAdminScenarios) {
        course.scenarios = course.scenarios.filter((s) => {
          const isAdminScenario = s.ownerId === null || s.owner?.role === "ADMIN";
          const isOwnScenario = Boolean(userId && s.ownerId === userId);
          return isAdminScenario || isOwnScenario;
        });
      } else {
        course.scenarios = course.scenarios.filter((s) => {
          return Boolean(userId && s.ownerId === userId);
        });
      }
    }
  }

  return res.json(courses);
}

type CourseParams = { courseId: string };

export async function getCourse(req: Request<CourseParams>, res: Response) {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "ADMIN";

  const course = await prisma.course.findUnique({
    where: { id: req.params.courseId },
    include: {
      scenarios: {
        include: {
          rubrics: true,
          owner: { select: { role: true } }
        }
      },
      attachments: true
    }
  });

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  if (!isAdmin) {
    if (course.showAdminScenarios) {
      course.scenarios = course.scenarios.filter((s) => {
        const isAdminScenario = s.ownerId === null || s.owner?.role === "ADMIN";
        const isOwnScenario = Boolean(userId && s.ownerId === userId);
        return isAdminScenario || isOwnScenario;
      });
    } else {
      course.scenarios = course.scenarios.filter((s) => {
        return Boolean(userId && s.ownerId === userId);
      });
    }
  }

  return res.json(course);
}

export async function createCourse(req: Request, res: Response) {
  // support both JSON body and multipart/form-data with files
  const body = (req as any).body && Object.keys((req as any).body).length ? (req as any).body : req.body;
  // if multipart/form-data, some fields may arrive as strings — coerce them to expected types
  if (body) {
    if (typeof body.showAdminScenarios === "string") {
      body.showAdminScenarios = body.showAdminScenarios === "true" || body.showAdminScenarios === "1";
    }
    if (typeof body.evaluationCriteria === "string") {
      try { body.evaluationCriteria = JSON.parse(body.evaluationCriteria); } catch (_e) { /* leave as-is for validation to catch */ }
    }
  }
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
    return res.status(400).json({ message: firstError, errors });
  }
  // prisma client may be out-of-sync with schema; avoid passing unknown fields
  const createData: any = { ...parsed.data };
  const created = await prisma.course.create({ data: createData });

  // handle uploaded files if any (multer attaches files to req.files)
  const files = (req as any).files as any[] | undefined;
  if (files && files.length > 0) {
    const attachments = files.map((f) => ({
      courseId: created.id,
      filename: f.filename,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
      url: `/uploads/courses/${f.filename}`
    }));
    await prisma.courseAttachment.createMany({ data: attachments });
  }
  return res.status(201).json(created);
}

export async function updateCourse(req: Request<CourseParams>, res: Response) {
  const body = (req as any).body && Object.keys((req as any).body).length ? (req as any).body : req.body;
  if (body) {
    if (typeof body.showAdminScenarios === "string") {
      body.showAdminScenarios = body.showAdminScenarios === "true" || body.showAdminScenarios === "1";
    }
    if (typeof body.evaluationCriteria === "string") {
      try { body.evaluationCriteria = JSON.parse(body.evaluationCriteria); } catch (_e) { /* leave as-is */ }
    }
  }
  const parsed = createCourseSchema.partial().safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
    return res.status(400).json({ message: firstError, errors });
  }
  const updateData: any = { ...parsed.data };
  const updated = await prisma.course.update({
    where: { id: req.params.courseId },
    data: updateData
  });

  const files = (req as any).files as any[] | undefined;
  if (files && files.length > 0) {
    const attachments = files.map((f) => ({
      courseId: updated.id,
      filename: f.filename,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
      url: `/uploads/courses/${f.filename}`
    }));
    await prisma.courseAttachment.createMany({ data: attachments });
  }
  return res.json(updated);
}

export async function deleteCourse(req: Request<CourseParams>, res: Response) {
  await prisma.course.delete({ where: { id: req.params.courseId } });
  return res.status(204).send();
}
