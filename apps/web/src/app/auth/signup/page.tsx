"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "../../../lib/api";
import { AuthUser, cacheUser, notifyAuthChanged } from "../../../lib/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }

    setLoading(true);
    try {
      const payload = await apiJson<{ user: AuthUser }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password })
      });

      cacheUser(payload.user);
      notifyAuthChanged();
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Eroare la înregistrare");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      {/* Left side */}
      <div className="auth-intro">
        <div className="auth-badge">Cont nou</div>
        <h1>
          Pregătește-ți{" "}
          <span className="gradient-text">parcursul de învățare</span>{" "}
          în câteva minute.
        </h1>
        <p>
          Creează un cont și salvează progresul pe cursuri, module și
          scenarii de practică.
        </p>

        <ul className="auth-features">
          <li><span className="feat-icon">✦</span> Acces la toate cursurile disponibile</li>
          <li><span className="feat-icon">✦</span> Istoricul scorurilor și evaluărilor</li>
          <li><span className="feat-icon">✦</span> Feedback AI personalizat</li>
        </ul>
      </div>

      {/* Right side – card */}
      <div className="auth-card">
        <div className="auth-card-header">
          <span className="brand-mark" style={{ width: 42, height: 42, fontSize: 14, borderRadius: 12 }}>BB</span>
          <div>
            <h1>Creare cont</h1>
            <p>Înregistrează-te gratuit.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="signup-name">Nume complet</label>
            <input
              id="signup-name"
              placeholder="Ion Ionescu"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={3}
              autoComplete="name"
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              placeholder="adresa@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="signup-password">Parolă</label>
            <input
              id="signup-password"
              placeholder="Minim 6 caractere"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="signup-confirm">Confirmă parola</label>
            <input
              id="signup-confirm"
              placeholder="••••••••"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={loading} style={{ marginTop: 4, width: "100%", fontSize: 15, padding: "13px 20px" }}>
            {loading ? (
              <><span className="spinner" /> Se creează contul...</>
            ) : (
              "Creează cont →"
            )}
          </button>
        </form>

        {error ? <p className="message error" style={{ marginTop: 14 }}>{error}</p> : null}

        <p className="form-footer" style={{ marginTop: 20 }}>
          Ai deja cont?{" "}
          <Link href="/auth/login">Autentifică-te</Link>
        </p>
      </div>

      <style>{`
        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(124, 58, 237, 0.12);
          border: 1px solid rgba(124, 58, 237, 0.30);
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
