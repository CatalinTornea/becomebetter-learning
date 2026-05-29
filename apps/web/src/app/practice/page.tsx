"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Scenario {
  id: string;
  title: string;
  difficulty: string;
}

interface Module {
  id: string;
  title: string;
}

function getAccessToken() {
  return localStorage.getItem("accessToken") ?? localStorage.getItem("token");
}

export default function PracticePage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedModuleId) {
      fetchScenarios(selectedModuleId);
    }
  }, [selectedModuleId]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = getAccessToken();

      if (!token) {
        setError("Te rugam sa te autentifici inainte sa accesezi practica.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiUrl}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Nu am putut incarca modulele: ${res.status}`);
      }

      const courses = await res.json();
      const allModules: Module[] = [];

      courses.forEach((course: { modules?: Module[] }) => {
        if (Array.isArray(course.modules)) {
          allModules.push(...course.modules);
        }
      });

      setModules(allModules);

      if (allModules.length > 0) {
        setSelectedModuleId(allModules[0].id);
      } else {
        setError("Nu am gasit module disponibile pentru cursuri.");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Eroare la incarcarea modulelor";
      console.error("Fetch modules error:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchScenarios = async (moduleId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = getAccessToken();

      const res = await fetch(`${apiUrl}/scenarios/module/${moduleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Nu am putut incarca scenariile: ${res.status}`);
      }

      const data = await res.json();
      setScenarios(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Eroare la incarcarea scenariilor";
      console.error("Fetch scenarios error:", errorMsg);
      setScenarios([]);
    }
  };

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Practica</p>
          <h1>Scenarii realiste pentru decizii mai bune.</h1>
          <p>Antreneaza raspunsuri, foloseste criteriile de evaluare si primeste feedback asistat.</p>
        </div>
        <div className="stats-strip">
          <div className="stat">
            <strong>{modules.length}</strong>
            <span>Module</span>
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
        <div className="card">Se incarca modulele...</div>
      ) : (
        <>
          {modules.length > 0 ? (
            <div className="card">
              <h2>Alege modulul</h2>
              <div className="module-select">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModuleId(module.id)}
                    className={`module-btn ${selectedModuleId === module.id ? "active" : ""}`}
                  >
                    {module.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {scenarios.length > 0 ? (
            <div className="card">
              <h2>Scenarii disponibile</h2>
              <div className="scenarios-grid">
                {scenarios.map((scenario) => (
                  <Link className="scenario-card" key={scenario.id} href={`/scenarios/${scenario.id}`}>
                    <h3>{scenario.title}</h3>
                    <span className={`difficulty-badge ${scenario.difficulty.toLowerCase()}`}>
                      {scenario.difficulty}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : !loading && modules.length > 0 ? (
            <div className="empty-state">Nu exista scenarii de practica pentru acest modul inca.</div>
          ) : null}
        </>
      )}
    </section>
  );
}
