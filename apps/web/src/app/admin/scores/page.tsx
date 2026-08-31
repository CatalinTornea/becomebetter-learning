"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "../../../lib/api";
import { fetchCurrentUser, getCachedUser } from "../../../lib/auth";

interface Student {
  id: string;
  fullName: string;
  email: string;
}

interface RubricScore {
  rubricName: string;
  score: number;
  feedback: string;
}

interface StudentScore {
  id: string;
  student: Student;
  scenario: {
    id: string;
    title: string;
  };
  course: {
    id: string;
    title: string;
  };
  overallScore: number | null;
  aiEvaluation: string | null;
  response: string;
  rubricScores: RubricScore[];
  gradedAt: string;
}

export default function AdminScoresPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedScenario, setSelectedScenario] = useState<string>("all");
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      const cached = getCachedUser();
      if (cached?.role !== "ADMIN") {
        const user = await fetchCurrentUser().catch(() => null);
        if (user?.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
      }

      setIsAdmin(true);
      await loadScores();
    }

    void loadAdmin();
  }, [router]);

  async function loadScores() {
    try {
      const data = await apiGet<StudentScore[]>("/admin/student-scores");
      setScores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  // Get unique students for filter
  const students = Array.from(
    new Map(scores.map((s) => [s.student.id, s.student])).values()
  );

  // Get unique scenarios for filter
  const scenarios = Array.from(
    new Map(scores.map((s) => [s.scenario.id, s.scenario])).values()
  );

  // Filter scores by selected student and scenario
  const filteredScores = scores.filter((s) => {
    const studentMatch = selectedStudent === "all" || s.student.id === selectedStudent;
    const scenarioMatch = selectedScenario === "all" || s.scenario.id === selectedScenario;
    return studentMatch && scenarioMatch;
  });

  // Calculate statistics
  const avgScore =
    filteredScores.length > 0
      ? Math.round(
          filteredScores.reduce((sum, s) => sum + (s.overallScore || 0), 0) /
            filteredScores.length
        )
      : 0;

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <section className="page-stack">
        <div className="container">
          <p>Se incarca...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Admin</p>
          <h1>Scoruri Studenti - Evaluari AI</h1>
          <p>Vezi toate scorurile obtinute de studenti la scenariile de practica.</p>
        </div>
      </div>

      <div className="container">
        {error ? <p className="message error">{error}</p> : null}

        {/* Full Response Modal */}
        {expandedResponse && (
          <div className="modal-overlay" onClick={() => setExpandedResponse(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Raspuns complet al studentului</h3>
                <button
                  className="close-btn"
                  onClick={() => setExpandedResponse(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p className="full-response-text">{expandedResponse}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="stats-strip" style={{ marginBottom: "24px" }}>
          <div className="stat">
            <strong>{filteredScores.length}</strong>
            <span>Evaluari totale</span>
          </div>
          <div className="stat">
            <strong>{avgScore}</strong>
            <span>Scor mediu</span>
          </div>
          <div className="stat">
            <strong>{students.length}</strong>
            <span>Studenti activi</span>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3>Filtreaza rezultatele</h3>
          <div className="filters-grid">
            <div>
              <label>Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="all">Toti studentii</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} ({student.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Scenariu</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
              >
                <option value="all">Toate scenariile</option>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scores List */}
        <div className="scores-list">
          {filteredScores.length === 0 ? (
            <div className="empty-state">
              Nu exista evaluari {selectedStudent !== "all" ? "pentru acest student" : ""}.
            </div>
          ) : (
            filteredScores.map((score) => (
              <div key={score.id} className="card score-card">
                <div className="score-header">
                  <div className="student-info">
                    <h3>{score.student.fullName}</h3>
                    <span className="student-email">{score.student.email}</span>
                  </div>
                  <div className="overall-score">
                    <strong>{score.overallScore ?? "-"}</strong>
                    <span>/ 100</span>
                  </div>
                </div>

                <div className="scenario-info">
                  <p>
                    <strong>Curs:</strong> {score.course.title}
                  </p>
                  <p>
                    <strong>Scenariu:</strong> {score.scenario.title}
                    {/* difficulty removed */}
                  </p>
                </div>

                <div className="student-response">
                  <h4>Raspunsul studentului:</h4>
                  <p className="response-text">{score.response}</p>
                  {score.response.length >= 200 && (
                    <button
                      className="secondary-btn view-full-btn"
                      onClick={() => setExpandedResponse(score.response)}
                    >
                      Vezi raspunsul complet
                    </button>
                  )}
                </div>

                {score.rubricScores.length > 0 && (
                  <div className="rubric-scores">
                    <h4>Scoruri pe criterii:</h4>
                    {score.rubricScores.map((rs, idx) => (
                      <div key={idx} className="rubric-item">
                        <div className="rubric-header">
                          <strong>{rs.rubricName}</strong>
                          <span className="score">{rs.score}/100</span>
                        </div>
                        <p>{rs.feedback}</p>
                      </div>
                    ))}
                  </div>
                )}

                {score.aiEvaluation && (
                  <div className="ai-feedback">
                    <h4>Feedback AI:</h4>
                    <p>{score.aiEvaluation}</p>
                  </div>
                )}

                <div className="graded-at">
                  <small>Evaluat la: {new Date(score.gradedAt).toLocaleString("ro-RO")}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .scores-list {
          display: grid;
          gap: 20px;
        }

        .score-card {
          display: grid;
          gap: 16px;
        }

        .score-header {
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          padding-bottom: 16px;
        }

        .student-info h3 {
          margin: 0 0 4px 0;
        }

        .student-email {
          color: var(--muted);
          font-size: 13px;
        }

        .overall-score {
          align-items: baseline;
          display: flex;
          gap: 4px;
        }

        .overall-score strong {
          color: var(--success);
          font-size: 32px;
        }

        .overall-score span {
          color: var(--muted);
          font-size: 16px;
        }

        .scenario-info p {
          margin: 4px 0;
        }

        .student-response {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
        }

        .student-response h4 {
          font-size: 14px;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }

        .response-text {
          color: #475569;
          font-style: italic;
          margin: 0;
        }

        .rubric-scores h4 {
          font-size: 14px;
          margin: 0 0 12px 0;
          text-transform: uppercase;
        }

        .ai-feedback {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 12px;
        }

        .ai-feedback h4 {
          color: #166534;
          font-size: 14px;
          margin: 0 0 8px 0;
        }

        .ai-feedback p {
          color: #166534;
          margin: 0;
        }

        .graded-at {
          color: var(--muted);
          font-size: 12px;
          text-align: right;
        }

        .filters-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .filters-grid label {
          color: var(--muted);
          display: block;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .view-full-btn {
          margin-top: 12px;
        }

        .modal-overlay {
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          inset: 0;
          justify-content: center;
          position: fixed;
          z-index: 2000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-height: 80vh;
          max-width: 800px;
          overflow: hidden;
          width: 90%;
        }

        .modal-header {
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          padding: 20px 24px;
        }

        .modal-header h3 {
          margin: 0;
        }

        .close-btn {
          align-items: center;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          color: #64748b;
          cursor: pointer;
          display: flex;
          font-size: 24px;
          height: 36px;
          justify-content: center;
          min-height: auto;
          padding: 0;
          width: 36px;
        }

        .close-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .modal-body {
          max-height: 60vh;
          overflow-y: auto;
          padding: 24px;
        }

        .full-response-text {
          line-height: 1.7;
          margin: 0;
          white-space: pre-wrap;
        }

        @media (max-width: 860px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          .score-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }

          .overall-score strong {
            font-size: 28px;
          }
        }
      `}</style>
    </section>
  );
}
