"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";

type ScenarioResponse = {
  id: string;
  scenario: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
  overallScore: number | null;
  isGraded: boolean;
  response: string;
  gradedAt: string;
  createdAt: string;
};

type PdcaEvaluation = {
  id: string;
  projectName: string | null;
  rowData: {
    obstacle?: string;
    cause?: string;
    nextStep?: string;
    expected?: string;
    due?: string;
    result?: string;
    learned?: string;
  };
  overallScore: number;
  generalFeedback: string;
  columnScores: Array<{
    id: string;
    column: string;
    score: number;
    feedback: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export default function ProgressPage() {
  const [responses, setResponses] = useState<ScenarioResponse[]>([]);
  const [pdcaEvaluations, setPdcaEvaluations] = useState<PdcaEvaluation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<ScenarioResponse[]>("/scenarios/responses"),
      apiGet<PdcaEvaluation[]>("/scenarios/pdca-evaluations"),
    ])
      .then(([scenarioPayload, pdcaPayload]) => {
        setResponses(scenarioPayload);
        setPdcaEvaluations(pdcaPayload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.");
      });
  }, []);

  const graded = responses.filter((r) => r.isGraded).length;
  const savedScores = [
    ...responses.map((r) => r.overallScore).filter((score): score is number => score !== null),
    ...pdcaEvaluations.map((item) => item.overallScore),
  ];
  const totalEvaluated = graded + pdcaEvaluations.length;
  const totalItems = responses.length + pdcaEvaluations.length;
  const averageScore = savedScores.length > 0
    ? Math.round(savedScores.reduce((sum, score) => sum + score, 0) / savedScores.length)
    : 0;

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Analiza</p>
          <h1>Scenariile tale de practica.</h1>
          <p>Urmareste raspunsurile trimise si scorurile obtinute la evaluarea AI.</p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{totalEvaluated}</strong>
            <span>Evaluate</span>
          </div>
          <div className="stat">
            <strong>{totalItems}</strong>
            <span>Total</span>
          </div>
          <div className="stat">
            <strong>{averageScore}</strong>
            <span>Scor mediu</span>
          </div>
        </div>
      </div>

      <div className="card progress-section">
        <h2>Evaluari PDCA</h2>
        {!error && pdcaEvaluations.length === 0 ? <div className="empty-state">Nu ai salvat inca nicio evaluare PDCA.</div> : null}
        <div className="progress-list">
          {pdcaEvaluations.map((evaluation) => (
            <div className="progress-row" key={evaluation.id}>
              <div>
                <strong>{evaluation.projectName || "Practica deliberata - PDCA"}</strong>
                <p className="muted">{evaluation.rowData.obstacle || "Rand PDCA evaluat"}</p>
                <p className="muted" style={{ fontSize: "12px" }}>
                  Evaluat: {new Date(evaluation.updatedAt).toLocaleDateString("ro-RO")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="status-pill done">{evaluation.overallScore}/100</span>
                <p className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                  {evaluation.columnScores.length} criterii
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card progress-section">
        <h2>Raspunsuri la scenarii</h2>
        {error ? <p className="message error">{error}</p> : null}
        {!error && responses.length === 0 ? <div className="empty-state">Nu ai trimis inca niciun raspuns la scenarii de practica.</div> : null}
        <div className="progress-list">
          {responses.map((response) => (
            <div className="progress-row" key={response.id}>
              <div>
                <strong>{response.scenario.title}</strong>
                <p className="muted">{response.scenario.course.title}</p>
                <p className="muted" style={{ fontSize: "12px" }}>
                  {new Date(response.createdAt).toLocaleDateString("ro-RO")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                {response.isGraded ? (
                  <>
                    <span className={`status-pill done`}>
                      {response.overallScore ?? 0}/100
                    </span>
                    <p className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                      Evaluat: {new Date(response.gradedAt).toLocaleDateString("ro-RO")}
                    </p>
                  </>
                ) : (
                  <span className="status-pill todo">In evaluare</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
