"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiJson } from "../../../lib/api";
import { AuthUser, cacheUser, notifyAuthChanged } from "../../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = await apiJson<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      cacheUser(payload.user);
      notifyAuthChanged();
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      {/* Left side – intro */}
      <div className="auth-intro">
        <div className="auth-badge">Platformă de antrenament</div>
        <h1>
          Învață prin scenarii,{" "}
          <span className="gradient-text">primește feedback, crește vizibil.</span>
        </h1>
        <p>
          Intră în spațiul tău de cursuri și practică situații realiste
          cu evaluare asistată de AI.
        </p>
        <div className="stats-strip" style={{ marginTop: 8 }}>
          <div className="stat">
            <strong>AI</strong>
            <span>Feedback rapid</span>
          </div>
          <div className="stat">
            <strong>3</strong>
            <span>Niveluri</span>
          </div>
          <div className="stat">
            <strong>24/7</strong>
            <span>Practicare</span>
          </div>
        </div>

        {/* Feature list */}
        <ul className="auth-features">
          <li>
            <span className="feat-icon">✦</span>
            Scenarii reale din mediul operațional
          </li>
          <li>
            <span className="feat-icon">✦</span>
            Evaluare instantă cu criterii clare
          </li>
          <li>
            <span className="feat-icon">✦</span>
            Progres vizibil și măsurabil
          </li>
        </ul>
      </div>

      {/* Right side – card */}
      <div className="auth-card">
        <div className="auth-card-header">
          <span className="brand-mark" style={{ width: 42, height: 42, fontSize: 14, borderRadius: 12 }}>BTP</span>
          <div>
            <h1>Autentificare</h1>
            <p>Conectează-te pentru a continua.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              placeholder="adresa@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="input-label" htmlFor="login-password" style={{ margin: 0 }}>Parolă</label>
              <Link href="/auth/forgot-password" style={{ fontSize: "13px", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
                Ai uitat parola?
              </Link>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="login-password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ascunde parola" : "Arată parola"}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-muted)",
                  minHeight: "auto",
                  width: "auto"
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ marginTop: 4, width: "100%", fontSize: 15, padding: "13px 20px" }}>
            {loading ? (
              <><span className="spinner" /> Se autentifică...</>
            ) : (
              "Intră în platformă →"
            )}
          </button>
        </form>

        {error ? <p className="message error" style={{ marginTop: 14 }}>{error}</p> : null}

        <p className="form-footer" style={{ marginTop: 20 }}>
          Nu ai cont?{" "}
          <Link href="/auth/signup">Creează cont gratuit</Link>
        </p>


      </div>

      <style>{`
        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(201, 35, 50, 0.12);
          border: 1px solid rgba(201, 35, 50, 0.30);
          border-radius: 999px;
          color: var(--primary-light);
          font-size: 13px;
          font-weight: 700;
          padding: 6px 16px;
          letter-spacing: 0.04em;
          width: fit-content;
        }
        .auth-badge::before {
          content: "";
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--primary-light);
          box-shadow: 0 0 8px var(--primary-light);
          flex-shrink: 0;
        }
        .auth-features {
          list-style: none;
          display: grid;
          gap: 10px;
        }
        .auth-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--ink-muted);
          font-weight: 500;
        }
        .feat-icon {
          color: var(--primary-light);
          font-size: 12px;
          flex-shrink: 0;
        }
        .auth-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .auth-card-header h1 { font-size: 22px; margin-bottom: 4px; }
        .auth-card-header p { font-size: 14px; color: var(--ink-muted); }
        .input-group { display: grid; gap: 6px; }
        .input-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-muted);
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
