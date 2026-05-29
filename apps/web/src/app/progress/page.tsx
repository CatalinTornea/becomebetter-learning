"use client";

import { useEffect, useState } from "react";

type ProgressRow = {
  id: string;
  completed: boolean;
  module: {
    title: string;
    course: { title: string };
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ProgressPage() {
  const [items, setItems] = useState<ProgressRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Te rugam sa te autentifici.");
      return;
    }
    fetch(`${API_URL}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Nu am putut incarca progresul.");
        const payload = (await response.json()) as ProgressRow[];
        setItems(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.");
      });
  }, []);

  const completed = items.filter((item) => item.completed).length;
  const percent = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Analiza</p>
          <h1>Progresul tau pe module.</h1>
          <p>Urmareste ce ai finalizat si unde merita sa revii pentru consolidare.</p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{completed}</strong>
            <span>Finalizate</span>
          </div>
          <div className="stat">
            <strong>{items.length}</strong>
            <span>Total</span>
          </div>
          <div className="stat">
            <strong>{percent}%</strong>
            <span>Completare</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Module urmarite</h2>
        {error ? <p className="message error">{error}</p> : null}
        {!error && items.length === 0 ? <div className="empty-state">Nu exista progres inregistrat inca.</div> : null}
        <div className="progress-list">
          {items.map((item) => (
            <div className="progress-row" key={item.id}>
              <div>
                <strong>{item.module.course.title}</strong>
                <p className="muted">{item.module.title}</p>
              </div>
              <span className={`status-pill ${item.completed ? "done" : "todo"}`}>
                {item.completed ? "Finalizat" : "In lucru"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
