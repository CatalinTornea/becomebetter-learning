import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from multiple paths
config({ path: join(__dirname, "../../../../.env") });
config({ path: join(__dirname, "../../../.env") });
config();

import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY || "";

const groq = new Groq({
  apiKey,
});

console.log("[AI Grader] GROQ_API_KEY loaded:", apiKey ? "YES" : "NO - KEY IS MISSING!");

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

  const prompt = `Ești un Master Coach expert STRICT, RIGUROS și PRECIS specializat în METODOLOGIA PDCA TOYOTA KATA (Gândire Științifică și Experimentare Rapidă).
Evaluarea ta trebuie să fie extrem de obiectivă, verificând respectarea riguroasă a celor 4 faze ale Fișei de Experimente PDCA Kata (PLAN, DO, CHECK, ACT) și penalizând greșelile comune de gândire.

TOATE feedback-urile și explicațiile oferite studentului trebuie scrise OBLIGATORIU ÎN LIMBA ROMÂNĂ.

CONTEXTUL METODOLOGIC TOYOTA KATA PDCA:
1. P (PLAN):
   - Obstacol (CE?): Descrie clar UNDE și CUM se pierde ceva în proces față de Starea Țintă (ex: "Pierdem timp...", "Pierdem calitate..."). NU trebuie să fie o soluție mascată ("nu avem senzor X") sau o concluzie pripită!
   - Cauză (CARE?): Analiză "du-te și vezi" (Go & See) a cauzei rădăcină. Nu încurca obstacolul cu cauza!
   - Pasul Următor: Pas mic, rapid, specific (pentru azi/mâine). Trebuie încadrat în una din cele 3 tipologii de pas:
     1) "Du-te și vezi" (observare și colectare date fără a schimba nimic);
     2) "Experiment explorator" (introducerea unei schimbări pentru a vedea cum reacționează procesul);
     3) "Testarea unei ipoteze" (introducerea unei schimbări, ideal un singur factor, cu o predicție precisă).
   - Așteptări (Predicție): Ce rezultat cuantificabil se așteaptă (# pași reduși, # mișcări, timp în secunde, # defecte). Predicția se formulează ÎNAINTE de experiment!
2. D (DO):
   - Execuție pe un orizont scurt (cicluri zilnice). Urmărirea observațiilor fără a întrerupe procesul.
3. C (CHECK):
   - Rezultat observat direct (fapte văzute, nu opinii sau presupuneri). Comparație mecanică 1:1 între Așteptări (Predicție) și Rezultatul Real.
4. A (ACT / LEARNING):
   - Ce am învățat? Rezultatul neașteptat NU este un eșec, ci "informație utilă" (useful information). Confirmat -> standardizare. Neconfirmat -> nouă ipoteză.

CELE 7 GREȘELI COMUNE PE CARE TREBUIE SĂ LE PENALIZEZI:
1. Sare la soluții (propune direct o acțiune/echipament fără obstacol real -> cauză -> predicție -> experiment).
2. Pași prea mari (proiect de săptămâni/luni mascat ca "experiment").
3. Predicție reconstruită ulterior (scrie rezultatul apoi adaptează predicția).
4. Confundă opinia cu observația (raportează păreri în loc de fapte văzute direct).
5. Ignoră surprizele (trece peste un rezultat neașteptat în loc să învețe).
6. Rezolvă mai multe obstacole deodată (amestecă mai multe schimbări simultan).
7. Nu închide ciclul (trece la pasul următor fără Check/Act).

SITUAȚIA DE REZOLVAT (SCENARIUL):
${problemStatement}

${coachingMaterials ? `MATERIALE DE COACHING ȘI CONTEXT PDCA:\n${coachingMaterials}\n` : ""}

RĂSPUNSUL STUDENTULUI:
${response}

CRITERII DE EVALUARE (RUBRICI PDCA):
${rubricsText}

GRILĂ STRICTĂ DE PUNCTARE TOYOTA KATA (0-100):
- 0-20: Sare direct la soluții, răspuns gol sau ignoră complet metodologia PDCA.
- 21-40: Menționează vag PDCA dar face greșeli majore (pași uriași, lipsă predicție cuantificabilă, opinii în loc de observații).
- 41-60: Respectă structura generală PDCA dar amestecă cauzele cu obstacolele sau lipsește o comparație 1:1 între așteptări și rezultat.
- 61-80: Aplică corect PDCA cu pași mici și predicție numerică, dar are mici scăpări în rigoarea observației directe sau analiza învățării.
- 81-100: Răspuns excepțional de gândire științifică PDCA Kata: obstacol precis, cauză "du-te și vezi", tipologie clară de pas, predicție 1:1 exactă și analiză profundă a învățării (useful information).

Răspunde DOAR în format JSON valid:
{
  "overallScore": <număr între 0 și 100>,
  "rubricEvaluations": [
    {
      "name": "<numele criteriului exact>",
      "score": <număr între 0 și 100>,
      "feedback": "<feedback obiectiv în limba română evidențiind punctele forte PDCA și greșelile specifice comise (ex: sărit la soluții, predicție lipsă)>"
    }
  ],
  "generalFeedback": "<evaluare sintetică a gândirii științifice PDCA Kata, cu indicații clare pentru următorul ciclu de experimentare în limba română>"
}`;

  const modelsToTry = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "groq/compound",
    "qwen/qwen3.6-27b",
    "llama-3.3-70b-versatile",
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: modelName,
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
      console.warn(`[AI Grader] Model ${modelName} failed:`, error instanceof Error ? error.message : error);
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Eroare evaluare AI (Groq API): ${detail}`);
}
