"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiJson } from "../../../../lib/api";

type Props = { params: Promise<{ courseId: string }> };

export default function CreateScenarioPage({ params }: Props) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [courseTitle, setCourseTitle] = useState("Curs");
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve(params).then(async (value) => {
      if (!isMounted) return;
      setCourseId(value.courseId);

      try {
        const course = await apiGet<{ title?: string }>(`/courses/${value.courseId}`);
        if (isMounted) {
          setCourseTitle(course.title || "Curs");
        }
      } catch {
        // ignore if course title cannot be fetched
      }
    });

    return () => {
      isMounted = false;
    };
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const created = await apiJson<{ id: string }>("/scenarios/user", {
        method: "POST",
        body: JSON.stringify({
          title,
          problemStatement,
          courseId
        })
      });

      router.push(`/scenarios/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscuta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <h1>Adaugă propriul scenariu pentru {courseTitle}</h1>
      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error ? <p className="message error">{error}</p> : null}

        <label>
          Titlu
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label>
          Enunțul problemei
          <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} rows={6} required />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "Se încarcă..." : "Creează scenariul"}
          </button>
          <button type="button" className="secondary-btn" onClick={() => router.push(`/courses/${courseId}`)}>
            Anulează
          </button>
        </div>
      </form>
    </section>
  );
}
