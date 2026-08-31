"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../lib/api";

interface Scenario {
  id: string;
  title: string;
  ownerId?: string | null;
  owner?: { id?: string; fullName?: string; email?: string; role?: string } | null;
}

interface Course {
  id: string;
  title: string;
}

export default function PracticePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchCourses(); }, []);

  useEffect(() => {
    if (selectedCourseId) fetchScenarios(selectedCourseId);
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Course[]>("/courses");
      setCourses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedCourseId(data[0].id);
      } else {
        setError("Nu am găsit cursuri disponibile.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcarea cursurilor");
    } finally {
      setLoading(false);
    }
  };

  const fetchScenarios = async (courseId: string) => {
    try {
      const data = await apiGet<Scenario[]>(`/scenarios/course/${courseId}`);
      setScenarios(Array.isArray(data) ? data : []);
    } catch {
      setScenarios([]);
    }
  };

  const adminScenarios = scenarios.filter((s) => s.ownerId === null || s.owner?.role === "ADMIN");
  const studentScenarios = scenarios.filter((s) => s.ownerId !== null && s.owner?.role !== "ADMIN");

  return (
    <section className="page-stack">
      {/* Hero */}
      <div className="page-hero">
        <div>
          <p className="course-meta">Practică</p>
          <h1>
            Scenarii realiste pentru{" "}
            <span className="gradient-text">decizii mai bune.</span>
          </h1>
          <p style={{ marginTop: 10 }}>
            Antrenează răspunsuri, folosește criteriile de evaluare și primește
            feedback asistat de AI.
          </p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{courses.length}</strong>
            <span>Cursuri</span>
          </div>
          <div className="stat">
            <strong>{scenarios.length}</strong>
            <span>Scenarii</span>
          </div>
          <div className="stat">
            <strong>100</strong>
            <span>Scor maxim</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="message error">
          <strong>Eroare:</strong> {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-muted)" }}>
          <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3, display: "inline-block" }} />
          <p style={{ marginTop: 12 }}>Se încarcă cursurile...</p>
        </div>
      ) : (
        <>
          {courses.length > 0 ? (
            <div className="card">
              <h2 style={{ marginBottom: 16, fontSize: 18 }}>Alege cursul</h2>
              <div className="module-select">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`module-btn ${selectedCourseId === course.id ? "active" : ""}`}
                  >
                    {course.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {adminScenarios.length > 0 ? (
            <div className="card">
              <div className="scenarios-header">
                <h2>Scenarii disponibile</h2>
                <span className="scenarios-count">{adminScenarios.length} scenarii</span>
              </div>
              <div className="scenarios-grid" style={{ marginTop: 16 }}>
                {adminScenarios.map((scenario, idx) => (
                  <Link
                    className="scenario-card"
                    key={scenario.id}
                    href={`/scenarios/${scenario.id}`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="scenario-num">#{String(idx + 1).padStart(2, "0")}</div>
                    <h3>{scenario.title}</h3>
                    <span className="scenario-cta">Practică →</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {studentScenarios.length > 0 ? (
            <div className="card" style={{ marginTop: adminScenarios.length > 0 ? 24 : 0 }}>
              <div className="scenarios-header">
                <h2>Scenarii create de studenți</h2>
                <span className="scenarios-count" style={{ background: "rgba(139, 92, 246, 0.10)", borderColor: "rgba(139, 92, 246, 0.20)", color: "#8b5cf6" }}>
                  {studentScenarios.length} scenarii
                </span>
              </div>
              <div className="scenarios-grid" style={{ marginTop: 16 }}>
                {studentScenarios.map((scenario, idx) => (
                  <Link
                    className="scenario-card"
                    key={scenario.id}
                    href={`/scenarios/${scenario.id}`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="scenario-num">#{String(idx + 1).padStart(2, "0")}</div>
                      {scenario.owner?.fullName ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
                          {scenario.owner.fullName}
                        </span>
                      ) : null}
                    </div>
                    <h3>{scenario.title}</h3>
                    <span className="scenario-cta">Practică →</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && courses.length > 0 && scenarios.length === 0 ? (
            <div className="empty-state">Nu există scenarii de practică pentru acest curs încă.</div>
          ) : null}
        </>
      )}

      <style>{`
        .scenarios-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .scenarios-header h2 { font-size: 18px; margin: 0; }
        .scenarios-count {
          font-size: 12px;
          font-weight: 700;
          color: var(--cyan-light);
          background: rgba(6, 182, 212, 0.10);
          border: 1px solid rgba(6, 182, 212, 0.20);
          border-radius: 999px;
          padding: 4px 12px;
        }
        .scenario-card {
          animation: slideUp 0.35s ease both;
          display: grid;
          gap: 8px;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scenario-num {
          font-size: 11px;
          font-weight: 800;
          color: var(--ink-subtle);
          letter-spacing: 0.08em;
          font-family: "Plus Jakarta Sans", sans-serif;
        }
        .scenario-cta {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-light);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .scenario-card:hover .scenario-cta {
          opacity: 1;
        }
        .spinner {
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--primary-light);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
