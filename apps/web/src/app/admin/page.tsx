"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type StoredUser = {
  role: "STUDENT" | "COACH" | "ADMIN";
};

type Course = {
  id: string;
  title: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  modules: Module[];
};

type Module = {
  id: string;
  title: string;
  content: string;
};

type Scenario = {
  id: string;
  title: string;
  problemStatement: string;
  coachingMaterials: string | null;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
};

function getToken() {
  return localStorage.getItem("accessToken") ?? localStorage.getItem("token");
}

function getStoredUser() {
  const stored = localStorage.getItem("user");
  if (!stored) return null;

  try {
    return JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseLevel, setCourseLevel] = useState<Course["level"]>("BEGINNER");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioProblem, setScenarioProblem] = useState("");
  const [scenarioCoaching, setScenarioCoaching] = useState("");
  const [scenarioDifficulty, setScenarioDifficulty] = useState<Scenario["difficulty"]>("BEGINNER");
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  useEffect(() => {
    const user = getStoredUser();
    const admin = user?.role === "ADMIN";
    setIsAdmin(admin);
    setReady(true);

    if (admin) {
      loadCourses();
    }
  }, []);

  useEffect(() => {
    if (selectedCourse?.modules.length) {
      const stillExists = selectedCourse.modules.some((module) => module.id === selectedModuleId);
      if (!stillExists) {
        setSelectedModuleId(selectedCourse.modules[0].id);
      }
    } else {
      setSelectedModuleId("");
      setScenarios([]);
    }
  }, [selectedCourse, selectedModuleId]);

  useEffect(() => {
    if (selectedModuleId) {
      loadScenarios(selectedModuleId);
    }
  }, [selectedModuleId]);

  async function request(path: string, options: RequestInit = {}) {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? `Cererea a esuat (${response.status}).`);
    }

    return response;
  }

  async function loadCourses() {
    try {
      const response = await request("/courses");
      const payload = (await response.json()) as Course[];
      setCourses(payload);
      if (payload.length > 0) {
        setSelectedCourseId((current) => current || payload[0].id);
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Nu am putut incarca lista de cursuri.", "error");
    }
  }

  async function loadScenarios(moduleId: string) {
    try {
      const response = await request(`/scenarios/module/${moduleId}`);
      const payload = (await response.json()) as Scenario[];
      setScenarios(payload);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Nu am putut incarca scenariile.", "error");
      setScenarios([]);
    }
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  function resetCourseForm() {
    setCourseTitle("");
    setCourseDescription("");
    setCourseLevel("BEGINNER");
    setEditingCourseId(null);
  }

  function editCourse(course: Course) {
    setCourseTitle(course.title);
    setCourseDescription(course.description);
    setCourseLevel(course.level);
    setEditingCourseId(course.id);
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const body = JSON.stringify({
        title: courseTitle,
        description: courseDescription,
        level: courseLevel
      });

      if (editingCourseId) {
        await request(`/courses/${editingCourseId}`, { method: "PATCH", body });
        showMessage("Curs actualizat.", "success");
      } else {
        const response = await request("/courses", { method: "POST", body });
        const created = (await response.json()) as Course;
        await request("/courses/modules", {
          method: "POST",
          body: JSON.stringify({
            title: "Introducere",
            content: "Modul initial pentru scenarii de practica.",
            orderIndex: 0,
            courseId: created.id
          })
        });
        setSelectedCourseId(created.id);
        showMessage("Curs adaugat.", "success");
      }

      resetCourseForm();
      await loadCourses();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Nu am putut salva cursul.", "error");
    }
  }

  async function deleteCourse(courseId: string) {
    try {
      await request(`/courses/${courseId}`, { method: "DELETE" });
      showMessage("Curs sters.", "success");
      if (selectedCourseId === courseId) {
        setSelectedCourseId("");
      }
      await loadCourses();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Nu am putut sterge cursul.", "error");
    }
  }

  function resetScenarioForm() {
    setScenarioTitle("");
    setScenarioProblem("");
    setScenarioCoaching("");
    setScenarioDifficulty("BEGINNER");
    setEditingScenarioId(null);
  }

  function editScenario(scenario: Scenario) {
    setScenarioTitle(scenario.title);
    setScenarioProblem(scenario.problemStatement);
    setScenarioCoaching(scenario.coachingMaterials ?? "");
    setScenarioDifficulty(scenario.difficulty);
    setEditingScenarioId(scenario.id);
  }

  async function saveScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedModuleId) {
      showMessage("Alege un modul inainte sa adaugi scenariul.", "error");
      return;
    }

    try {
      const payload = {
        title: scenarioTitle,
        problemStatement: scenarioProblem,
        coachingMaterials: scenarioCoaching,
        difficulty: scenarioDifficulty
      };

      if (editingScenarioId) {
        await request(`/scenarios/${editingScenarioId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        showMessage("Scenariu actualizat.", "success");
      } else {
        await request("/scenarios", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            moduleId: selectedModuleId,
            rubrics: [
              {
                name: "Claritate",
                description: "Raspunsul este structurat, concret si usor de urmarit."
              }
            ]
          })
        });
        showMessage("Scenariu adaugat.", "success");
      }

      resetScenarioForm();
      await loadScenarios(selectedModuleId);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Nu am putut salva scenariul.", "error");
    }
  }

  async function deleteScenario(scenarioId: string) {
    try {
      await request(`/scenarios/${scenarioId}`, { method: "DELETE" });
      showMessage("Scenariu sters.", "success");
      if (selectedModuleId) {
        await loadScenarios(selectedModuleId);
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Nu am putut sterge scenariul.", "error");
    }
  }

  if (!ready) {
    return <div className="card">Se verifica accesul...</div>;
  }

  if (!isAdmin) {
    return (
      <section className="page-stack">
        <div className="message error">
          Aceasta pagina este disponibila doar pentru admin.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Admin</p>
          <h1>Administrare Become better.</h1>
          <p>Doar contul admin poate adauga, edita sau sterge cursuri si scenarii de practica.</p>
        </div>
        <div className="hero-actions">
          <a href="/admin/scores" className="button">
            📊 Vezi Scoruri Studenti
          </a>
        </div>
      </div>

      {message ? <p className={`message ${messageType ?? ""}`}>{message}</p> : null}

      <div className="admin-grid">
        <div className="card">
          <h2>{editingCourseId ? "Editeaza curs" : "Adauga curs"}</h2>
          <form className="form-grid" onSubmit={saveCourse}>
            <input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} placeholder="Titlu curs" required />
            <textarea value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} placeholder="Descriere curs" required rows={4} />
            <select value={courseLevel} onChange={(event) => setCourseLevel(event.target.value as Course["level"])}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
            <button type="submit">{editingCourseId ? "Salveaza modificarile" : "Adauga curs"}</button>
            {editingCourseId ? <button className="secondary-btn" type="button" onClick={resetCourseForm}>Renunta</button> : null}
          </form>
        </div>

        <div className="card">
          <h2>Cursuri existente</h2>
          <div className="admin-list">
            {courses.map((course) => (
              <div className="admin-row" key={course.id}>
                <button className="text-btn" type="button" onClick={() => setSelectedCourseId(course.id)}>
                  <strong>{course.title}</strong>
                  <span>{course.modules.length} module</span>
                </button>
                <div className="row-actions">
                  <button className="secondary-btn" type="button" onClick={() => editCourse(course)}>Editeaza</button>
                  <button className="danger-btn" type="button" onClick={() => deleteCourse(course.id)}>Sterge</button>
                </div>
              </div>
            ))}
            {courses.length === 0 ? <div className="empty-state">Nu exista cursuri inca.</div> : null}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Selecteaza modulul pentru editare</h2>
        <div className="form-grid">
          <select
            value={selectedModuleId}
            onChange={(event) => {
              const moduleId = event.target.value;
              if (moduleId) {
                const course = courses.find((c) => c.modules.some((m) => m.id === moduleId));
                if (course) {
                  setSelectedCourseId(course.id);
                  setSelectedModuleId(moduleId);
                }
              } else {
                setSelectedCourseId("");
                setSelectedModuleId("");
              }
            }}
          >
            <option value="">Alege modulul</option>
            {courses.map((course) =>
              course.modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {course.title} - {module.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="admin-grid">
        <div className="card">
          <h2>{editingScenarioId ? "Editeaza scenariu" : "Adauga scenariu"}</h2>
          <form className="form-grid" onSubmit={saveScenario}>
            <input value={scenarioTitle} onChange={(event) => setScenarioTitle(event.target.value)} placeholder="Titlu scenariu" required />
            <textarea value={scenarioProblem} onChange={(event) => setScenarioProblem(event.target.value)} placeholder="Situatia de rezolvat" required rows={6} />
            <textarea value={scenarioCoaching} onChange={(event) => setScenarioCoaching(event.target.value)} placeholder="Materiale de coaching" rows={4} />
            <select value={scenarioDifficulty} onChange={(event) => setScenarioDifficulty(event.target.value as Scenario["difficulty"])}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
            <button type="submit" disabled={!selectedModuleId}>{editingScenarioId ? "Salveaza scenariul" : "Adauga scenariu"}</button>
            {editingScenarioId ? <button className="secondary-btn" type="button" onClick={resetScenarioForm}>Renunta</button> : null}
          </form>
        </div>

        <div className="card">
          <h2>Scenarii existente</h2>
          <div className="admin-list">
            {scenarios.map((scenario) => (
              <div className="admin-row" key={scenario.id}>
                <div>
                  <strong>{scenario.title}</strong>
                  <span className={`difficulty-badge ${scenario.difficulty.toLowerCase()}`}>{scenario.difficulty}</span>
                </div>
                <div className="row-actions">
                  <button className="secondary-btn" type="button" onClick={() => editScenario(scenario)}>Editeaza</button>
                  <button className="danger-btn" type="button" onClick={() => deleteScenario(scenario.id)}>Sterge</button>
                </div>
              </div>
            ))}
            {selectedModuleId && scenarios.length === 0 ? <div className="empty-state">Nu exista scenarii pentru modulul ales.</div> : null}
            {!selectedModuleId ? <div className="empty-state">Alege un modul pentru administrarea scenariilor.</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
