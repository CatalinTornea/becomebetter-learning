import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { gradeScenarioResponse } from "../lib/aiGrader.js";

const submitScenarioSchema = z.object({
  scenarioId: z.string().uuid(),
  response: z.string().min(10),
});

type ScenarioParams = { scenarioId: string };
type ModuleScenarioParams = { moduleId: string };
type ScenarioFeedbackParams = { responseId: string };

export async function getScenario(req: Request<ScenarioParams>, res: Response) {
  try {
    const scenario = await prisma.scenario.findUnique({
      where: { id: req.params.scenarioId },
      include: { rubrics: true },
    });
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }
    return res.json(scenario);
  } catch (error) {
    console.error("Get scenario error:", error);
    return res.status(500).json({ message: "Failed to fetch scenario" });
  }
}

export async function getModuleScenarios(req: Request<ModuleScenarioParams>, res: Response) {
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { moduleId: req.params.moduleId },
      include: { rubrics: true },
    });
    return res.json(scenarios);
  } catch (error) {
    console.error("Get scenarios error:", error);
    return res.status(500).json({ message: "Failed to fetch scenarios" });
  }
}

export async function submitScenarioResponse(req: Request, res: Response) {
  try {
    const parsed = submitScenarioSchema.safeParse(req.body);
    if (!parsed.success || !req.user) {
      return res.status(400).json(parsed.error?.flatten() || { message: "Invalid payload" });
    }

    const { scenarioId, response } = parsed.data;

    // Get scenario with rubrics
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { rubrics: true },
    });

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    // Check if user already submitted for this scenario
    let scenarioResponse = await prisma.scenarioResponse.findUnique({
      where: { userId_scenarioId: { userId: req.user.id, scenarioId } },
    });

    if (!scenarioResponse) {
      scenarioResponse = await prisma.scenarioResponse.create({
        data: {
          userId: req.user.id,
          scenarioId,
          response,
        },
      });
    } else {
      scenarioResponse = await prisma.scenarioResponse.update({
        where: { id: scenarioResponse.id },
        data: { response },
      });
    }

    // Call AI grader
    const gradingResult = await gradeScenarioResponse(
      response,
      scenario.problemStatement,
      scenario.rubrics.map((r) => ({
        name: r.name,
        description: r.description,
      })),
      scenario.coachingMaterials || undefined
    );

    // Save rubric scores
    for (const rubricEval of gradingResult.rubricEvaluations) {
      const rubric = scenario.rubrics.find((r) => r.name === rubricEval.name);
      if (rubric) {
        await prisma.rubricScore.upsert({
          where: {
            rubricId_responseId: {
              rubricId: rubric.id,
              responseId: scenarioResponse.id,
            },
          },
          update: {
            score: rubricEval.score,
            feedback: rubricEval.feedback,
          },
          create: {
            rubricId: rubric.id,
            responseId: scenarioResponse.id,
            score: rubricEval.score,
            feedback: rubricEval.feedback,
          },
        });
      }
    }

    // Update response with overall score
    scenarioResponse = await prisma.scenarioResponse.update({
      where: { id: scenarioResponse.id },
      data: {
        overallScore: gradingResult.overallScore,
        aiEvaluation: gradingResult.generalFeedback,
        isGraded: true,
      },
      include: { rubricScores: { include: { rubric: true } } },
    });

    return res.status(201).json({
      response: scenarioResponse,
      grading: gradingResult,
    });
  } catch (error) {
    console.error("Submit scenario error:", error);
    return res.status(500).json({ message: "Failed to submit and grade response" });
  }
}

export async function getScenarioFeedback(req: Request<ScenarioFeedbackParams>, res: Response) {
  try {
    const response = await prisma.scenarioResponse.findUnique({
      where: { id: req.params.responseId },
      include: {
        rubricScores: {
          include: { rubric: true },
        },
      },
    });

    if (!response) {
      return res.status(404).json({ message: "Response not found" });
    }

    return res.json(response);
  } catch (error) {
    console.error("Get feedback error:", error);
    return res.status(500).json({ message: "Failed to fetch feedback" });
  }
}

// Coach endpoints
export async function createScenario(req: Request, res: Response) {
  try {
    const schema = z.object({
      title: z.string().min(5),
      problemStatement: z.string().min(20),
      coachingMaterials: z.string().optional(),
      difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
      moduleId: z.string().uuid(),
      rubrics: z.array(
        z.object({
          name: z.string().min(3),
          description: z.string().min(10),
        })
      ),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
      return res.status(400).json({ message: firstError, errors });
    }

    const { rubrics, ...scenarioData } = parsed.data;

    const scenario = await prisma.scenario.create({
      data: {
        ...scenarioData,
        rubrics: {
          create: rubrics,
        },
      },
      include: { rubrics: true },
    });

    return res.status(201).json(scenario);
  } catch (error) {
    console.error("Create scenario error:", error);
    return res.status(500).json({ message: "Failed to create scenario" });
  }
}

export async function updateScenario(req: Request<ScenarioParams>, res: Response) {
  try {
    const schema = z.object({
      title: z.string().min(5).optional(),
      problemStatement: z.string().min(20).optional(),
      coachingMaterials: z.string().optional(),
      difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
      return res.status(400).json({ message: firstError, errors });
    }

    const scenario = await prisma.scenario.update({
      where: { id: req.params.scenarioId },
      data: parsed.data,
      include: { rubrics: true },
    });

    return res.json(scenario);
  } catch (error) {
    console.error("Update scenario error:", error);
    return res.status(500).json({ message: "Failed to update scenario" });
  }
}

export async function deleteScenario(req: Request<ScenarioParams>, res: Response) {
  try {
    await prisma.scenario.delete({
      where: { id: req.params.scenarioId },
    });
    return res.status(204).send();
  } catch (error) {
    console.error("Delete scenario error:", error);
    return res.status(500).json({ message: "Failed to delete scenario" });
  }
}
