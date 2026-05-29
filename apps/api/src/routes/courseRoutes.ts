import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  updateCourse
} from "../controllers/courseController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createModule,
  deleteModule,
  updateModule
} from "../controllers/moduleController.js";
import { createQuiz, deleteQuiz, updateQuiz } from "../controllers/quizController.js";

export const courseRoutes = Router();

courseRoutes.get("/", requireAuth, getCourses);
courseRoutes.get("/:courseId", requireAuth, getCourse);
courseRoutes.post("/", requireAuth, requireAdmin, createCourse);
courseRoutes.patch("/:courseId", requireAuth, requireAdmin, updateCourse);
courseRoutes.delete("/:courseId", requireAuth, requireAdmin, deleteCourse);

courseRoutes.post("/modules", requireAuth, requireAdmin, createModule);
courseRoutes.patch("/modules/:moduleId", requireAuth, requireAdmin, updateModule);
courseRoutes.delete("/modules/:moduleId", requireAuth, requireAdmin, deleteModule);

courseRoutes.post("/quizzes", requireAuth, requireAdmin, createQuiz);
courseRoutes.patch("/quizzes/:quizId", requireAuth, requireAdmin, updateQuiz);
courseRoutes.delete("/quizzes/:quizId", requireAuth, requireAdmin, deleteQuiz);
