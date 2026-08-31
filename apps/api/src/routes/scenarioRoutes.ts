import { Router } from "express";
import {
  getScenario,
  getCourseScenarios,
  submitScenarioResponse,
  getScenarioFeedback,
  createScenario,
  createUserScenario,
  updateScenario,
  deleteScenario,
  getUserScenarioResponses,
} from "../controllers/scenarioController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { submitRateLimit } from "../middleware/rateLimit.js";

export const scenarioRoutes = Router();

// Admin endpoints (must be before :id routes to avoid conflicts)
scenarioRoutes.post("/", requireAuth, requireAdmin, createScenario);

// Allow authenticated users to create a private scenario for themselves
scenarioRoutes.post("/user", requireAuth, createUserScenario);

// Course scenarios
scenarioRoutes.get("/course/:courseId", requireAuth, getCourseScenarios);

// Student endpoints
scenarioRoutes.post("/submit", requireAuth, submitRateLimit, submitScenarioResponse);
scenarioRoutes.get("/feedback/:responseId", requireAuth, getScenarioFeedback);
scenarioRoutes.get("/responses", requireAuth, getUserScenarioResponses);
scenarioRoutes.get("/:scenarioId", requireAuth, getScenario);

// Admin update/delete
scenarioRoutes.patch("/:scenarioId", requireAuth, requireAdmin, updateScenario);
scenarioRoutes.delete("/:scenarioId", requireAuth, requireAdmin, deleteScenario);
