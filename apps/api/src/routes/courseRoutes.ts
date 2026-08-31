import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  updateCourse
} from "../controllers/courseController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

export const courseRoutes = Router();

courseRoutes.get("/", requireAuth, getCourses);
courseRoutes.get("/:courseId", requireAuth, getCourse);
courseRoutes.post("/", requireAuth, requireAdmin, upload.array("attachments", 6), createCourse);
courseRoutes.patch("/:courseId", requireAuth, requireAdmin, upload.array("attachments", 6), updateCourse);
courseRoutes.delete("/:courseId", requireAuth, requireAdmin, deleteCourse);
