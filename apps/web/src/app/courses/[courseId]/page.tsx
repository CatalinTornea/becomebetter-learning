"use client";

import { useEffect, useState } from "react";

type Props = { params: Promise<{ courseId: string }> };

type Course = {
  id: string;
  title: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    content: string;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function CoursePage({ params }: Props) {
  const [courseId, setCourseId] = useState<string>("");
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setCourseId(value.courseId));
  }, [params]);

  useEffect(() => {
    if (!courseId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Te rugam sa te autentifici.");
      return;
    }

    fetch(`${API_URL}/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Cursul nu a putut fi incarcat.");
        const payload = (await response.json()) as Course;
        setCourse(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.");
      });
  }, [courseId]);

  async function markComplete(moduleId: string) {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    await fetch(`${API_URL}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ moduleId, completed: true })
    });
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Curs</p>
          <h1>{course?.title ?? `Curs #${courseId}`}</h1>
          <p>{course?.description ?? "Se incarca detaliile cursului..."}</p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{course?.modules.length ?? 0}</strong>
            <span>Module</span>
          </div>
          <div className="stat">
            <strong>AI</strong>
            <span>Practica</span>
          </div>
        </div>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      <div className="course-layout">
        <article className="card">
          <h2>Despre curs</h2>
          <p>{course?.description ?? "Se incarca..."}</p>
          <p className="muted">Parcurge modulele in ritmul tau, apoi foloseste zona de practica pentru scenarii aplicate.</p>
        </article>
        <article className="card">
          <h2>Module</h2>
          {!course ? <div className="empty-state">Se incarca modulele...</div> : null}
          <div className="module-list">
            {course?.modules.map((module) => (
              <div className="module-item" key={module.id}>
                <h4>{module.title}</h4>
                <p>{module.content}</p>
                <button onClick={() => markComplete(module.id)}>Marcheaza finalizat</button>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
