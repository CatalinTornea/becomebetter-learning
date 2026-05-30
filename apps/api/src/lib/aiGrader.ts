import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

console.log("[AI Grader] GROQ_API_KEY loaded:", process.env.GROQ_API_KEY ? "YES" : "NO - KEY IS MISSING!");

export interface RubricEvaluation {
  name: string;
  score: number; // 0-100
  feedback: string;
}

export interface AIGradingResult {
  overallScore: number; // 0-100
  rubricEvaluations: RubricEvaluation[];
  generalFeedback: string;
}

export async function gradeScenarioResponse(
  response: string,
  problemStatement: string,
  rubrics: Array<{ name: string; description: string }>,
  coachingMaterials?: string
): Promise<AIGradingResult> {
  const rubricsText = rubrics
    .map((r) => `- ${r.name}: ${r.description}`)
    .join("\n");

  const prompt = `You are a STRICT and OBJECTIVE expert coach evaluating a student's response to a problem-solving scenario.

PROBLEM STATEMENT:
${problemStatement}

${coachingMaterials ? `COACHING MATERIALS & CONTEXT:\n${coachingMaterials}\n` : ""}

STUDENT'S RESPONSE:
${response}

EVALUATION RUBRICS:
${rubricsText}

SCORING RUBRIC - USE EXACT SCORES:

0-10: Response is essentially blank, "I don't know", or completely irrelevant to the problem
11-20: Vague acknowledgment of the problem with zero actionable content
21-30: Generic platitudes with no specific solution approach mentioned
31-40: Mentions the problem but solution is superficial or impractical
41-50: Partial solution with major gaps, missing critical steps
51-60: Adequate solution with notable omissions, lacks detail in implementation
61-70: Good solution covering main points but missing refinements or edge cases
71-80: Very good response with minor gaps, demonstrates solid understanding
81-90: Excellent comprehensive solution with actionable steps and good reasoning
91-100: Outstanding exceptional response that exceeds expectations with insights

MANDATORY SCORING RULES:
- If response contains "nu stiu", "nu știu", "I don't know", "no idea" = MAXIMUM 15 points
- If response is less than 20 words = MAXIMUM 25 points
- If response is generic without addressing specific problem details = MAXIMUM 35 points
- If response lacks actionable steps = MAXIMUM 50 points
- Only award 70+ if response shows clear understanding AND provides concrete steps
- Only award 85+ if response demonstrates expertise and creative problem-solving
- NEVER give pity points - be ruthlessly objective

EVALUATION CRITERIA:
1. Does the response directly address the specific problem stated?
2. Are the proposed solutions actionable and practical?
3. Is there sufficient detail to implement the solution?
4. Does it demonstrate understanding of the domain/context?
5. Are there logical gaps or missing critical components?

Score each rubric independently, then overall score is the weighted average.

Your task:
1. Read the problem statement CAREFULLY
2. Evaluate if the response actually addresses the specific problem
3. Check if the solution is actionable and practical
4. Score based on STRICT criteria above
5. Provide constructive but honest feedback

Respond in JSON format ONLY (no markdown, no extra text):
{
  "overallScore": <number 0-100>,
  "rubricEvaluations": [
    {
      "name": "<rubric name>",
      "score": <number 0-100>,
      "feedback": "<specific, honest feedback explaining why points were deducted>"
    }
  ],
  "generalFeedback": "<honest overall assessment with specific improvement recommendations>"
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "";

    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const result = JSON.parse(jsonStr) as AIGradingResult;
    return result;
  } catch (error) {
    console.error("AI Grading error:", error);
    throw new Error("Failed to grade response with AI");
  }
}
