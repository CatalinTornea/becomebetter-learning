"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, API_URL } from "../../../lib/api";

type Props = { params: Promise<{ courseId: string }> };

type Rubric = {
  id: string;
  name: string;
  description: string;
};

type Scenario = {
  id: string;
  title: string;
  problemStatement: string;
  rubrics: Rubric[];
};

type EvaluationCriteriaGroup = {
  title: string;
  items: string[];
};

type Course = {
  id: string;
  title: string;
  description: string; // used as "Obiectivele cursului"
  theory?: string;
  evaluationCriteria?: EvaluationCriteriaGroup[];
  scenarios: Scenario[];
  attachments?: { id: string; originalName: string; filename?: string; url: string; mime: string }[];
};

export default function CoursePage({ params }: Props) {
  const [courseId, setCourseId] = useState<string>("");
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const scenarios = Array.isArray(course?.scenarios) ? course.scenarios : [];
  const attachments = Array.isArray(course?.attachments) ? course.attachments : [];
  const evaluationCriteria: EvaluationCriteriaGroup[] = Array.isArray(course?.evaluationCriteria)
    ? (course.evaluationCriteria as any[])
        .map((group) => {
          if (!group) return null;
          if (typeof group === "string") {
            return { title: "", items: [group.trim()] };
          }
          const title = (group.title || group.name || "").trim();
          let items: string[] = [];
          if (Array.isArray(group.items)) {
            items = group.items.map((i: any) => (typeof i === "string" ? i.trim() : String(i))).filter(Boolean);
          }
          if (items.length === 0 && group.description && typeof group.description === "string") {
            items = [group.description.trim()];
          }
          if (!title && items.length === 0) return null;
          return {
            title: title || "Criteriu de evaluare",
            items
          };
        })
        .filter((g): g is EvaluationCriteriaGroup => g !== null && (g.title.length > 0 || g.items.length > 0))
    : [];

  useEffect(() => {
    let isMounted = true;

    Promise.resolve(params).then((value) => {
      if (!isMounted) return;
      setCourseId(value.courseId);
    });

    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (!courseId) return;

    apiGet<Course>(`/courses/${courseId}`)
      .then((payload) => {
        setCourse(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Eroare necunoscuta.");
      });
  }, [courseId]);

  function openPreview(att: { url: string; mime: string }) {
    setPreviewUrl(att.url);
    setPreviewMime(att.mime || null);
    setShowPreview(true);
  }

  function closePreview() {
    setShowPreview(false);
    setPreviewUrl(null);
    setPreviewMime(null);
    setPreviewLoadError(false);
  }

  return (
    <>
    <section className="page-stack">
      {/* Back button */}
      <div style={{ marginBottom: "16px" }}>
        <Link 
          href="/dashboard" 
          className="secondary-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "999px" }}
        >
          ← Înapoi la cursuri
        </Link>
      </div>

      <div className="page-hero" style={{ paddingBottom: "16px" }}>
        <div>
          <p className="course-meta">Curs</p>
          <h1 style={{ marginBottom: "8px" }}>{course?.title ?? `Curs #${courseId}`}</h1>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{scenarios.length}</strong>
            <span>Scenarii</span>
          </div>
          <div className="stat">
            <strong>AI</strong>
            <span>Practica</span>
          </div>
        </div>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {/* Obiectivele cursului */}
      <article className="card">
        <h2 style={{ marginBottom: "16px" }}>🎯 Obiectivele cursului</h2>
        <div style={{ lineHeight: "1.7", color: "#334155" }}>
          {course?.description ? (
            course.description.split('\n').map((line, i) => (
              <p key={i} style={{ marginBottom: "8px" }}>{line || " "}</p>
            ))
          ) : (
            <p>Se incarca...</p>
          )}
        </div>
      </article>

      {/* Teoria */}
      <article className="card">
        <h2 style={{ marginBottom: "16px" }}>📘 Teoria</h2>
        <div style={{ lineHeight: "1.7", color: "#334155" }}>
          {course?.theory ? (
            course.theory.split('\n').map((line, i) => (
              <p key={i} style={{ marginBottom: "8px" }}>{line || " "}</p>
            ))
          ) : (
            <p className="muted">Nu există material teoretic încă pentru acest curs.</p>
          )}
        </div>
      </article>

      {/* Resurse atasate */}
      <article className="card">
        <h2 style={{ marginBottom: "16px" }}>📎 Resurse</h2>
        <div>
          {attachments.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {attachments.map((att) => (
                <li key={att.id} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#0f172a' }}>{att.originalName}</span>
                  <button className="secondary-btn" type="button" onClick={() => openPreview(att)} style={{ marginLeft: 'auto' }}>Preview</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nu există resurse încă.</p>
          )}
        </div>
      </article>

      {/* Criterii de evaluare */}
      <article className="card">
        <h2 style={{ marginBottom: "16px" }}>✅ Criterii de evaluare</h2>
        <div style={{ lineHeight: "1.6", color: "#334155" }}>
          {evaluationCriteria.length > 0 ? (
            <div style={{ display: "grid", gap: "16px" }}>
              {evaluationCriteria.map((group, groupIndex) => (
                <div key={`${group.title}-${groupIndex}`}>
                  {group.title ? (
                    <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#0f172a", fontWeight: 600 }}>{group.title}</h3>
                  ) : null}
                  {group.items.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "22px" }}>
                      {group.items.map((item, itemIndex) => (
                        <li key={`${group.title}-${itemIndex}`} style={{ marginBottom: "6px" }}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : scenarios.length > 0 ? (
            (() => {
              const allRubrics = scenarios.flatMap(s => s.rubrics || []);
              const unique: Record<string, Rubric> = {};
              allRubrics.forEach(r => { if (r && !unique[r.id]) unique[r.id] = r; });
              const list = Object.values(unique);
              if (!list.length) return <p className="muted">Nu există criterii definite în scenarii.</p>;
              return (
                <ol style={{ margin: 0, paddingLeft: "22px" }}>
                  {list.map((r) => (
                    <li key={r.id} style={{ marginBottom: "8px", paddingLeft: "4px" }}>
                      <strong>{r.name}</strong>: <span style={{ color: "#64748b" }}>{r.description}</span>
                    </li>
                  ))}
                </ol>
              );
            })()
          ) : (
            <p className="muted">Nu există scenarii asociate, deci nici criterii de evaluare.</p>
          )}
        </div>
      </article>

      {/* Scenarii practice */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0 }}>🎯 Scenarii de practică</h2>
        <Link
          href={`/courses/${courseId}/create-scenario`}
          className="button primary"
          style={{ padding: "10px 18px", borderRadius: "8px", background: "var(--primary)", color: "white", textDecoration: "none" }}
        >
          Adaugă propriul scenariu
        </Link>
      </div>
      <article className="card">
        {!scenarios.length ? (
          <div className="empty-state">Acest curs nu are scenarii de practică încă.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {scenarios.map((scenario, index) => (
              <div 
                key={scenario.id} 
                style={{ 
                  padding: "16px", 
                  background: "#f8fafc", 
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, color: "var(--primary-dark)" }}>
                    Scenariul {index + 1}: {scenario.title}
                  </h4>
                  {/* difficulty removed */}
                </div>
                <p style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: "14px" }}>
                  {(scenario.problemStatement || "").substring(0, 120)}...
                </p>
                <Link 
                  href={`/scenarios/${scenario.id}`}
                  className="button"
                  style={{ display: "inline-block", textDecoration: "none" }}
                >
                  Începe scenariul →
                </Link>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
    {showPreview && previewUrl && (
      <div className="preview-overlay" onClick={closePreview}>
        <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
          <button className="danger-btn close-btn" onClick={closePreview}>Închide</button>
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {previewMime && previewMime.includes('pdf') ? (
              <iframe
                src={previewUrl && previewUrl.startsWith('http') ? previewUrl : `${API_URL}${previewUrl}`}
                width="100%"
                height="100%"
                onError={() => setPreviewLoadError(true)}
                style={{ border: 'none' }}
              />
            ) : (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent((previewUrl && previewUrl.startsWith('http') ? previewUrl : API_URL + previewUrl))}`}
                width="100%"
                height="100%"
                onError={() => setPreviewLoadError(true)}
                style={{ border: 'none' }}
              />
            )}

            {previewLoadError && (
              <div className="preview-error">
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: 12 }}>Nu s-a putut încărca preview-ul.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <style jsx>{`
          .preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; }
          .preview-modal { width: 90%; max-width: 1100px; height: 80%; background: white; border-radius: 8px; padding: 16px; position: relative; z-index: 10000; }
          .preview-modal .close-btn { position: absolute; right: 12px; top: 12px; z-index: 10001; }
          .preview-modal iframe, .preview-modal embed { width: 100%; height: 100%; border: none; }
          .preview-error { position: absolute; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.95); z-index: 10002; }
        `}</style>
      </div>
    )}
  </>
  );
}
