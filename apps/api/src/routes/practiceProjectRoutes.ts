import { Router } from "express";
import {
  createPracticeProject,
  deletePracticeProject,
  getPracticeProject,
  listPracticeProjects,
  updatePracticeProject,
} from "../controllers/practiceProjectController.js";
import { requireAuth } from "../middleware/auth.js";

export const practiceProjectRoutes = Router();

practiceProjectRoutes.use(requireAuth);
practiceProjectRoutes.get("/", listPracticeProjects);
practiceProjectRoutes.post("/", createPracticeProject);
practiceProjectRoutes.get("/:projectId", getPracticeProject);
practiceProjectRoutes.put("/:projectId", updatePracticeProject);
practiceProjectRoutes.delete("/:projectId", deletePracticeProject);
