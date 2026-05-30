import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getAllStudentScores(req: Request, res: Response) {
  try {
    const responses = await prisma.scenarioResponse.findMany({
      where: {
        isGraded: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        scenario: {
          include: {
            module: {
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
        },
        rubricScores: {
          include: {
            rubric: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const formatted = responses.map((resp) => ({
      id: resp.id,
      student: {
        id: resp.user.id,
        fullName: resp.user.fullName,
        email: resp.user.email,
      },
      scenario: {
        id: resp.scenario.id,
        title: resp.scenario.title,
        difficulty: resp.scenario.difficulty,
      },
      course: {
        id: resp.scenario.module.course.id,
        title: resp.scenario.module.course.title,
      },
      module: {
        id: resp.scenario.module.id,
        title: resp.scenario.module.title,
      },
      overallScore: resp.overallScore,
      aiEvaluation: resp.aiEvaluation,
      response: resp.response.substring(0, 200) + (resp.response.length > 200 ? "..." : ""),
      rubricScores: resp.rubricScores.map((rs) => ({
        rubricName: rs.rubric.name,
        score: rs.score,
        feedback: rs.feedback,
      })),
      gradedAt: resp.updatedAt,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("Get student scores error:", error);
    return res.status(500).json({ message: "Failed to fetch student scores" });
  }
}
