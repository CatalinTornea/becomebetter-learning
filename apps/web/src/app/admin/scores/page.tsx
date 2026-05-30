"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
    difficulty: string;
  };
  course: {
    id: string;
    title: string;
  };
  module: {
    id: string;
    title: string;
  };
  overallScore: number | null;
  aiEvaluation: string | null;
  response: string;
  rubricScores: RubricScore[];
  gradedAt: string;
}

function getToken() {
  return localStorage.getItem("accessToken") ?? localStorage.getItem("token");
}

function getStoredUser() {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export default function AdminScoresPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  useEffect(() => {
    const user = getStoredUser();
    if (user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    setIsAdmin(true);
    loadScores();
  }, [router]);

  async function loadScores() {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/student-scores`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Nu am putut incarca scorurile");
      }

      const data = await response.json();
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

  // Filter scores by selected student
  const filteredScores =
    selectedStudent === "all"
      ? scores
      : scores.filter((s) => s.student.id === selectedStudent);

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

        {/* Filter */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3>Filtreaza dupa student</h3>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            style={{ maxWidth: "400px" }}
          >
            <option value="all">Toti studentii</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName} ({student.email})
              </option>
            ))}
          </select>
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
                    <strong>Modul:</strong> {score.module.title}
                  </p>
                  <p>
                    <strong>Scenariu:</strong> {score.scenario.title}
                    <span
                      className={`difficulty-badge ${score.scenario.difficulty.toLowerCase()}`}
                      style={{ marginLeft: "8px" }}
                    >
                      {score.scenario.difficulty}
                    </span>
                  </p>
                </div>

                <div className="student-response">
                  <h4>Raspunsul studentului:</h4>
                  <p className="response-text">{score.response}</p>
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

        @media (max-width: 860px) {
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
