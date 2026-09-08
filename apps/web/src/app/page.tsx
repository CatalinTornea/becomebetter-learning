"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiJson } from "../lib/api";
import { AuthUser, cacheUser, notifyAuthChanged } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [currentView, setCurrentView] = useState<"login" | "register" | "recover">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusHidden, setStatusHidden] = useState(true);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // IntersectionObserver for scroll animations & URL query auth modal auto-open
  useEffect(() => {
    const items = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      items.forEach((item) => {
        item.classList.add("will-reveal");
        observer.observe(item);
      });
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get("auth");
      if (authParam === "login" || authParam === "register" || authParam === "recover") {
        openAuthDialog(authParam);
      }
    }

    const handleOpenAuth = (e: Event) => {
      const custom = e as CustomEvent<"login" | "register" | "recover">;
      if (custom.detail) {
        openAuthDialog(custom.detail);
      }
    };
    window.addEventListener("open-auth", handleOpenAuth);
    return () => window.removeEventListener("open-auth", handleOpenAuth);
  }, []);

  const openAuthDialog = (view: "login" | "register" | "recover" = "login") => {
    setCurrentView(view);
    setStatusHidden(true);
    setStatusMessage("");
    setIsError(false);
    setPassword("");
    setConfirmPassword("");
    if (dialogRef.current) {
      dialogRef.current.showModal();
      document.body.classList.add("auth-open");
    }
  };

  const closeAuthDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    document.body.classList.remove("auth-open");
  };

  const views = {
    login: { title: "Autentificare", subtitle: "Conectează-te pentru a continua.", submit: "Intră în platformă" },
    register: { title: "Creează cont", subtitle: "Începe practica în Better Through Practice.", submit: "Creează cont gratuit" },
    recover: { title: "Recuperare parolă", subtitle: "Introdu adresa de email asociată contului.", submit: "Trimite linkul de resetare" },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusHidden(true);
    setStatusMessage("");
    setIsError(false);

    try {
      if (currentView === "register") {
        if (password !== confirmPassword) {
          setIsError(true);
          setStatusMessage("Parolele nu coincid. Repetă aceeași parolă.");
          setStatusHidden(false);
          setLoading(false);
          return;
        }

        const payload = await apiJson<{ user: AuthUser }>("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ fullName, email, password })
        });

        cacheUser(payload.user);
        notifyAuthChanged();
        closeAuthDialog();
        router.push("/dashboard");
        return;
      }

      if (currentView === "login") {
        const payload = await apiJson<{ user: AuthUser }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });

        cacheUser(payload.user);
        notifyAuthChanged();
        closeAuthDialog();
        router.push("/dashboard");
        return;
      }

      if (currentView === "recover") {
        try {
          await apiJson("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email })
          });
        } catch {
          // Handled gracefully
        }
        setIsError(false);
        setStatusMessage("Dacă adresa de email există în sistem, a fost trimis un link de resetare.");
        setStatusHidden(false);
      }
    } catch (err) {
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "A apărut o eroare la autentificare.");
      setStatusHidden(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="top" style={{ width: "100%", margin: 0, padding: 0 }}>
      {/* Hero Section */}
      <section className="hero">
        <svg
          className="training-symbol"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
          <path d="M9 13a4.5 4.5 0 0 0 3-4" />
          <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
          <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
          <path d="M6 18a4 4 0 0 1-1.967-.516" />
          <path d="M12 13h4" />
          <path d="M12 18h6a2 2 0 0 1 2 2v1" />
          <path d="M12 8h8" />
          <path d="M16 8V5a2 2 0 0 1 2-2" />
          <circle cx="16" cy="13" r=".5" />
          <circle cx="18" cy="3" r=".5" />
          <circle cx="20" cy="21" r=".5" />
          <circle cx="20" cy="8" r=".5" />
        </svg>
        <div className="wrap hero-layout">
          <div className="hero-content reveal">
            <div className="eyebrow">De la cunoaștere la practică</div>
            <h1>
              Antrenează-ți abilitățile <em>LEAN</em> &amp; <em>Toyota KATA</em>.
            </h1>
            <p className="lead">
              Un spațiu de învățare în ritm propriu pentru oricine vrea să treacă de la cunoașterea conceptelor la aplicarea lor corectă în situații reale de lucru.
            </p>
            <div className="hero-actions">
              <a className="btn" href="#provocare">
                Descoperă abordarea <span className="arrow">→</span>
              </a>
              <span className="micro">Practică. Reflectează. Repetă.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="intro">
        <div className="wrap intro-grid reveal">
          <h2 className="intro-title">DE CE EXISTĂ ACEST SPAȚIU DE PRACTICĂ?</h2>
          <p className="intro-copy">
            Majoritatea cursurilor Lean se opresc la explicarea conceptelor. Acest spațiu este construit pentru partea mai dificilă: să exersezi gândirea corectă, în condiții reale, din nou și din nou, până când devine obișnuință.
          </p>
        </div>
      </section>

      {/* Problems Section */}
      <section className="problems" id="provocare">
        <div className="wrap">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">Tipare care încetinesc progresul</div>
              <h2 className="section-title">
                Unde se blochează<br />majoritatea echipelor?
              </h2>
            </div>
            <p>Nu lipsa instrumentelor este problema, ci felul în care reacționăm când realitatea nu se potrivește cu planul.</p>
          </div>
          <div className="cards">
            <article className="card reveal">
              <span className="num">01 — TEORIE</span>
              <h3>Cunosc teoria Lean, dar improvizează când apare o problemă reală.</h3>
              <p>Sub presiune, vechile reflexe preiau din nou controlul.</p>
            </article>
            <article className="card reveal">
              <span className="num">02 — SIMPTOME</span>
              <h3>Reacționează la simptome în loc să testeze o ipoteză.</h3>
              <p>Soluțiile rapide înlocuiesc înțelegerea cauzei.</p>
            </article>
            <article className="card reveal">
              <span className="num">03 — FRAGMENTARE</span>
              <h3>Aplică instrumente izolate — un eveniment 5S aici, un A3 acolo.</h3>
              <p>Instrumentele nu sunt conectate într-un sistem de învățare.</p>
            </article>
            <article className="card reveal">
              <span className="num">04 — LEADERSHIP</span>
              <h3>Managerii oferă direct soluția pentru ca lucrurile să continue să se miște.</h3>
              <p>Echipa execută, dar nu își dezvoltă modul de gândire.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Practice Section */}
      <section className="practice" id="practica">
        <div className="wrap">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">Reflexe noi, construite intenționat</div>
              <h2 className="section-title">
                Ce construiește<br />practica deliberată?
              </h2>
            </div>
            <p>O rutină scurtă, repetată consecvent, transformă conceptele în comportamente observabile.</p>
          </div>
          <div className="outcomes">
            <article className="outcome reveal">
              <div className="icon">↗</div>
              <h3>Aplicare corectă sub presiune</h3>
              <p>Lean și Toyota KATA devin un mod de lucru, nu doar teorie cunoscută.</p>
            </article>
            <article className="outcome reveal">
              <div className="icon">◎</div>
              <h3>Gândire științifică</h3>
              <p>O stare țintă clară, un experiment mic și o verificare reală.</p>
            </article>
            <article className="outcome reveal">
              <div className="icon">⟳</div>
              <h3>Rutine zilnice conectate</h3>
              <p>Kata, PDCA și managementul vizual lucrează împreună.</p>
            </article>
            <article className="outcome reveal">
              <div className="icon">◇</div>
              <h3>Lideri care antrenează</h3>
              <p>Întrebări care dezvoltă gândirea, în locul răspunsului direct.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Closing Section */}
      <section className="closing">
        <div className="wrap closing-grid reveal">
          <h2>Schimbarea începe cu următorul experiment.</h2>
          <div>
            <p>Nu ai nevoie de răspunsul perfect. Ai nevoie de o direcție clară, un pas mic și dorința de a învăța din ceea ce se întâmplă.</p>
            <button
              className="btn"
              type="button"
              onClick={() => openAuthDialog("login")}
              aria-haspopup="dialog"
              aria-controls="auth-dialog"
            >
              Începe practica deliberată <span className="arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="wrap footer-row">
          <span>Practică deliberată pentru îmbunătățire continuă</span>
        </div>
      </footer>

      {/* Authentication Dialog Modal */}
      <dialog
        className="auth-dialog"
        id="auth-dialog"
        ref={dialogRef}
        aria-labelledby="auth-title"
        aria-describedby="auth-subtitle auth-note"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeAuthDialog();
        }}
      >
        <div className="auth-card">
          <button
            className="auth-close"
            id="auth-close"
            type="button"
            aria-label="Închide fereastra de autentificare"
            onClick={closeAuthDialog}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
          <div className="auth-heading">
            <div className="auth-mark" aria-hidden="true">BTP</div>
            <div>
              <h2 id="auth-title" tabIndex={-1}>{views[currentView].title}</h2>
              <p id="auth-subtitle">{views[currentView].subtitle}</p>
            </div>
          </div>

          <form id="auth-form" onSubmit={handleSubmit}>
            {currentView === "register" ? (
              <div className="auth-field">
                <div className="label-row"><label htmlFor="auth-name">Nume complet</label></div>
                <input
                  className="auth-input"
                  id="auth-name"
                  type="text"
                  placeholder="Ion Ionescu"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
            ) : null}

            <div className="auth-field">
              <div className="label-row"><label htmlFor="auth-email">Email</label></div>
              <input
                className="auth-input"
                id="auth-email"
                type="email"
                placeholder="adresa@email.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck="false"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {currentView !== "recover" ? (
              <div className="auth-field" id="password-field">
                <div className="label-row">
                  <label htmlFor="auth-password">Parolă</label>
                  {currentView === "login" ? (
                    <button
                      className="text-button"
                      id="forgot-password"
                      type="button"
                      onClick={() => setCurrentView("recover")}
                    >
                      Ai uitat parola?
                    </button>
                  ) : null}
                </div>
                <div className="password-wrap">
                  <input
                    className="auth-input"
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete={currentView === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="password-toggle"
                    id="password-toggle"
                    type="button"
                    aria-label={showPassword ? "Ascunde parola" : "Afișează parola"}
                    aria-controls="auth-password"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword ? <path className="eye-slash" d="m3 3 18 18" /> : null}
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}

            {currentView === "register" ? (
              <div className="auth-field" id="confirm-field">
                <div className="label-row"><label htmlFor="auth-confirm">Confirmă parola</label></div>
                <input
                  className="auth-input"
                  id="auth-confirm"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            ) : null}

            <button className="btn auth-submit" type="submit" disabled={loading}>
              <span id="auth-submit-label">{loading ? "Se procesează..." : views[currentView].submit}</span>
              {!loading ? <span aria-hidden="true"> →</span> : null}
            </button>
          </form>

          {!statusHidden ? (
            <p
              className="auth-status"
              id="auth-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={
                isError
                  ? { background: "#fee2e2", borderColor: "#fca5a5", color: "#dc2626" }
                  : undefined
              }
            >
              {statusMessage}
            </p>
          ) : null}

          {currentView === "login" ? (
            <p className="auth-switch" id="login-switch">
              Nu ai cont?{" "}
              <button className="text-button" type="button" onClick={() => setCurrentView("register")}>
                Creează cont gratuit
              </button>
            </p>
          ) : (
            <p className="auth-switch" id="return-switch">
              <button className="text-button" type="button" onClick={() => setCurrentView("login")}>
                Înapoi la autentificare
              </button>
            </p>
          )}
        </div>
      </dialog>
    </main>
  );
}
