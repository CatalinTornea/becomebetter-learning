"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

interface RubricItem {
  id: string;
  name: string;
  description: string;
}

interface Scenario {
  id: string;
  title: string;
  problemStatement: string;
  coachingMaterials: string | null;
  difficulty: string;
  rubrics: RubricItem[];
}

interface RubricEvaluation {
  name: string;
  score: number;
  feedback: string;
}

interface ScenarioFeedback {
  overallScore: number;
  rubricEvaluations: RubricEvaluation[];
  generalFeedback: string;
}

function getAccessToken() {
  return localStorage.getItem("accessToken") ?? localStorage.getItem("token");
}

export function PracticeScenario({ scenarioId }: { scenarioId: string }) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ScenarioFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScenario();
  }, [scenarioId]);

  const fetchScenario = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = getAccessToken();

      if (!token) {
        setError("Te rugam sa te autentifici inainte sa deschizi scenariul.");
        return;
      }

      const res = await fetch(`${apiUrl}/scenarios/${scenarioId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Scenariul nu a putut fi incarcat.");
      const data = await res.json();
      setScenario(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la incarcarea scenariului");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!response.trim()) {
      setError("Scrie un raspuns inainte de evaluare.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = getAccessToken();

      const res = await fetch(`${apiUrl}/scenarios/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          scenarioId,
          response
        })
      });

      if (!res.ok) throw new Error("Raspunsul nu a putut fi trimis pentru evaluare.");
      const result = await res.json();
      setFeedback(result.grading);
      setResponse("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trimiterea a esuat");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="card">Se incarca scenariul...</div>;

  if (!scenario) {
    return (
      <div className="message error">
        {error ?? "Scenariul nu a fost gasit."}
      </div>
    );
  }

  return (
    <div className="practice-container">
      <aside className="practice-left">
        <div className="card">
          <p className="course-meta">Dificultate</p>
          <span className={`difficulty-badge ${scenario.difficulty.toLowerCase()}`}>
            {scenario.difficulty}
          </span>
        </div>

        {scenario.coachingMaterials ? (
          <div className="coaching-section">
            <h3>Materiale de coaching</h3>
            <div className="coaching-content">{scenario.coachingMaterials}</div>
          </div>
        ) : null}
      </aside>

      <div className="practice-right">
        <div className="card">
          <p className="course-meta">Scenariu</p>
          <h2>{scenario.title}</h2>
          <div className="problem-statement">
            <h3>Situatia de rezolvat</h3>
            <p>{scenario.problemStatement}</p>
          </div>

          {scenario.rubrics.length > 0 ? (
            <div className="rubrics-section">
              <h3>Criterii de evaluare</h3>
              {scenario.rubrics.map((rubric) => (
                <div key={rubric.id} className="rubric-item">
                  <strong>{rubric.name}</strong>
                  <p>{rubric.description}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="card">
          <h3>Raspunsul tau</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Scrie raspunsul aici. Tine cont de criteriile de evaluare."
              rows={8}
              className="response-textarea"
            />
            {error ? <div className="message error">{error}</div> : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Se evalueaza..." : "Trimite pentru evaluare AI"}
            </button>
          </form>
        </div>

        {feedback ? (
          <div className="card feedback-section">
            <h3>Rezultatul evaluarii AI</h3>
            <div className="overall-score">Scor general: {feedback.overallScore}/100</div>

            <div className="rubric-feedback">
              <h4>Feedback detaliat</h4>
              {feedback.rubricEvaluations.map((evaluation) => (
                <div key={evaluation.name} className="rubric-feedback-item">
                  <div className="rubric-header">
                    <strong>{evaluation.name}</strong>
                    <span className="score">{evaluation.score}/100</span>
                  </div>
                  <p>{evaluation.feedback}</p>
                </div>
              ))}
            </div>

            <div className="general-feedback">
              <h4>Note de coach</h4>
              <p>{feedback.generalFeedback}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
