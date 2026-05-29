import { Router } from "express";
import { getMyProgress, updateProgress } from "../controllers/progressController.js";
import { requireAuth } from "../middleware/auth.js";
import { submitQuiz } from "../controllers/quizController.js";

export const progressRoutes = Router();

progressRoutes.get("/", requireAuth, getMyProgress);
progressRoutes.post("/", requireAuth, updateProgress);
progressRoutes.post("/quiz-attempt", requireAuth, submitQuiz);
