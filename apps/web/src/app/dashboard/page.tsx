"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Course = {
  id: string;
  title: string;
  description: string;
  level?: string;
  modules: Array<{ id: string }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Te rugam sa te autentifici.");
      return;
    }

    fetch(`${API_URL}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Nu am putut incarca lista de cursuri.");
        const payload = (await response.json()) as Course[];
        setCourses(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.");
      });
  }, []);

  const totalModules = courses.reduce((sum, course) => sum + course.modules.length, 0);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Dashboard</p>
          <h1>Cursurile tale, organizate pentru practica reala.</h1>
          <p>Alege un curs, parcurge modulele si treci apoi la scenarii pentru feedback aplicat.</p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{courses.length}</strong>
            <span>Cursuri</span>
          </div>
          <div className="stat">
            <strong>{totalModules}</strong>
            <span>Module</span>
          </div>
          <div className="stat">
            <strong>AI</strong>
            <span>Evaluare</span>
          </div>
        </div>
      </div>

      {error ? <p className="message error">{error}</p> : null}
      {!error && courses.length === 0 ? (
        <div className="empty-state">Nu sunt cursuri disponibile inca.</div>
      ) : null}

      <div className="dashboard-grid">
        {courses.map((course) => (
          <article className="card course-card" key={course.id}>
            <span className="course-meta">{course.level ?? "BEGINNER"}</span>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <p className="muted">Module disponibile: {course.modules.length}</p>
            <Link className="button" href={`/courses/${course.id}`}>Deschide cursul</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
