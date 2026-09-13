"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "../../lib/api";
import { AuthUser, fetchCurrentUser, getCachedUser } from "../../lib/auth";

type Metric = { id: string; name: string; actual: string; target: string; unit: string };
type Obstacle = { id: string; text: string };
type PdcaRow = {
  id: string;
  obstacle: string;
  cause: string;
  nextStep: string;
  expected: string;
  due: string;
  result: string;
  learned: string;
};
type KataState = {
  projectName: string;
  currentState: string;
  currentDate: string;
  futureState: string;
  futureDate: string;
  indicatorDate: string;
  output: Metric;
  process: Metric[];
  obstacles: Obstacle[];
  pdca: PdcaRow[];
  pdcaDate: string;
  measurements: Record<string, Record<string, string>>;
};
type ColumnFeedback = { column: string; score: number; feedback: string };
type PdcaFeedback = {
  rowId: string;
  overallScore: number;
  columnFeedback: ColumnFeedback[];
  generalFeedback: string;
};

const STORAGE_KEY = "beyond-knowing-practica-deliberata-v1";
const monthKey = today().slice(0, 7);

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const blankMetric = (): Metric => ({ id: makeId(), name: "", actual: "", target: "", unit: "" });
const blankObstacle = (): Obstacle => ({ id: makeId(), text: "" });
const blankPdca = (): PdcaRow => ({
  id: makeId(),
  obstacle: "",
  cause: "",
  nextStep: "",
  expected: "",
  due: "",
  result: "",
  learned: "",
});

const initialState = (): KataState => ({
  projectName: "",
  currentState: "",
  currentDate: today(),
  futureState: "",
  futureDate: today(),
  indicatorDate: today(),
  output: { id: "output", name: "", actual: "", target: "", unit: "" },
  process: Array.from({ length: 9 }, blankMetric),
  obstacles: Array.from({ length: 3 }, blankObstacle),
  pdca: Array.from({ length: 5 }, blankPdca),
  pdcaDate: today(),
  measurements: {},
});

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInMonth(month: string) {
  const [year, oneBasedMonth] = month.split("-").map(Number);
  return new Date(year, oneBasedMonth, 0).getDate();
}

