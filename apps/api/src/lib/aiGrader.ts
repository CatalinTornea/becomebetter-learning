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

SCORING GUIDELINES - BE STRICT:
- 90-100: Exceptional, comprehensive, insightful response that exceeds expectations
- 70-89: Good response with minor gaps, demonstrates solid understanding
- 50-69: Adequate response with notable gaps or missing key elements
- 30-49: Poor response, significant misunderstandings or missing critical components
- 0-29: Very poor or irrelevant response that fails to address the problem

CRITICAL RULES:
1. "I don't know" or vague responses = MAXIMUM 10-20 points
2. Generic responses without specific solutions = MAXIMUM 30-40 points
3. Partial solutions with missing details = 50-70 points
4. Only give 80+ for truly well-thought, actionable responses
5. Be HONEST and CRITICAL - don't give pity points

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
