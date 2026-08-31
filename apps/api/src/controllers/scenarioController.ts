import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { gradeScenarioResponse } from "../lib/aiGrader.js";

const submitScenarioSchema = z.object({
  scenarioId: z.string().uuid(),
  response: z.string().min(10),
});

type ScenarioParams = { scenarioId: string };
type CourseScenarioParams = { courseId: string };
type ScenarioFeedbackParams = { responseId: string };

export async function getScenario(req: Request<ScenarioParams>, res: Response) {
  try {
    const scenario = await prisma.scenario.findUnique({
      where: { id: req.params.scenarioId },
      include: {
        rubrics: true,
        course: {
          include: {
            scenarios: {
              select: { coachingMaterials: true }
            }
          }
        },
        owner: { select: { role: true } }
      },
    });
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN";

    if (!isAdmin) {
      const isAdminScenario = scenario.ownerId === null || scenario.owner?.role === "ADMIN";
      if (isAdminScenario && !scenario.course.showAdminScenarios) {
        return res.status(403).json({ message: "Acest scenariu nu este disponibil." });
      }
      if (scenario.ownerId && scenario.ownerId !== userId && !isAdminScenario) {
        return res.status(403).json({ message: "Nu aveți acces la acest scenariu." });
      }
    }

    // If scenario has no coachingMaterials, fallback to existing course scenarios' coachingMaterials or theory/description
    if (!scenario.coachingMaterials || !scenario.coachingMaterials.trim()) {
      const fallbackCoaching =
        scenario.course.scenarios.find((s) => s.coachingMaterials && s.coachingMaterials.trim().length > 0)?.coachingMaterials ||
        scenario.course.theory ||
        scenario.course.description ||
        null;
      (scenario as any).coachingMaterials = fallbackCoaching;
    }

    return res.json(scenario);
  } catch (error) {
    console.error("Get scenario error:", error);
    return res.status(500).json({ message: "Failed to fetch scenario" });
  }
}

export async function getCourseScenarios(req: Request<CourseScenarioParams>, res: Response) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN";

    // Load course to check showAdminScenarios flag
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ message: "Course not found" });

    let scenarios: any[] = [];
    if (isAdmin) {
      // Admin sees all scenarios
      scenarios = await prisma.scenario.findMany({
        where: { courseId: req.params.courseId },
        include: { rubrics: true, owner: { select: { id: true, fullName: true, email: true, role: true } } }
      });
    } else {
      if (course.showAdminScenarios) {
        // When showAdminScenarios is true, students see admin scenarios + their own scenarios
        scenarios = await prisma.scenario.findMany({
          where: {
            courseId: req.params.courseId,
            OR: [
              { ownerId: userId || "" },
              { ownerId: null },
              { owner: { role: "ADMIN" } },
            ],
          },
          include: { rubrics: true, owner: { select: { id: true, fullName: true, email: true, role: true } } },
        });
      } else {
        // When showAdminScenarios is false, students see ONLY scenarios they created
        if (!userId) {
          scenarios = [];
        } else {
          scenarios = await prisma.scenario.findMany({
            where: { courseId: req.params.courseId, ownerId: userId },
            include: { rubrics: true, owner: { select: { id: true, fullName: true, email: true, role: true } } }
          });
        }
      }
    }

    return res.json(scenarios);
  } catch (error) {
    console.error("Get scenarios error:", error);
    return res.status(500).json({ message: "Failed to fetch scenarios" });
  }
}

// Allow students to create a private scenario visible only to them and admins
export async function createUserScenario(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const schema = z.object({
      title: z.string().min(5),
      problemStatement: z.string().min(20),
      courseId: z.string().uuid(),
      coachingMaterials: z.string().optional().default(""),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      const firstError = Object.values(errors.fieldErrors).flat()[0] || "Validation failed";
      return res.status(400).json({ message: firstError, errors });
    }

    const course = await prisma.course.findUnique({
      where: { id: parsed.data.courseId },
      include: { scenarios: { include: { rubrics: true } } },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const inheritedRubrics = course.scenarios.flatMap((scenario: { rubrics?: any[] }) => scenario.rubrics ?? []);
    const uniqueRubrics = Array.from(
      new Map<string, { name: string; description: string }>(
        inheritedRubrics.map((rubric: { name: string; description: string }) => [`${rubric.name}:${rubric.description}`, rubric])
      ).values()
    );

    if (!uniqueRubrics.length) {
      return res.status(400).json({ message: "Nu există criterii de evaluare definite de admin pentru acest curs." });
    }

    // Determine coaching materials for the user scenario:
    // 1. Explicitly provided coachingMaterials in payload
    // 2. Existing coachingMaterials from admin scenarios of the course
    // 3. Fallback to course.theory or course.description
    const existingCoachingMaterials = course.scenarios.find(
      (s: { coachingMaterials?: string | null }) => s.coachingMaterials && s.coachingMaterials.trim().length > 0
    )?.coachingMaterials;

    const coachingMaterialsToSave =
      parsed.data.coachingMaterials && parsed.data.coachingMaterials.trim().length > 0
        ? parsed.data.coachingMaterials
        : existingCoachingMaterials || course.theory || course.description || null;

    const scenario = await prisma.scenario.create({
      data: {
        title: parsed.data.title,
        problemStatement: parsed.data.problemStatement,
        coachingMaterials: coachingMaterialsToSave,
        courseId: parsed.data.courseId,
        ownerId: req.user.id,
        visibility: "PRIVATE",
        rubrics: {
          create: uniqueRubrics.map((rubric: { name: string; description: string }) => ({
            name: rubric.name,
            description: rubric.description,
          })),
        },
      },
      include: { rubrics: true },
    });

    return res.status(201).json(scenario);
  } catch (error) {
    console.error("Create user scenario error:", error);
    return res.status(500).json({ message: "Failed to create user scenario" });
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
      scenario.rubrics.map((r: { name: string; description: string }) => ({
        name: r.name,
        description: r.description,
      })),
      scenario.coachingMaterials || undefined
    );

    // Save rubric scores
    for (const rubricEval of gradingResult.rubricEvaluations) {
      const rubric = scenario.rubrics.find((r: { name: string }) => r.name === rubricEval.name);
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
    const errMessage = error instanceof Error ? error.message : "Failed to submit and grade response";
    return res.status(500).json({ message: errMessage });
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
      courseId: z.string().uuid(),
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

export async function getUserScenarioResponses(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const responses = await prisma.scenarioResponse.findMany({
      where: { userId },
      include: {
        scenario: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(responses);
  } catch (error) {
    console.error("Get user responses error:", error);
    return res.status(500).json({ message: "Failed to fetch responses" });
  }
}
