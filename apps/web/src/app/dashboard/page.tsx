"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";

type Scenario = {
  id: string;
  title: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  scenarios: Scenario[];
};

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Course[]>("/courses")
      .then((payload) => { setCourses(payload); })
      .catch((fetchError) => {
        const msg = fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.";
        if (msg.includes("401")) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("user");
            window.location.href = "/auth/login";
          }
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalScenarios = courses.reduce((sum, course) => sum + course.scenarios.length, 0);

  return (
    <section className="page-stack">
      {/* Hero */}
      <div className="page-hero">
        <div>
          <p className="course-meta">Dashboard</p>
          <h1>
            Cursurile tale,{" "}
            <span className="gradient-text">organizate pentru practică reală.</span>
          </h1>
          <p style={{ marginTop: 10 }}>
            Alege un curs și exersează cu scenarii practice pentru feedback aplicat.
          </p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{loading ? "–" : courses.length}</strong>
            <span>Cursuri</span>
          </div>
          {/* Scenarii removed per request */}
          <div className="stat">
            <strong>AI</strong>
            <span>Evaluare</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error ? <p className="message error">{error}</p> : null}

      {/* Empty */}
      {!error && !loading && courses.length === 0 ? (
        <div className="empty-state">Nu sunt cursuri disponibile încă.</div>
      ) : null}

      {/* Loading skeleton */}
      {loading ? (
        <div className="courses-list">
          {[1, 2].map((i) => (
            <div key={i} className="card course-card-wide skeleton-card">
              <div className="skeleton-line" style={{ width: "55%", height: 22 }} />
              <div className="skeleton-line" style={{ width: "30%", height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : null}

      {/* Course list */}
      {!loading ? (
        <div className="courses-list">
          {courses.map((course, idx) => (
            <article className="card course-card-wide" key={course.id} style={{ animationDelay: `${idx * 80}ms` }}>
              <div className="course-header">
                <div>
                  <div className="course-top-meta">
                    <span className="course-index">#{String(idx + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{course.title}</h3>
                  {course.description ? (
                    <p className="course-desc">{course.description}</p>
                  ) : null}
                </div>
                <Link className="button" href={`/courses/${course.id}`}>
                  Deschide cursul <span style={{ opacity: 0.8 }}>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <style>{`
        .courses-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .course-card-wide {
          padding: 28px 32px;
          animation: slideUp 0.4s ease both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .course-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .course-top-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .course-index {
          font-size: 12px;
          font-weight: 800;
          font-family: "Plus Jakarta Sans", sans-serif;
          color: var(--ink-subtle);
          letter-spacing: 0.08em;
        }
        .scenario-count {
          font-size: 12px;
          font-weight: 700;
          color: var(--cyan-light);
          background: rgba(6, 182, 212, 0.10);
          border: 1px solid rgba(6, 182, 212, 0.20);
          border-radius: 999px;
          padding: 3px 10px;
        }
        .course-card-wide h3 {
          font-size: 20px;
          color: var(--ink);
          margin: 0 0 6px;
          font-weight: 800;
        }
        .course-desc {
          color: var(--ink-muted);
          font-size: 14px;
          margin: 0;
          max-width: 480px;
        }
        /* Skeleton */
        .skeleton-card { pointer-events: none; }
        .skeleton-line {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
}
