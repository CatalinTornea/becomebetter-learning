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

export interface PdcaColumnEvaluation {
  column: string;
  score: number;
  feedback: string;
}

export interface PdcaEvaluationResult {
  overallScore: number;
  columnFeedback: PdcaColumnEvaluation[];
  generalFeedback: string;
}

const pdcaKataCriteria = [
  {
    column: "Obstacol",
    standard:
      "Obstacolul descrie locul sau modul concret în care se pierde ceva în proces față de indicatorul țintă. Trebuie să răspundă la întrebarea: unde credem că pierdem indicatorul țintă astăzi, în starea actuală? Exemple bune: pierdem timp cu așteptarea într-o secvență, pierdem timp prin deplasări inutile, pierdem calitate într-un pas al procesului. Nu accepta soluții mascate, concluzii generale sau formulări care nu indică o pierdere observabilă.",
  },
  {
    column: "Cauză",
    standard:
      "Cauza trebuie să explice de ce apare obstacolul și să fie separată clar de obstacol. Caută semne de analiză prin observație directă, date sau întrebări repetate de tip de ce. Penalizează presupunerile, opiniile și confuzia dintre obstacol și cauză.",
  },
  {
    column: "Pasul următor",
    standard:
      "Pasul următor trebuie să fie mic, concret și realizabil rapid, ideal până mâine. Trebuie să se încadreze într-unul din cele trei tipuri: du-te și vezi, experiment explorator sau testarea unei ipoteze. Penalizează proiectele mari, pașii pe mai multe săptămâni, schimbările simultane pe mai multe obstacole și formulările vagi.",
  },
  {
    column: "Așteptări",
    standard:
      "Așteptările trebuie formulate înainte de experiment și trebuie să poată fi comparate 1:1 cu rezultatul. Pentru du-te și vezi, cursantul ar trebui să spună ce informații se așteaptă să obțină despre procesul actual. Pentru experiment explorator, ar trebui să spună ce informații așteaptă despre obstacolele care blochează starea țintă. Pentru testarea unei ipoteze, ar trebui să existe o predicție concretă, preferabil numerică: pași reduși, mișcări reduse, timp redus, defecte reduse sau alt indicator clar. Penalizează așteptări de tip va fi mai eficient.",
  },
  {
    column: "Până când",
    standard:
      "Termenul trebuie să fie o dată clară și scurtă, potrivită pentru un ciclu PDCA rapid. Pasul ar trebui să poată fi făcut până mâine sau foarte curând, ca învățarea să fie rapidă. Penalizează termenele lungi sau lipsa unei date.",
  },
  {
    column: "Rezultat",
    standard:
      "Rezultatul trebuie să noteze ce s-a observat direct, nu ce se presupune. Verifică dacă pasul următor s-a realizat exact cum a fost planificat. Dacă s-a realizat diferit, rezultatul trebuie să spună ce a fost diferit. Rezultatul trebuie să fie comparabil 1:1 cu așteptările și să includă o comparație explicită predicție versus realitate.",
  },
  {
    column: "Ce am învățat",
    standard:
      "Învățarea trebuie să plece din ce s-a întâmplat efectiv și din diferența dintre predicție și rezultat. Trebuie să arate ce spune experimentul despre sistem, ce a funcționat și poate fi standardizat sau ce nu a funcționat și cere o nouă ipoteză. Penalizează concluziile superficiale de tip lipsă training sau lipsă standard dacă nu explică observația concretă. Un rezultat care nu confirmă ipoteza trebuie tratat ca informație utilă, nu ca eșec.",
  },
] as const;

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

export async function evaluatePdcaExperiment(input: {
  projectName?: string;
  currentState?: string;
  futureState?: string;
  outputMetric?: { name?: string; actual?: string; target?: string; unit?: string };
  processMetrics?: Array<{ name?: string; actual?: string; target?: string; unit?: string }>;
  obstacles?: string[];
  row: {
    obstacle?: string;
    cause?: string;
    nextStep?: string;
    expected?: string;
    due?: string;
    result?: string;
    learned?: string;
  };
}): Promise<PdcaEvaluationResult> {
  if (!apiKey) {
    throw new Error("Evaluatorul AI nu este configurat. Lipsește GROQ_API_KEY în mediul API.");
  }

  const criteria = pdcaKataCriteria;

  const prompt = `Ești un Master Coach Toyota Kata. Evaluează un singur rând PDCA completat de cursant, folosind criteriile din fișa PDCA_KATA_Pehart.xlsx.
Răspunde obligatoriu în limba română și numai cu JSON valid.

Context proiect:
- Proiect: ${input.projectName || "nespecificat"}
- Stare actuală: ${input.currentState || "necompletată"}
- Stare viitoare: ${input.futureState || "necompletată"}
- Indicator output: ${JSON.stringify(input.outputMetric || {})}
- Indicatori proces: ${JSON.stringify(input.processMetrics || [])}
- Obstacole listate: ${JSON.stringify(input.obstacles || [])}

Rând PDCA:
${JSON.stringify(input.row, null, 2)}

Criterii pe coloane:
${criteria.map((item) => `- ${item.column}: ${item.standard}`).join("\n")}

Reguli stricte:
- Evaluează fiecare coloană separat, după criteriul ei.
- Penalizează explicit săritul la soluții, pașii prea mari, predicția reconstruită după rezultat, opiniile în locul observațiilor, ignorarea surprizelor, combinarea mai multor schimbări și neînchiderea ciclului Check/Act.
- Nu recompensa texte lungi dacă nu sunt observabile, verificabile și comparabile 1:1.
- Feedbackul trebuie să spună concret ce este bine și ce trebuie rescris.
- Returnează feedback pentru toate cele 7 coloane, chiar dacă unele sunt goale.

Format JSON:
{
  "overallScore": <număr 0-100>,
  "columnFeedback": [
    { "column": "Obstacol", "score": <număr 0-100>, "feedback": "<feedback scurt, practic, în română>" }
  ],
  "generalFeedback": "<sinteză scurtă și următorul lucru de îmbunătățit>"
}`;

  const modelsToTry = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "groq/compound",
    "qwen/qwen3.6-27b",
    "llama-3.3-70b-versatile",
  ];

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: modelName,
        response_format: { type: "json_object" },
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText) as PdcaEvaluationResult;
      const receivedFeedback = Array.isArray(parsed.columnFeedback) ? parsed.columnFeedback : [];

      return {
        overallScore: Math.max(0, Math.min(100, Number(parsed.overallScore) || 0)),
        columnFeedback: criteria.map((criterion) => {
          const match = receivedFeedback.find((item) => item.column === criterion.column);
          return {
            column: criterion.column,
            score: Math.max(0, Math.min(100, Number(match?.score) || 0)),
            feedback: match?.feedback || "Nu am primit feedback pentru această coloană.",
          };
        }),
        generalFeedback: parsed.generalFeedback || "Reia rândul cu un obstacol mai clar, o predicție măsurabilă și o comparație directă rezultat versus așteptare.",
      };
    } catch (error) {
      console.warn(`[PDCA Evaluator] Model ${modelName} failed:`, error instanceof Error ? error.message : error);
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Eroare evaluare AI (Groq API): ${detail}`);
}