function parseNumber(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function rowHasContent(row: PdcaRow) {
  return Object.entries(row).some(([key, value]) => key !== "id" && value.trim());
}

function metricHasContent(metric: Metric) {
  return [metric.name, metric.actual, metric.target, metric.unit].some((value) => value.trim());
}

function safeState(payload: unknown): KataState {
  const fallback = initialState();
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as Partial<KataState>;
  return {
    ...fallback,
    ...data,
    output: { ...fallback.output, ...(data.output ?? {}) },
    process: Array.isArray(data.process) && data.process.length ? data.process : fallback.process,
    obstacles: Array.isArray(data.obstacles) && data.obstacles.length ? data.obstacles : fallback.obstacles,
    pdca: Array.isArray(data.pdca) && data.pdca.length ? data.pdca : fallback.pdca,
    pdcaDate: typeof data.pdcaDate === "string" ? data.pdcaDate : fallback.pdcaDate,
    measurements: data.measurements && typeof data.measurements === "object" ? data.measurements : {},
  };
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value || today()}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function PracticePage() {
  const router = useRouter();
  const [state, setState] = useState<KataState>(() => initialState());
  const [activeView, setActiveView] = useState("tablou");
  const [activeMonth, setActiveMonth] = useState(monthKey);
  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [feedback, setFeedback] = useState<Record<string, PdcaFeedback>>({});
  const [evaluatingRow, setEvaluatingRow] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loaded = safeState(JSON.parse(saved));
        setState(loaded);
        setSelectedProcessId(loaded.process[0]?.id ?? "");
      } catch {
        setMessage("Datele salvate local nu au putut fi citite. Am pornit un proiect nou.");
      }
    } else {
      setSelectedProcessId(state.process[0]?.id ?? "");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      try {
        const cached = getCachedUser();
        if (!cancelled && cached) setCurrentUser(cached);
        const user = await fetchCurrentUser();
        if (cancelled) return;
        if (!user) {
          setMessage("Autentifică-te pentru a folosi pagina de practică și evaluarea AI.");
          router.replace("/?auth=login");
          return;
        }
        setCurrentUser(user);
      } catch {
        if (!cancelled) {
          setMessage("Nu am putut verifica autentificarea. Încearcă să te loghezi din nou.");
          router.replace("/?auth=login");
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    void verifyAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectedProcess = useMemo(
    () => state.process.find((metric) => metric.id === selectedProcessId) ?? state.process[0],
    [selectedProcessId, state.process]
  );

  const update = (updater: (draft: KataState) => KataState) => {
    setState((current) => updater(current));
    setMessage("Salvat automat în browser.");
  };

  const updateMetric = (metricId: string, field: keyof Metric, value: string) => {
    update((current) => {
      if (metricId === "output") return { ...current, output: { ...current.output, [field]: value } };
      return {
        ...current,
        process: current.process.map((metric) => (metric.id === metricId ? { ...metric, [field]: value } : metric)),
      };
    });
  };

  const evaluatePdca = async (row: PdcaRow) => {
    if (!currentUser) {
      setMessage("Autentifică-te pentru a trimite rândul PDCA la AI.");
      router.replace("/?auth=login");
      return;
    }

    if (!rowHasContent(row)) {
      setMessage("Completează rândul PDCA înainte de evaluare.");
      return;
    }

    setEvaluatingRow(row.id);
    setMessage("");
    try {
      const result = await apiJson<Omit<PdcaFeedback, "rowId">>("/scenarios/evaluate-pdca", {
        method: "POST",
        body: JSON.stringify({
          projectName: state.projectName,
          currentState: state.currentState,
          futureState: state.futureState,
          outputMetric: state.output,
          processMetrics: state.process.filter(metricHasContent),
          obstacles: state.obstacles.map((item) => item.text).filter(Boolean),
          row,
        }),
      });
      setFeedback((current) => ({ ...current, [row.id]: { ...result, rowId: row.id } }));
      setMessage("Evaluarea AI a fost generată. Poți modifica rândul și rula din nou.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Evaluarea AI nu a reușit.";
      setMessage(errorMessage === "Missing token" || errorMessage === "Invalid token" ? "Sesiunea a expirat. Autentifică-te din nou pentru evaluarea AI." : errorMessage);
    } finally {
      setEvaluatingRow(null);
    }
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.projectName || "practica-deliberata"}-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProject = async (file: File | null) => {
    if (!file) return;
    const loaded = safeState(JSON.parse(await file.text()));
    setState(loaded);
    setSelectedProcessId(loaded.process[0]?.id ?? "");
    setFeedback({});
    setMessage("Proiect deschis cu succes.");
  };

  const resetProject = () => {
    if (confirm("Sigur dorești să resetezi proiectul curent? Datele nesalvate într-un fișier JSON se vor pierde.")) {
      const fresh = initialState();
      setState(fresh);
      setSelectedProcessId(fresh.process[0]?.id ?? "");
      setFeedback({});
      setMessage("Proiect resetat.");
    }
  };

  if (!authChecked) {
    return (
      <section className="kata-container">
        <div className="kata-loading-card">
          <div className="kata-spinner" />
          <h2>Se verifică accesul...</h2>
          <p>Încărcăm atelierul de practică deliberată pentru contul tău.</p>
        </div>
        <style>{kataStyles}</style>
      </section>
    );
  }

  const activeProcessCount = state.process.filter(metricHasContent).length;
  const activeObstacleCount = state.obstacles.filter((item) => item.text.trim()).length;
  const activePdcaCount = state.pdca.filter(rowHasContent).length;

  return (
    <section className="kata-container">
      {/* Top Hero Banner */}
      <header className="kata-hero-card">
        <div className="kata-hero-left">
          <div className="kata-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>Toyota Kata · Practică Deliberată</span>
          </div>

          <h1 className="kata-title">
            Practică <span className="highlight-text">Deliberată</span>
          </h1>

          <p className="kata-subtitle">
            Cadru structurat pentru îmbunătățire continuă. Definește starea actuală și țintă, monitorizează indicatorii de performanță, gestionează obstacolele și derulează experimente PDCA asistate de AI.
          </p>

          <div className="kata-stats-pills">
            <div className="stat-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              <strong>{activeProcessCount}</strong> indicatori
            </div>
            <div className="stat-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>{activeObstacleCount}</strong> obstacole
            </div>
            <div className="stat-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              <strong>{activePdcaCount}</strong> cicluri PDCA
            </div>
          </div>
        </div>

        <div className="kata-hero-right">
          <div className="kata-action-group">
            <button type="button" className="btn-secondary" onClick={exportProject} title="Exportă starea proiectului ca JSON">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportă JSON
            </button>
            <label className="btn-secondary file-upload-label" title="Încarcă un proiect salvat din fișier JSON">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Încarcă JSON
              <input type="file" accept="application/json,.json" hidden onChange={(e) => importProject(e.target.files?.[0] ?? null)} />
            </label>
            <button type="button" className="btn-secondary" onClick={() => window.print()} title="Versiune imprimabilă">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Tipărește
            </button>
            <button type="button" className="btn-ghost-danger" onClick={resetProject} title="Resetează formularul la starea inițială">
              Resetare
            </button>
          </div>
        </div>
      </header>

      {/* Project Name Bar & Auto-save Status */}
      <div className="kata-project-card">
        <div className="project-input-wrapper">
          <span className="project-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </span>
          <label htmlFor="projectNameInput" className="project-label">Nume Proiect:</label>
          <input
            id="projectNameInput"
            type="text"
            className="project-input"
            value={state.projectName}
            onChange={(e) => update((current) => ({ ...current, projectName: e.target.value }))}
            placeholder="Ex: Optimizare proces Onboarding Clienți Q3"
          />
        </div>
        {message ? (
          <div className="save-status-badge">
            <span className="status-dot" />
            {message}
          </div>
        ) : null}
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="kata-tab-bar" aria-label="Meniu Navigare Practică">
        {[
          { id: "tablou", label: "Tablou General", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
          { id: "actuala", label: "Stare Actuală", icon: "M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" },
          { id: "viitoare", label: "Stare Viitoare", icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14" },
          { id: "indicatori", label: "Indicatori", icon: "M18 20V10M12 20V4M6 20v-6", count: activeProcessCount },
          { id: "pdca", label: "PDCA & AI", icon: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10", count: activePdcaCount },
          { id: "obstacole", label: "Obstacole", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", count: activeObstacleCount },
          { id: "grafice", label: "Grafice", icon: "M3 3v18h18" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${activeView === tab.id ? "active" : ""}`}
            onClick={() => setActiveView(tab.id)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={tab.icon} />
            </svg>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 ? <span className="tab-count-badge">{tab.count}</span> : null}
          </button>
        ))}
      </nav>

      {/* Main Content Views */}

      {/* VIEW: Tablou General (Dashboard) */}
      {activeView === "tablou" ? (
        <div className="kata-board-view">
          <div className="board-intro-banner">
            <h3>Modelul Toyota Kata în 5 Pași</h3>
            <p>Apasă pe oricare dintre cele 5 secțiuni pentru a vizualiza și edita datele procesului tău.</p>
          </div>

          <div className="kata-cards-grid">
            {/* Step 1 Card: Stare Actuala */}
            <button type="button" className="kata-step-card" onClick={() => setActiveView("actuala")}>
              <div className="card-top">
                <span className="step-num">PASUL 01</span>
                <span className="card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/></svg>
                </span>
              </div>
              <strong className="card-title">Stare Actuală</strong>
              <p className="card-snippet">
                {state.currentState ? state.currentState.slice(0, 110) + (state.currentState.length > 110 ? "..." : "") : "Nicio descriere adăugată. Apasă pentru a documenta starea actuală a procesului."}
              </p>
              <div className="card-footer">
                <span className="meta-text">Obs. din: {state.currentDate}</span>
                <span className="action-arrow">Deschide →</span>
              </div>
            </button>

            {/* Step 2 Card: Stare Viitoare */}
            <button type="button" className="kata-step-card" onClick={() => setActiveView("viitoare")}>
              <div className="card-top">
                <span className="step-num">PASUL 02</span>
                <span className="card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/></svg>
                </span>
              </div>
              <strong className="card-title">Stare Viitoare</strong>
              <p className="card-snippet">
                {state.futureState ? state.futureState.slice(0, 110) + (state.futureState.length > 110 ? "..." : "") : "Nicio stare viitoare setată. Apasă pentru a stabili condiția țintă."}
              </p>
              <div className="card-footer">
                <span className="meta-text">Țintă până la: {state.futureDate}</span>
                <span className="action-arrow">Deschide →</span>
              </div>
            </button>

            {/* Step 3 Card: Indicatori */}
            <button type="button" className="kata-step-card" onClick={() => setActiveView("indicatori")}>
              <div className="card-top">
                <span className="step-num">PASUL 03</span>
                <span className="card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </span>
              </div>
              <strong className="card-title">Indicatori & KPIs</strong>
              <p className="card-snippet">
                {state.output.name ? `Output: ${state.output.name}` : `${activeProcessCount} indicatori de proces configurați.`}
              </p>
              <div className="card-footer">
                <span className="meta-text">{activeProcessCount} indicatori proces</span>
                <span className="action-arrow">Deschide →</span>
              </div>
            </button>

            {/* Step 4 Card: PDCA */}
            <button type="button" className="kata-step-card" onClick={() => setActiveView("pdca")}>
              <div className="card-top">
                <span className="step-num">PASUL 04</span>
                <span className="card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </span>
              </div>
              <strong className="card-title">Experimente PDCA & AI</strong>
              <p className="card-snippet">
                {activePdcaCount > 0 ? `${activePdcaCount} experimente documentate. Evaluare AI disponibilă.` : "Plan-Do-Check-Act. Rulează experimente scurte de învățare."}
              </p>
              <div className="card-footer">
                <span className="meta-text">Data practicii: {state.pdcaDate}</span>
                <span className="action-arrow">Deschide →</span>
              </div>
            </button>

            {/* Step 5 Card: Obstacole */}
            <button type="button" className="kata-step-card" onClick={() => setActiveView("obstacole")}>
              <div className="card-top">
                <span className="step-num">BANC DE OBSTACOLE</span>
                <span className="card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                </span>
              </div>
              <strong className="card-title">Listă Obstacole</strong>
              <p className="card-snippet">
                {activeObstacleCount > 0 ? `${activeObstacleCount} obstacole identificate în calea stării viitoare.` : "Înregistrează obstacolele ce te împiedică să atingi starea viitoare."}
              </p>
              <div className="card-footer">
                <span className="meta-text">{activeObstacleCount} obstacole</span>
                <span className="action-arrow">Deschide →</span>
              </div>
            </button>

            {/* Step 6 Card: Grafice */}
            <button type="button" className="kata-step-card" onClick={() => setActiveView("grafice")}>
              <div className="card-top">
                <span className="step-num">EVOLUȚIE & TREND</span>
                <span className="card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/></svg>
                </span>
              </div>
              <strong className="card-title">Grafice & Măsurători</strong>
              <p className="card-snippet">
                Urmărește grafic evoluția zilnică a indicatorilor tăi pe luna {activeMonth}.
              </p>
              <div className="card-footer">
                <span className="meta-text">Luna: {activeMonth}</span>
                <span className="action-arrow">Vezi grafic →</span>
              </div>
            </button>
          </div>
        </div>
      ) : null}

      {/* VIEW: Stare Actuală */}
      {activeView === "actuala" ? (
        <StatePanel
          title="Stare Actuală"
          subtitle="Descrie modul în care funcționează procesul în prezent, bazat pe observații directe la fața locului (Gemba)."
          dateLabel="Data Observației"
          date={state.currentDate}
          value={state.currentState}
          placeholder="Exemplu: Timpul mediu de procesare a unei cereri este de 45 minute. Apare o variabilitate mare între orele 12:00-14:00. Rata de erori la introducerea datelor este 8%..."
          tipTitle="💡 Ghid pentru descrierea Stării Actualе"
          tipText="Fii specific și obiectiv. Documentează fapte reale, timpi de ciclu măsurați direct și numărul de piese/solicitări în așteptare. Evită presupunerile și nu propune soluții de pe acum."
          onDate={(val) => update((curr) => ({ ...curr, currentDate: val }))}
          onValue={(val) => update((curr) => ({ ...curr, currentState: val }))}
        />
      ) : null}

      {/* VIEW: Stare Viitoare */}
      {activeView === "viitoare" ? (
        <StatePanel
          title="Stare Viitoare (Condiția Țintă)"
          subtitle="Stabilește cum trebuie să funcționeze procesul la o dată țintă specifică (de obicei peste 2 - 4 săptămâni)."
          dateLabel="Data Țintă"
          date={state.futureDate}
          value={state.futureState}
          placeholder="Exemplu: La data țintă, timpul de procesare a unei cereri va fi de maxim 20 minute. Rata de erori scade sub 1.5%. Fluxul funcționează continuu fără stocuri intermediare..."
          tipTitle="💡 Ghid pentru descrierea Stării Viitoare"
          tipText="Descrie scenariul operațional dorit, nu o listă de sarcini. Răspunde la întrebarea: 'Cum va funcționa procesul pas cu pas la data țintă?' Stabilește un termen clar și realizabil."
          onDate={(val) => update((curr) => ({ ...curr, futureDate: val }))}
          onValue={(val) => update((curr) => ({ ...curr, futureState: val }))}
        />
      ) : null}

      {/* VIEW: Indicatori */}
      {activeView === "indicatori" ? (
        <section className="kata-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{state.projectName || "Proiect fără nume"}</span>
              <h2 className="panel-title">Indicatori de Performanță (KPIs)</h2>
            </div>
            <div className="date-input-group">
              <label htmlFor="indicatorDate">Data Înregistrării</label>
              <input
                id="indicatorDate"
                type="date"
                value={state.indicatorDate}
                onChange={(e) => update((curr) => ({ ...curr, indicatorDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Featured Output Indicator Card */}
          <div className="output-kpi-card">
            <div className="output-card-header">
              <span className="badge-output">INDICATOR DE OUTPUT / REZULTAT</span>
              <span className="output-hint">Performanța finală a procesului (ex: Lead Time, Cost, Satisfacție client)</span>
            </div>
            <div className="output-form-grid">
              <div className="form-field wide-field">
                <label>Denumire Indicator Output</label>
                <input
                  type="text"
                  placeholder="ex: Timp total de livrare (Lead Time)"
                  value={state.output.name}
                  onChange={(e) => updateMetric("output", "name", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Valoare Actuală</label>
                <input
                  type="text"
                  placeholder="ex: 48"
                  value={state.output.actual}
                  onChange={(e) => updateMetric("output", "actual", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Valoare Viitoare (Țintă)</label>
                <input
                  type="text"
                  placeholder="ex: 24"
                  value={state.output.target}
                  onChange={(e) => updateMetric("output", "target", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Unitate Măsură</label>
                <input
                  type="text"
                  placeholder="ex: ore / % / buc"
                  value={state.output.unit}
                  onChange={(e) => updateMetric("output", "unit", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Process Metrics Table */}
          <div className="process-metrics-section">
            <div className="section-sub-header">
              <h3>Indicatori de Proces (Predictivi)</h3>
              <p>Măsoară modul în care funcționează pașii interni ai procesului.</p>
            </div>

            <div className="table-responsive">
              <table className="kata-modern-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Denumire Indicator de Proces</th>
                    <th style={{ width: "160px" }}>Valoare Actuală</th>
                    <th style={{ width: "160px" }}>Valoare Viitoare</th>
                    <th style={{ width: "140px" }}>Unitate</th>
                    <th style={{ width: "70px" }}>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {state.process.map((metric, index) => (
                    <tr key={metric.id}>
                      <td className="cell-num">{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          placeholder="Denumire parametru proces..."
                          value={metric.name}
                          onChange={(e) => updateMetric(metric.id, "name", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          placeholder="Actual"
                          value={metric.actual}
                          onChange={(e) => updateMetric(metric.id, "actual", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          placeholder="Țintă"
                          value={metric.target}
                          onChange={(e) => updateMetric(metric.id, "target", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          placeholder="ex. min"
                          value={metric.unit}
                          onChange={(e) => updateMetric(metric.id, "unit", e.target.value)}
                        />
                      </td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="icon-delete-btn"
                          title="Șterge acest indicator"
                          onClick={() =>
                            update((curr) => ({
                              ...curr,
                              process: curr.process.filter((item) => item.id !== metric.id),
                              measurements: Object.fromEntries(
                                Object.entries(curr.measurements).filter(([id]) => id !== metric.id)
                              ),
                            }))
                          }
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => update((curr) => ({ ...curr, process: [...curr.process, blankMetric()] }))}
              >
                + Adaugă indicator de proces
              </button>
              <button type="button" className="btn-link" onClick={() => setActiveView("grafice")}>
                Deschide graficele de măsurare zilnică →
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* VIEW: Obstacole */}
      {activeView === "obstacole" ? (
        <section className="kata-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{state.projectName || "Proiect fără nume"}</span>
              <h2 className="panel-title">Bancul de Obstacole</h2>
            </div>
          </div>

          <p className="section-description">
            Notează toate obstacolele identificate care împiedică procesul să ajungă la starea viitoare. Nu trebuie rezolvate toate deodată; alege unul singur pentru următorul ciclu PDCA.
          </p>

          <div className="table-responsive">
            <table className="kata-modern-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>Nr.</th>
                  <th>Descriere Obstacol</th>
                  <th style={{ width: "90px" }}>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {state.obstacles.map((item, index) => (
                  <tr key={item.id}>
                    <td className="cell-num">{index + 1}</td>
                    <td>
                      <textarea
                        className="table-textarea min-h-small"
                        placeholder="Descrie obstacolul întâmpinat în proces..."
                        value={item.text}
                        onChange={(e) =>
                          update((curr) => ({
                            ...curr,
                            obstacles: curr.obstacles.map((row) => (row.id === item.id ? { ...row, text: e.target.value } : row)),
                          }))
                        }
                      />
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="icon-delete-btn"
                        title="Șterge obstacolul"
                        onClick={() =>
                          update((curr) => ({
                            ...curr,
                            obstacles: curr.obstacles.filter((row) => row.id !== item.id),
                          }))
                        }
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => update((curr) => ({ ...curr, obstacles: [...curr.obstacles, blankObstacle()] }))}
            >
              + Adaugă obstacol nou
            </button>
          </div>
        </section>
      ) : null}

      {/* VIEW: PDCA */}
      {activeView === "pdca" ? (
        <section className="kata-panel pdca-panel-wrap">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{state.projectName || "Proiect fără nume"}</span>
              <h2 className="panel-title">Cicluri PDCA (Plan - Do - Check - Act)</h2>
            </div>
            <div className="pdca-date-toolbar">
              <label htmlFor="pdcaDateInput">Data Practicii:</label>
              <input
                id="pdcaDateInput"
                type="date"
                className="date-input"
                value={state.pdcaDate}
                onChange={(e) => update((curr) => ({ ...curr, pdcaDate: e.target.value }))}
              />
              <button
                type="button"
                className="btn-secondary btn-icon"
                title="Ziua anterioară"
                onClick={() => update((curr) => ({ ...curr, pdcaDate: shiftDate(curr.pdcaDate, -1) }))}
              >
                ←
              </button>
              <button
                type="button"
                className="btn-secondary btn-icon"
                title="Ziua următoare"
                onClick={() => update((curr) => ({ ...curr, pdcaDate: shiftDate(curr.pdcaDate, 1) }))}
              >
                →
              </button>
            </div>
          </div>

          <div className="table-responsive pdca-scroll-table">
            <table className="kata-pdca-table">
              <thead>
                <tr className="pdca-group-header">
                  <th colSpan={4} className="group-p">P — PLANIFICĂ (PLAN)</th>
                  <th className="group-d">D — EXECUTĂ (DO)</th>
                  <th className="group-c">C — VERIFICĂ (CHECK)</th>
                  <th className="group-a">A — ACȚIONEAZĂ (ACT)</th>
                  <th className="group-ai">EVALUARE AI</th>
                </tr>
                <tr className="pdca-sub-header">
                  <th>Obstacol <small>Ce abordăm?</small></th>
                  <th>Cauză <small>Care este cauza?</small></th>
                  <th>Pasul următor <small>Ce facem?</small></th>
                  <th>Așteptări <small>Ce anticipăm?</small></th>
                  <th>Termen <small>Până când?</small></th>
                  <th>Rezultat <small>Ce s-a întâmplat?</small></th>
                  <th>Ce am învățat? <small>Concluzie</small></th>
                  <th>Analiză Coach AI</th>
                </tr>
              </thead>
              <tbody>
                {state.pdca.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <textarea
                        className="pdca-textarea"
                        placeholder="Obstacol extras..."
                        value={row.obstacle}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, obstacle: e.target.value } : item)) }))}
                      />
                    </td>
                    <td>
                      <textarea
                        className="pdca-textarea"
                        placeholder="Cauză directă..."
                        value={row.cause}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, cause: e.target.value } : item)) }))}
                      />
                    </td>
                    <td>
                      <textarea
                        className="pdca-textarea"
                        placeholder="Următorul pas..."
                        value={row.nextStep}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, nextStep: e.target.value } : item)) }))}
                      />
                    </td>
                    <td>
                      <textarea
                        className="pdca-textarea"
                        placeholder="Rezultat așteptat..."
                        value={row.expected}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, expected: e.target.value } : item)) }))}
                      />
                    </td>
                    <td className="cell-date">
                      <input
                        type="date"
                        className="pdca-date-cell"
                        value={row.due}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, due: e.target.value } : item)) }))}
                      />
                    </td>
                    <td>
                      <textarea
                        className="pdca-textarea"
                        placeholder="Rezultat măsurat..."
                        value={row.result}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, result: e.target.value } : item)) }))}
                      />
                    </td>
                    <td>
                      <textarea
                        className="pdca-textarea"
                        placeholder="Lecție învățată..."
                        value={row.learned}
                        onChange={(e) => update((curr) => ({ ...curr, pdca: curr.pdca.map((item) => (item.id === row.id ? { ...item, learned: e.target.value } : item)) }))}
                      />
                    </td>
                    <td className="cell-ai-action">
                      <div className="pdca-row-controls">
                        <span className="row-num-badge">#{index + 1}</span>
                        <button
                          type="button"
                          className="btn-ai-eval"
                          disabled={evaluatingRow === row.id}
                          onClick={() => evaluatePdca(row)}
                        >
                          {evaluatingRow === row.id ? (
                            <>
                              <span className="btn-spinner" /> Evaluare...
                            </>
                          ) : (
                            <>✨ Trimite la AI</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-delete-btn"
                          title="Șterge rândul PDCA"
                          onClick={() => update((curr) => ({ ...curr, pdca: curr.pdca.filter((item) => item.id !== row.id) }))}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => update((curr) => ({ ...curr, pdca: [...curr.pdca, blankPdca()] }))}
            >
              + Adaugă experiment PDCA
            </button>
            <button
              type="button"
              className="btn-ghost-danger"
              onClick={() => update((curr) => ({ ...curr, pdca: Array.from({ length: 5 }, blankPdca) }))}
            >
              Resetează tabelul PDCA
            </button>
          </div>

          {/* AI Feedback Display Cards */}
          {Object.keys(feedback).length > 0 ? (
            <div className="ai-feedback-container">
              <h3 className="feedback-section-title">✨ Feedback Evaluare AI</h3>
              <div className="feedback-stack">
                {Object.values(feedback).map((item) => (
                  <article key={item.rowId} className="ai-feedback-card">
                    <div className="feedback-header">
                      <div className="score-badge">
                        <span>Scor Evaluare AI</span>
                        <strong>{item.overallScore} / 100</strong>
                      </div>
                      <span className="feedback-tag">Generat recent</span>
                    </div>

                    <div className="feedback-columns-grid">
                      {item.columnFeedback.map((column) => (
                        <div key={column.column} className="feedback-item-box">
                          <div className="column-title-row">
                            <strong>{column.column}</strong>
                            <span className="mini-score">{column.score}/100</span>
                          </div>
                          <p>{column.feedback}</p>
                        </div>
                      ))}
                    </div>

                    {item.generalFeedback ? (
                      <div className="feedback-general-box">
                        <strong> Recomandări Coach Toyota Kata:</strong>
                        <p>{item.generalFeedback}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* VIEW: Grafice */}
      {activeView === "grafice" ? (
        <section className="kata-panel graph-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{state.projectName || "Proiect fără nume"}</span>
              <h2 className="panel-title">Grafice & Măsurători Zilnice</h2>
            </div>
            <div className="date-input-group">
              <label htmlFor="monthSelect">Luna Afișată</label>
              <input
                id="monthSelect"
                type="month"
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
              />
            </div>
          </div>

          <ChartSection
            kind="output"
            metric={state.output}
            activeMonth={activeMonth}
            state={state}
            update={update}
            updateMetric={updateMetric}
          />

          {selectedProcess ? (
            <ChartSection
              kind="process"
              metric={selectedProcess}
              activeMonth={activeMonth}
              state={state}
              update={update}
              updateMetric={updateMetric}
              processMetrics={state.process}
              selectedProcessId={selectedProcess.id}
              onSelectProcess={setSelectedProcessId}
            />
          ) : null}
        </section>
      ) : null}

      <style>{kataStyles}</style>
    </section>
  );
}

function StatePanel(props: {
  title: string;
  subtitle: string;
  dateLabel: string;
  date: string;
  value: string;
  placeholder: string;
  tipTitle: string;
  tipText: string;
  onDate: (value: string) => void;
  onValue: (value: string) => void;
}) {
  return (
    <section className="kata-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{props.title}</h2>
          <p className="panel-subtitle">{props.subtitle}</p>
        </div>
        <div className="date-input-group">
          <label htmlFor="stateDateInput">{props.dateLabel}</label>
          <input
            id="stateDateInput"
            type="date"
            value={props.date}
            onChange={(e) => props.onDate(e.target.value)}
          />
        </div>
      </div>

      <div className="kata-tip-box">
        <strong>{props.tipTitle}</strong>
        <p>{props.tipText}</p>
      </div>

      <div className="textarea-wrapper">
        <textarea
          className="state-textarea"
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onValue(e.target.value)}
        />
        <div className="textarea-footer">
          <span>{props.value.length} caractere</span>
        </div>
      </div>
    </section>
  );
}

function ChartSection(props: {
  kind: "output" | "process";
  metric: Metric;
  activeMonth: string;
  state: KataState;
  update: (updater: (draft: KataState) => KataState) => void;
  updateMetric: (metricId: string, field: keyof Metric, value: string) => void;
  processMetrics?: Metric[];
  selectedProcessId?: string;
  onSelectProcess?: (value: string) => void;
}) {
  const dayCount = daysInMonth(props.activeMonth);
  const values = props.state.measurements[props.metric.id] ?? {};
  const points = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const date = `${props.activeMonth}-${String(day).padStart(2, "0")}`;
    return { day, value: parseNumber(values[date] ?? "") };
  });
  const numeric = points.filter((point) => point.value !== null) as Array<{ day: number; value: number }>;
  const target = parseNumber(props.metric.target);
  const allNumbers = [...numeric.map((point) => point.value), ...(target === null ? [] : [target])];
  const min = allNumbers.length ? Math.min(0, ...allNumbers) : 0;
  const max = allNumbers.length ? Math.max(10, ...allNumbers) : 10;
  const width = 1120;
  const height = 320;
  const left = 62;
  const right = 22;
  const top = 28;
  const bottom = 48;
  const x = (day: number) => left + ((day - 1) * (width - left - right)) / Math.max(1, dayCount - 1);
  const y = (val: number) => top + ((max - val) * (height - top - bottom)) / Math.max(1, max - min);
  const path = numeric.map((point, index) => `${index ? "L" : "M"} ${x(point.day).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");

  const updateMeasurement = (date: string, value: string) => {
    props.update((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [props.metric.id]: { ...(current.measurements[props.metric.id] ?? {}), [date]: value },
      },
    }));
  };

  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="chart-card-box">
      <div className="chart-controls-grid">
        {props.kind === "process" ? (
          <div className="form-field">
            <label>Alege Indicatorul de Proces</label>
            <select
              value={props.selectedProcessId}
              onChange={(e) => props.onSelectProcess?.(e.target.value)}
              className="chart-select"
            >
              {(props.processMetrics ?? []).map((metric, index) => (
                <option key={metric.id} value={metric.id}>
                  {index + 1}. {metric.name || "Indicator de proces fără nume"}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={`form-field ${props.kind === "output" ? "wide-field" : ""}`}>
          <label>Denumire KPI ({props.kind === "output" ? "Output" : "Proces"})</label>
          <input
            type="text"
            value={props.metric.name}
            placeholder="Denumire indicator"
            onChange={(e) => props.updateMetric(props.metric.id, "name", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Valoare Viitoare (Țintă)</label>
          <input
            type="text"
            value={props.metric.target}
            onChange={(e) => props.updateMetric(props.metric.id, "target", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Unitate Măsură</label>
          <input
            type="text"
            value={props.metric.unit}
            placeholder="ex. min"
            onChange={(e) => props.updateMetric(props.metric.id, "unit", e.target.value)}
          />
        </div>
      </div>

      <div className="chart-visual-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" className="chart-svg">
          <defs>
            <linearGradient id={`grad-${props.metric.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c92332" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#c92332" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Y Ticks */}
          {yTicks.map((tick) => {
            const lineY = y(tick);
            return (
              <g key={tick}>
                <text x={left - 16} y={lineY + 4} textAnchor="end" fill="#64748b" fontSize="13" fontWeight="600">
                  {tick}
                </text>
                <line x1={left} x2={width - right} y1={lineY} y2={lineY} stroke="#f1f5f9" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Day X Columns */}
          {Array.from({ length: dayCount }, (_, index) => {
            const day = index + 1;
            const lineX = x(day);
            return (
              <g key={day}>
                <line x1={lineX} x2={lineX} y1={top} y2={height - bottom} stroke="#f8fafc" />
                <text x={lineX} y={height - 16} textAnchor="middle" fill="#64748b" fontSize="13" fontWeight="600">
                  {day}
                </text>
              </g>
            );
          })}

          <text x={left - 16} y={height - 16} textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="700">
            ZIUA
          </text>

          {/* Target Line */}
          {target !== null ? (
            <g>
              <line
                x1={left}
                x2={width - right}
                y1={y(target)}
                y2={y(target)}
                stroke="#c92332"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
              <text x={width - right} y={y(target) - 8} textAnchor="end" fill="#c92332" fontSize="12" fontWeight="700">
                Țintă: {target}
              </text>
            </g>
          ) : null}

          {/* Measured Line & Area */}
          {path ? (
            <path
              d={path}
              fill="none"
              stroke="#1e293b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {numeric.map((point) => (
            <circle
              key={point.day}
              cx={x(point.day)}
              cy={y(point.value)}
              r="5"
              fill="#c92332"
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </svg>
        {!numeric.length ? <p className="chart-empty-msg">Introduceți valorile zilnice mai jos pentru a genera graficul.</p> : null}
      </div>

      <div className="chart-legend-bar">
        <span className="legend-item"><i className="legend-dot dot-black" /> Valoare Măsurată</span>
        <span className="legend-item"><i className="legend-dash dash-red" /> Valoare Viitoare (Țintă)</span>
      </div>

      <div className="days-table-container">
        <table className="days-input-table">
          <tbody>
            <tr>
              <th className="sticky-cell">ZIUA</th>
              {Array.from({ length: dayCount }, (_, index) => (
                <td key={index + 1} className="day-header-cell">{index + 1}</td>
              ))}
            </tr>
            <tr>
              <th className="sticky-cell">Valoare</th>
              {Array.from({ length: dayCount }, (_, index) => {
                const day = index + 1;
                const date = `${props.activeMonth}-${String(day).padStart(2, "0")}`;
                return (
                  <td key={date}>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="day-input"
                      value={values[date] ?? ""}
                      onChange={(e) => updateMeasurement(date, e.target.value)}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const kataStyles = `
/* -------------------------------------------------------------
   TOYOTA KATA - PRACTICĂ DELIBERATĂ DESIGN SYSTEM 2026
------------------------------------------------------------- */

.kata-container {
  max-width: 1360px;
  margin: 0 auto;
  padding: 24px 16px 60px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Loading state */
.kata-loading-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-plain, #e5e7eb);
  border-radius: 18px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.04);
}
.kata-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(201,35,50,0.15);
  border-top-color: #c92332;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: kataSpin 0.8s linear infinite;
}
@keyframes kataSpin { to { transform: rotate(360deg); } }

/* Hero Card */
.kata-hero-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,240,242,0.85) 100%);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(201, 35, 50, 0.15);
  border-radius: 20px;
  padding: 32px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  box-shadow: 0 12px 36px rgba(31,41,51,0.06);
}

.kata-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(201, 35, 50, 0.08);
  border: 1px solid rgba(201, 35, 50, 0.2);
  color: #c92332;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.kata-title {
  font-size: clamp(28px, 3.5vw, 42px);
  font-weight: 800;
  color: #1f2933;
  margin: 0 0 10px;
  line-height: 1.15;
}

.highlight-text {
  color: #c92332;
  background: linear-gradient(135deg, #c92332 0%, #9f1d28 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.kata-subtitle {
  color: #5f6b7a;
  font-size: 15px;
  line-height: 1.6;
  max-width: 720px;
  margin: 0 0 20px;
}

.kata-stats-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(201, 35, 50, 0.14);
  color: #4b5563;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
.stat-pill strong {
  color: #c92332;
  font-weight: 800;
}

.kata-hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.kata-action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-weight: 600;
  font-size: 14px;
  padding: 9px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
}
.btn-secondary:hover {
  background: #fff0f2;
  border-color: #c92332;
  color: #c92332;
  transform: translateY(-1px);
}

.file-upload-label {
  cursor: pointer;
}

.btn-ghost-danger {
  background: transparent;
  border: 1px solid transparent;
  color: #dc2626;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 14px;
  border-radius: 10px;
  cursor: pointer;
}
.btn-ghost-danger:hover {
  background: #fee2e2;
}

/* Project Card */
.kata-project-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
}

.project-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.project-icon {
  color: #c92332;
  display: flex;
  align-items: center;
}

.project-label {
  font-weight: 700;
  font-size: 14px;
  color: #1e293b;
  white-space: nowrap;
}

.project-input {
  border: none;
  border-bottom: 2px solid #e2e8f0;
  border-radius: 0;
  background: transparent;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  padding: 6px 4px;
  flex: 1;
  outline: none;
  transition: border-color 0.2s;
  min-height: 40px;
}
.project-input:focus {
  border-bottom-color: #c92332;
  box-shadow: none;
}

.save-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulseDot 2s infinite;
}
@keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Tab Bar */
.kata-tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 6px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.03);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.tab-btn:hover {
  background: #fff0f2;
  color: #c92332;
}
.tab-btn.active {
  background: linear-gradient(135deg, #c92332 0%, #9f1d28 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(201,35,50,0.25);
}

.tab-count-badge {
  background: rgba(0,0,0,0.08);
  color: inherit;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
}
.tab-btn.active .tab-count-badge {
  background: rgba(255,255,255,0.25);
  color: #ffffff;
}

/* Kata Board View */
.kata-board-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.board-intro-banner {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #c92332;
  border-radius: 12px;
  padding: 16px 20px;
}
.board-intro-banner h3 {
  font-size: 17px;
  margin: 0 0 4px;
  color: #0f172a;
}
.board-intro-banner p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.kata-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
}

.kata-step-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px 24px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  white-space: normal !important;
  word-break: break-word;
  overflow-wrap: anywhere;
  width: 100%;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
}
.kata-step-card * {
  white-space: normal !important;
}

/* Red Animated Top Bar on Hover */
.kata-step-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #c92332 0%, #9f1d28 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.kata-step-card:hover {
  border-color: rgba(201,35,50,0.3);
  box-shadow: 0 10px 28px rgba(201,35,50,0.09);
  transform: translateY(-2px);
}

.kata-step-card:hover::before {
  transform: scaleX(1);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.step-num {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #94a3b8;
  text-transform: uppercase;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  flex-shrink: 0;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 4px 0 2px;
  line-height: 1.3;
  display: block;
}

.card-snippet {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  min-height: 48px;
  margin: 0;
  white-space: normal !important;
  word-break: break-word;
  display: block;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  width: 100%;
  margin-top: auto;
}

.meta-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  white-space: nowrap !important;
}

.action-arrow {
  font-size: 13px;
  font-weight: 700;
  color: #c92332;
  white-space: nowrap !important;
}

/* Panels */
.kata-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.04);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.panel-kicker {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #c92332;
}

.panel-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin: 4px 0 0;
}

.panel-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.date-input-group label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
}
.date-input-group input {
  min-height: 42px;
  border-radius: 10px;
}

.kata-tip-box {
  background: #fff0f2;
  border: 1px solid rgba(201,35,50,0.18);
  border-radius: 12px;
  padding: 16px 20px;
}
.kata-tip-box strong {
  display: block;
  color: #9f1d28;
  font-size: 14px;
  margin-bottom: 4px;
}
.kata-tip-box p {
  margin: 0;
  font-size: 13.5px;
  color: #536171;
  line-height: 1.55;
}

.textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-textarea {
  min-height: 280px;
  padding: 16px;
  font-size: 15px;
  line-height: 1.65;
  border-radius: 12px;
  background: #fbfcfd;
}
.state-textarea:focus {
  background: #ffffff;
}

.textarea-footer {
  text-align: right;
  font-size: 12px;
  color: #94a3b8;
}

/* Output KPI Card */
.output-kpi-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 16px;
  padding: 24px 28px;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(15,23,42,0.15);
}

.output-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.badge-output {
  background: #c92332;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.output-hint {
  font-size: 13px;
  color: #94a3b8;
}

.output-form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-field label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}
.output-form-grid input {
  background: #334155;
  border-color: #475569;
  color: #ffffff;
  border-radius: 10px;
}
.output-form-grid input::placeholder {
  color: #94a3b8;
}
.output-form-grid input:focus {
  border-color: #c92332;
  box-shadow: 0 0 0 3px rgba(201,35,50,0.3);
}

/* Process Metrics & Modern Tables */
.process-metrics-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
}

.section-sub-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.section-sub-header p {
  font-size: 13.5px;
  color: #64748b;
  margin: 2px 0 0;
}

.table-responsive {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.kata-modern-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.kata-modern-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.kata-modern-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.cell-num {
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  font-size: 13px;
}

.table-input {
  border: 1px solid transparent;
  background: transparent;
  min-height: 40px;
  padding: 6px 10px;
  border-radius: 8px;
}
.table-input:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.table-input:focus {
  border-color: #c92332;
  background: #ffffff;
}

.table-textarea {
  border: 1px solid transparent;
  background: transparent;
  min-height: 46px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}
.table-textarea:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.table-textarea:focus {
  border-color: #c92332;
  background: #ffffff;
}
.min-h-small { min-height: 46px; }

.cell-actions {
  text-align: center;
}

.icon-delete-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
}
.icon-delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.table-footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.btn-primary {
  background: linear-gradient(135deg, #c92332 0%, #9f1d28 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(201,35,50,0.25);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(201,35,50,0.35);
}

.btn-link {
  background: transparent;
  border: none;
  color: #c92332;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.btn-link:hover { text-decoration: underline; }

/* PDCA Section */
.pdca-panel-wrap {
  padding: 24px;
}

.pdca-date-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pdca-date-toolbar label {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}
.pdca-date-toolbar .date-input {
  min-height: 40px;
  border-radius: 8px;
}
.btn-icon {
  width: 40px;
  min-height: 40px;
  padding: 0;
  justify-content: center;
}

.pdca-scroll-table {
  border-radius: 14px;
}

.kata-pdca-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1280px;
}

.pdca-group-header th {
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  padding: 12px 10px;
  text-align: center;
  letter-spacing: 0.05em;
}
.group-p { background: #c92332; }
.group-d { background: #475569; }
.group-c { background: #334155; }
.group-a { background: #1e293b; }
.group-ai { background: #9f1d28; }

.pdca-sub-header th {
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  min-width: 130px;
}
.pdca-sub-header small {
  display: block;
  color: #94a3b8;
  font-weight: 500;
  font-size: 11px;
  margin-top: 2px;
}

.kata-pdca-table td {
  padding: 6px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  vertical-align: top;
  background: #ffffff;
}

.pdca-textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 13.5px;
  line-height: 1.5;
  padding: 8px;
  border-radius: 8px;
}
.pdca-textarea:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.pdca-textarea:focus {
  background: #ffffff;
  border-color: #c92332;
}

.cell-date input {
  min-height: 38px;
  font-size: 12.5px;
  padding: 4px 6px;
  border-radius: 6px;
}

.cell-ai-action {
  width: 135px;
}

.pdca-row-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
}

.row-num-badge {
  font-size: 12px;
  font-weight: 800;
  color: #94a3b8;
}

.btn-ai-eval {
  background: linear-gradient(135deg, #c92332 0%, #9f1d28 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 9px 13px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(201,35,50,0.25);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-ai-eval:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(201,35,50,0.35);
}
.btn-ai-eval:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: kataSpin 0.8s linear infinite;
}

/* AI Feedback Cards */
.ai-feedback-container {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-section-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.feedback-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-feedback-card {
  background: linear-gradient(135deg, #fff0f2 0%, #ffffff 100%);
  border: 1px solid rgba(201,35,50,0.25);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(201,35,50,0.06);
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.score-badge {
  display: flex;
  align-items: center;
  gap: 12px;
}
.score-badge span {
  font-size: 13px;
  font-weight: 700;
  color: #9f1d28;
  text-transform: uppercase;
}
.score-badge strong {
  background: #c92332;
  color: #ffffff;
  font-size: 16px;
  padding: 6px 14px;
  border-radius: 999px;
}

.feedback-tag {
  font-size: 12px;
  color: #94a3b8;
}

.feedback-columns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.feedback-item-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
}

.column-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.column-title-row strong {
  font-size: 13px;
  color: #0f172a;
}
.mini-score {
  font-size: 11px;
  font-weight: 800;
  color: #c92332;
  background: #fff0f2;
  padding: 2px 6px;
  border-radius: 4px;
}

.feedback-item-box p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.feedback-general-box {
  margin-top: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #c92332;
  border-radius: 10px;
  padding: 14px 16px;
}
.feedback-general-box strong {
  display: block;
  font-size: 14px;
  color: #9f1d28;
  margin-bottom: 4px;
}
.feedback-general-box p {
  margin: 0;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.55;
}

/* Charts Page */
.graph-panel {
  gap: 28px;
}

.chart-card-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}

.chart-controls-grid {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.chart-select {
  border-radius: 10px;
  min-height: 44px;
  background: #ffffff;
}

.chart-visual-wrapper {
  position: relative;
  padding: 24px;
  overflow-x: auto;
}

.chart-svg {
  width: 100%;
  min-width: 1000px;
  height: auto;
  display: block;
}

.chart-empty-msg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.9);
  padding: 8px 20px;
  border-radius: 999px;
  font-size: 14px;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.chart-legend-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot-black { background: #c92332; }
.legend-dash {
  width: 20px;
  height: 2px;
}
.dash-red {
  border-top: 2px dashed #c92332;
}

.days-table-container {
  overflow-x: auto;
  border-top: 1px solid #e2e8f0;
}

.days-input-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.sticky-cell {
  position: sticky;
  left: 0;
  background: #f8fafc;
  z-index: 2;
  font-size: 12px;
  font-weight: 800;
  color: #475569;
  padding: 10px 16px;
  border-right: 1px solid #e2e8f0;
  text-align: left;
}

.day-header-cell {
  background: #f8fafc;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  padding: 8px;
  border-right: 1px solid #f1f5f9;
}

.days-input-table td {
  border-right: 1px solid #f1f5f9;
  padding: 0;
}

.day-input {
  border: none;
  background: transparent;
  text-align: center;
  font-size: 13px;
  padding: 8px 4px;
  min-height: 40px;
  border-radius: 0;
}
.day-input:focus {
  background: #fff0f2;
  box-shadow: inset 0 0 0 2px #c92332;
}

/* Media Queries */
@media (max-width: 868px) {
  .kata-hero-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }
  .kata-hero-right {
    align-items: flex-start;
    width: 100%;
  }
  .kata-project-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .output-form-grid {
    grid-template-columns: 1fr;
  }
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .table-footer-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
`;
