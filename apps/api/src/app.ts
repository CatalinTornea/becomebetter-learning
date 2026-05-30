import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/authRoutes.js";
import { courseRoutes } from "./routes/courseRoutes.js";
import { progressRoutes } from "./routes/progressRoutes.js";
import { scenarioRoutes } from "./routes/scenarioRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) =>
  res.json({
    message: "Become better API is running",
    endpoints: ["/health", "/auth", "/courses", "/progress", "/scenarios"]
  })
);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/courses", courseRoutes);
app.use("/progress", progressRoutes);
app.use("/scenarios", scenarioRoutes);
app.use("/admin", adminRoutes);

app.use(errorHandler);
