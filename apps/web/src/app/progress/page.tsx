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

export default function ProgressPage() {
  const [responses, setResponses] = useState<ScenarioResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ScenarioResponse[]>("/scenarios/responses")
      .then((payload) => {
        setResponses(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.");
      });
  }, []);

  const graded = responses.filter((r) => r.isGraded).length;
  const averageScore = responses.filter(r => r.overallScore !== null).length > 0 
    ? Math.round(responses.filter(r => r.overallScore !== null).reduce((sum, r) => sum + (r.overallScore || 0), 0) / responses.filter(r => r.overallScore !== null).length)
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
            <strong>{graded}</strong>
            <span>Evaluate</span>
          </div>
          <div className="stat">
            <strong>{responses.length}</strong>
            <span>Total</span>
          </div>
          <div className="stat">
            <strong>{averageScore}</strong>
            <span>Scor mediu</span>
          </div>
        </div>
      </div>

      <div className="card">
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
