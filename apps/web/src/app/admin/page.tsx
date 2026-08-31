"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiJson, API_URL } from "../../lib/api";
import { fetchCurrentUser, getCachedUser } from "../../lib/auth";

type StoredUser = { role: "STUDENT" | "COACH" | "ADMIN"; };

type EvaluationCriteriaGroup = { title: string; items: string[] };

type Course = { id: string; title: string; description: string; theory?: string; showAdminScenarios: boolean; evaluationCriteria?: EvaluationCriteriaGroup[]; };

type Scenario = {
  id: string;
  title: string;
  problemStatement: string;
  coachingMaterials: string | null;
  ownerId?: string | null;
  owner?: { id?: string; fullName?: string; email?: string; role?: string } | null;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseTheory, setCourseTheory] = useState("");
  const [courseLevel, setCourseLevel] = useState<string | null>(null);
  const [showAdminScenarios, setShowAdminScenarios] = useState(true);
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [courseCriteriaGroups, setCourseCriteriaGroups] = useState<EvaluationCriteriaGroup[]>([{ title: "Obstacole", items: [""] }]);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  

  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioProblem, setScenarioProblem] = useState("");
  const [scenarioCoaching, setScenarioCoaching] = useState("");
  const [scenarioDifficulty, setScenarioDifficulty] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [addScenarioNotification, setAddScenarioNotification] = useState<string | null>(null);

  const selectedCourse = useMemo(() => courses.find((c) => c.id === selectedCourseId) ?? null, [courses, selectedCourseId]);

  useEffect(() => {
    async function loadAdmin() {
      const cached = getCachedUser();
      if (cached?.role === "ADMIN") {
        setIsAdmin(true);
        setReady(true);
        await loadCourses();
        return;
      }

      const user = await fetchCurrentUser().catch(() => null);
      setIsAdmin(user?.role === "ADMIN");
      setReady(true);
      if (user?.role === "ADMIN") {
        await loadCourses();
      }
    }

    void loadAdmin();
  }, []);

  useEffect(() => { if (selectedCourseId) loadScenarios(selectedCourseId); else setScenarios([]); }, [selectedCourseId]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return apiJson<T>(path, options);
  }

  async function loadCourses() {
    try { const data = await request<Course[]>("/courses"); setCourses(data); } catch { showMessage("Nu am putut incarca cursurile.", "error"); }
  }

  async function loadScenarios(courseId: string) {
    try { const data = await request<Scenario[]>(`/scenarios/course/${courseId}`); setScenarios(data); } catch { setScenarios([]); }
  }

  function showMessage(text: string, type: "success" | "error") { setMessage(text); setMessageType(type); setTimeout(() => { setMessage(null); setMessageType(null); }, 4000); }
  function resetCourseForm() {
    setCourseTitle("");
    setCourseDescription("");
    setCourseTheory("");
    setCourseLevel(null);
    setShowAdminScenarios(true);
    setAttachments(null);
    setEditingCourseId(null);
    
  }
  function resetScenarioForm() { setScenarioTitle(""); setScenarioProblem(""); setScenarioCoaching(""); setScenarioDifficulty(null); setEditingScenarioId(null); }

  function updateCriteriaGroup(groupIndex: number, field: "title" | "items", value: string | string[]) {
    setCourseCriteriaGroups((prev) => prev.map((group, index) => {
      if (index !== groupIndex) return group;
      if (field === "title") return { ...group, title: String(value) };
      return { ...group, items: value as string[] };
    }));
  }

  function addCriteriaGroup() {
    setCourseCriteriaGroups((prev) => [...prev, { title: "", items: [""] }]);
  }

  function addCriteriaItem(groupIndex: number) {
    setCourseCriteriaGroups((prev) => prev.map((group, index) => index === groupIndex ? { ...group, items: [...group.items, ""] } : group));
  }

  function removeCriteriaGroup(groupIndex: number) {
    setCourseCriteriaGroups((prev) => (prev.length === 1 ? [{ title: "Obstacole", items: [""] }] : prev.filter((_, index) => index !== groupIndex)));
  }

  function removeCriteriaItem(groupIndex: number, itemIndex: number) {
    setCourseCriteriaGroups((prev) => prev.map((group, index) => {
      if (index !== groupIndex) return group;
      const nextItems = group.items.filter((_, idx) => idx !== itemIndex);
      return { ...group, items: nextItems.length > 0 ? nextItems : [""] };
    }));
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    try {
      const normalizedCriteria = courseCriteriaGroups
        .map((group) => ({
          title: group.title.trim() || "Secțiune",
          items: group.items.map((item) => item.trim()).filter(Boolean)
        }))
        .filter((group) => group.items.length > 0);

      const payloadData: any = {
        title: courseTitle,
        description: courseDescription,
        theory: courseTheory,
        showAdminScenarios,
        evaluationCriteria: normalizedCriteria
      };

      // If files selected, send multipart/form-data directly using fetch
      if (attachments && attachments.length > 0) {
        const form = new FormData();
        form.append("title", payloadData.title);
        form.append("description", payloadData.description);
        form.append("theory", payloadData.theory ?? "");
        // level removed; do not append
        form.append("showAdminScenarios", String(payloadData.showAdminScenarios));
        form.append("evaluationCriteria", JSON.stringify(payloadData.evaluationCriteria || []));
        for (let i = 0; i < attachments.length; i++) {
          form.append("attachments", attachments[i]);
        }

        const url = editingCourseId ? `${API_URL}/courses/${editingCourseId}` : `${API_URL}/courses`;
        const method = editingCourseId ? "PATCH" : "POST";

        const resp = await fetch(url, { method, body: form, credentials: "include" });
        if (!resp.ok) {
          const json = await resp.json().catch(() => null);
          throw new Error(json?.message || `Request failed: ${resp.status}`);
        }
        showMessage(editingCourseId ? "Curs actualizat!" : "Curs creat!", "success");
      } else {
        if (editingCourseId) {
          await request(`/courses/${editingCourseId}`, {
            method: "PATCH",
            body: JSON.stringify(payloadData)
          });
          showMessage("Curs actualizat!", "success");
        } else {
          await request("/courses", {
            method: "POST",
            body: JSON.stringify(payloadData)
          });
          showMessage("Curs creat!", "success");
        }
      }
      resetCourseForm(); await loadCourses();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Eroare";
      showMessage(text, "error");
      setAddScenarioNotification(text);
      setTimeout(() => setAddScenarioNotification(null), 5000);
    }
  }

  async function deleteCourse(courseId: string) {
    if (!confirm("Sigur stergi cursul?")) return;
    // Optimistic UI: remove immediately
    const previous = courses;
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    if (selectedCourseId === courseId) setSelectedCourseId("");
    try {
      await request(`/courses/${courseId}`, { method: "DELETE" });
      showMessage("Curs sters!", "success");
    } catch (err) {
      // revert on error and reload
      setCourses(previous);
      showMessage("Nu am putut sterge cursul.", "error");
      await loadCourses();
    }
  }

  function editCourse(course: Course) {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseDescription(course.description);
    setCourseTheory(course.theory ?? "");
    // level removed
    setShowAdminScenarios(course.showAdminScenarios);
    setCourseCriteriaGroups(
      (course.evaluationCriteria && course.evaluationCriteria.length > 0)
        ? course.evaluationCriteria.map((group) => ({
            title: group.title,
            items: group.items.length > 0 ? group.items : [""]
          }))
        : [{ title: "Obstacole", items: [""] }]
    );
    setAttachments(null);
    setSelectedCourseId(course.id);
  }

  async function saveScenario(event: FormEvent) {
    event.preventDefault();
    if (!selectedCourseId) { showMessage("Selecteaza un curs mai intai.", "error"); return; }
    const defaultPdcaRubrics = [
      { name: "P (PLAN) - Obstacol & Cauză (CE & CARE?)", description: "Definirea precisă a obstacolului (unde/cum se pierde ceva în proces față de Starea Țintă, fără soluții mascate sau concluzii pripite) și identificarea cauzei rădăcină prin 'Du-te și vezi' (Go & See)." },
      { name: "P (PLAN) - Pasul Următor & Tipologie", description: "Formularea unui pas mic, rapid și specific. Clasificarea clară a pasului în unul din cele 3 tipuri: 1) Du-te și vezi; 2) Experiment explorator; 3) Testarea unei ipoteze." },
      { name: "P (PLAN) - Așteptări & Predicție Cuantificabilă", description: "Formularea unei predicții numerice/cuantificabile ÎNAINTE de experiment (# pași reduși, # mișcări, timp în secunde, număr defecte) care poate fi comparată 1:1 la Check." },
      { name: "D & C (DO & CHECK) - Execuție Rapidă & Rezultat Observat Direct", description: "Execuția pe termen scurt fără întreruperea procesului și înregistrarea faptelor observate direct (fără opinii/presupuneri), realizând o comparație mecanică 1:1 între Așteptări și Rezultat." },
      { name: "A (ACT) - Învățare Științifică & Evitarea Greșelilor", description: "Extragerea 'informațiilor utile' (useful information) din abateri/surprize, stabilizarea ce a funcționat sau construirea unei noi ipoteze, evitând cele 7 greșeli comune." }
    ];
    const payload = { title: scenarioTitle, problemStatement: scenarioProblem, coachingMaterials: scenarioCoaching || null, courseId: selectedCourseId, rubrics: defaultPdcaRubrics };
    try {
      if (editingScenarioId) { await request(`/scenarios/${editingScenarioId}`, { method: "PATCH", body: JSON.stringify({ title: payload.title, problemStatement: payload.problemStatement, coachingMaterials: payload.coachingMaterials }) }); showMessage("Scenariu actualizat!", "success"); }
      else { await request("/scenarios", { method: "POST", body: JSON.stringify(payload) }); showMessage("Scenariu adaugat!", "success"); }
      // show inline notification near the form
      setAddScenarioNotification(editingScenarioId ? "Scenariu actualizat!" : "Scenariu adaugat!");
      setTimeout(() => setAddScenarioNotification(null), 3000);
      resetScenarioForm(); await loadScenarios(selectedCourseId);
    } catch (error) { showMessage(error instanceof Error ? error.message : "Eroare", "error"); }
  }

  async function deleteScenario(scenarioId: string) {
    if (!confirm("Sigur stergi scenariul?")) return;
    // Optimistic UI: remove scenario immediately
    const previous = scenarios;
    setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    try {
      await request(`/scenarios/${scenarioId}`, { method: "DELETE" });
      showMessage("Scenariu sters!", "success");
      if (selectedCourseId) await loadScenarios(selectedCourseId);
    } catch (err) {
      // revert on error and reload
      setScenarios(previous);
      showMessage("Nu am putut sterge scenariul.", "error");
      if (selectedCourseId) await loadScenarios(selectedCourseId);
    }
  }
  function editScenario(scenario: Scenario) { setEditingScenarioId(scenario.id); setScenarioTitle(scenario.title); setScenarioProblem(scenario.problemStatement); setScenarioCoaching(scenario.coachingMaterials || ""); }

  

  if (!ready) return null;
  if (!isAdmin) return (<section className="page-stack"><div className="card"><h2>Acces interzis</h2><p>Doar adminul poate accesa aceasta pagina.</p></div></section>);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="course-meta">Admin</p>
          <h1>Administrare Become Better</h1>
          <p>Gestioneaza cursurile si scenariile de practica.</p>
        </div>
        <div className="hero-actions">
          <a href="/admin/scores" className="button">Vezi scorurile studentilor</a>
          <a href="/dashboard" className="secondary-btn">Inapoi la dashboard</a>
        </div>
      </div>

      {message && <div className={`message ${messageType}`}>{message}</div>}

      <div className="admin-grid admin-grid--stacked">
        <div className="card">
          <h2>{editingCourseId ? "Editeaza curs" : "Creeaza curs nou"}</h2>
          <form className="form-grid" onSubmit={saveCourse}>
            <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Titlu curs" required />
            <textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} placeholder="Descriere curs" rows={8} required />
            {courseDescription.trim().length > 0 && courseDescription.trim().length < 10 && (
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Descrierea trebuie să conțină cel puțin 10 caractere.</p>
            )}
            <textarea value={courseTheory} onChange={(e) => setCourseTheory(e.target.value)} placeholder="Teoria cursului (poate fi mai multe paragrafe)" rows={10} />
            <label style={{ display: "block", marginTop: 8 }}>
              Atașează fișiere (PDF / PPTX)
              <div className="file-control" style={{ marginTop: 8 }}>
                <div className="file-btn-wrapper">
                  <span className="button">Alege fișiere</span>
                  <input className="file-input" type="file" accept=".pdf,.ppt,.pptx" multiple onChange={(e) => setAttachments(e.target.files)} />
                </div>
                <span className="muted" style={{ marginLeft: 10 }}>{attachments && attachments.length > 0 ? `${attachments.length} fișier(e) selectat(e)` : "Niciun fișier selectat"}</span>
              </div>
            </label>
            {/* level removed */}

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <strong>Criterii:</strong>
                <button type="button" className="secondary-btn" onClick={addCriteriaGroup}>Adauga sectiune</button>
              </div>

              {courseCriteriaGroups.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} style={{ border: "1px solid #dbeafe", borderRadius: "10px", padding: "12px", background: "#fff", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <input
                      value={group.title}
                      onChange={(e) => updateCriteriaGroup(groupIndex, "title", e.target.value)}
                      placeholder="Ex: Obstacole"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="danger-btn" onClick={() => removeCriteriaGroup(groupIndex)}>Sterge</button>
                  </div>

                  {group.items.map((item, itemIndex) => (
                    <div key={`item-${groupIndex}-${itemIndex}`} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <input
                        value={item}
                        onChange={(e) => {
                          const nextItems = [...group.items];
                          nextItems[itemIndex] = e.target.value;
                          updateCriteriaGroup(groupIndex, "items", nextItems);
                        }}
                        placeholder="Ex: lipsa claritatii"
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="secondary-btn" onClick={() => removeCriteriaItem(groupIndex, itemIndex)}>X</button>
                    </div>
                  ))}

                  <button type="button" className="secondary-btn" onClick={() => addCriteriaItem(groupIndex)}>Adauga criteriu</button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="submit" disabled={!(courseTitle.trim().length >= 3 && courseDescription.trim().length >= 10)}>{editingCourseId ? "Salveaza" : "Creeaza"}</button>
              {editingCourseId && <button type="button" className="secondary-btn" onClick={resetCourseForm}>Anuleaza</button>}
            </div>
          </form>
          
        </div>

        <div className="card">
          <h2>Cursuri existente</h2>
          <div className="admin-list">
            {courses.map((course) => (
              <div className={`admin-row ${selectedCourseId === course.id ? "selected" : ""}`} key={course.id}>
                <button className="text-btn" type="button" onClick={() => setSelectedCourseId(course.id)} style={{ textAlign: "left", flex: 1 }}>
                  <strong>{course.title}</strong>
                </button>
                <div className="row-actions">
                  <button className="secondary-btn" type="button" onClick={() => editCourse(course)}>Editeaza</button>
                  <button className="danger-btn" type="button" onClick={() => deleteCourse(course.id)}>Sterge</button>
                </div>
              </div>
            ))}
            {courses.length === 0 && <div className="empty-state">Nu exista cursuri inca.</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "17px", color: "var(--primary-dark)" }}>Setări vizibilitate scenarii admin</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 600, flex: 1, minWidth: "240px" }}>
            Afișează scenariile create de admin pentru toate cursurile din site?
            <select
              value={courses.every((course) => course.showAdminScenarios) ? "da" : "nu"}
              onChange={(e) => setCourses((prev) => prev.map((course) => ({ ...course, showAdminScenarios: e.target.value === "da" })))}
              style={{ maxWidth: "160px" }}
            >
              <option value="da">Da</option>
              <option value="nu">Nu</option>
            </select>
          </label>
          <button
            type="button"
            className="button"
            onClick={async () => {
              const nextValue = courses.every((course) => course.showAdminScenarios);
              try {
                await Promise.all(
                  courses.map((course) =>
                    request(`/courses/${course.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ showAdminScenarios: nextValue }),
                    })
                  )
                );
                const text = nextValue ? "Scenariile adminului sunt vizibile pentru toți elevii." : "Scenariile adminului sunt ascunse pentru toți elevii.";
                showMessage(text, "success");
                setSaveNotification(text);
                setTimeout(() => setSaveNotification(null), 3000);
              } catch (error) {
                showMessage(error instanceof Error ? error.message : "Eroare", "error");
                setSaveNotification("Eroare la salvare");
                setTimeout(() => setSaveNotification(null), 3000);
              }
            }}
          >
            Save
          </button>
        </div>
        {saveNotification ? (
          <div style={{ marginTop: 12 }} className="inline-notice success">{saveNotification}</div>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2>Administrare scenarii de practica</h2>
        <div className="admin-grid">
          <div>
            <h4>{editingScenarioId ? "Editeaza scenariu" : "Adauga scenariu nou"}</h4>
            <form className="form-grid" onSubmit={saveScenario}>
              <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                style={{ marginBottom: "16px" }}
              >
                <option value="">Selecteaza cursul</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <input value={scenarioTitle} onChange={(e) => setScenarioTitle(e.target.value)} placeholder="Titlu scenariu" required />
              <textarea value={scenarioProblem} onChange={(e) => setScenarioProblem(e.target.value)} placeholder="Enuntul problemei (ce trebuie sa rezolve studentul)" rows={6} required />
              <textarea value={scenarioCoaching} onChange={(e) => setScenarioCoaching(e.target.value)} placeholder="Materiale de coaching (optional)" rows={4} />
              {/* difficulty removed */}
              <button type="submit" disabled={!selectedCourseId}>
                {editingScenarioId ? "Salveaza" : "Adauga"}
              </button>
              {editingScenarioId && <button className="secondary-btn" type="button" onClick={resetScenarioForm}>Anuleaza</button>}
            </form>
            {addScenarioNotification ? (
              <div style={{ marginTop: 12 }} className="inline-notice success">{addScenarioNotification}</div>
            ) : null}
            {!selectedCourseId && <p className="muted" style={{ fontSize: "14px", marginTop: "8px" }}>Selecteaza un curs pentru a adauga un scenariu.</p>}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h4 style={{ margin: 0 }}>Scenarii existente</h4>
              <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{ padding: "4px 8px", fontSize: "14px" }}
              >
                <option value="">Toate cursurile</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const adminScenarios = scenarios.filter((s) => s.ownerId === null || s.owner?.role === "ADMIN");
              const studentScenarios = scenarios.filter((s) => s.ownerId !== null && s.owner?.role !== "ADMIN");

              if (scenarios.length === 0) {
                return (
                  <div className="empty-state">
                    {!selectedCourseId ? "Selecteaza un curs pentru a vedea scenariile." : "Nu exista scenarii pentru acest curs."}
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <h5 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "var(--primary-dark)" }}>
                      Scenarii create de admin ({adminScenarios.length})
                    </h5>
                    <div className="admin-list">
                      {adminScenarios.map((scenario) => (
                        <div className="admin-row" key={scenario.id}>
                          <div>
                            <strong>{scenario.title}</strong>
                            <p className="muted" style={{ fontSize: "12px", margin: "4px 0 0" }}>
                              Curs: {selectedCourse?.title || "Neselectat"}
                            </p>
                          </div>
                          <div className="row-actions">
                            <button className="secondary-btn" type="button" onClick={() => editScenario(scenario)}>Editeaza</button>
                            <button className="danger-btn" type="button" onClick={() => deleteScenario(scenario.id)}>Sterge</button>
                          </div>
                        </div>
                      ))}
                      {adminScenarios.length === 0 && <div className="empty-state" style={{ fontSize: "13px" }}>Nu există scenarii create de admin.</div>}
                    </div>
                  </div>

                  <div>
                    <h5 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#8b5cf6" }}>
                      Scenarii create de studenți ({studentScenarios.length})
                    </h5>
                    <div className="admin-list">
                      {studentScenarios.map((scenario) => (
                        <div className="admin-row" key={scenario.id}>
                          <div>
                            <strong>{scenario.title}</strong>
                            <p className="muted" style={{ fontSize: "12px", margin: "4px 0 0" }}>
                              Creat de: {scenario.owner?.fullName || scenario.owner?.email || "Student"} | Curs: {selectedCourse?.title || "Neselectat"}
                            </p>
                          </div>
                          <div className="row-actions">
                            <button className="secondary-btn" type="button" onClick={() => editScenario(scenario)}>Editeaza</button>
                            <button className="danger-btn" type="button" onClick={() => deleteScenario(scenario.id)}>Sterge</button>
                          </div>
                        </div>
                      ))}
                      {studentScenarios.length === 0 && <div className="empty-state" style={{ fontSize: "13px" }}>Nu există scenarii create de studenți.</div>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <style jsx>{`
        
        .file-control { display: flex; align-items: center; gap: 10px; }
        .file-btn-wrapper { position: relative; display: inline-block; }
        .file-btn-wrapper .button { position: relative; z-index: 1; }
        .file-btn-wrapper .file-input { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .admin-grid--stacked { grid-template-columns: 1fr; }
        .inline-notice { padding: 8px 12px; border-radius: 8px; display: inline-block; font-size: 14px; }
        .inline-notice.success { background: rgba(16,185,129,0.08); color: #065f46; border: 1px solid rgba(16,185,129,0.12); }
      `}</style>
    </section>
  );
}
