"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiJson } from "../../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await apiJson<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(payload.message || "Dacă adresa de email există în sistem, ai primit un link de resetare.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Eroare la trimiterea solicitării.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      {/* Left side – intro */}
      <div className="auth-intro">
        <div className="auth-badge">Recuperare cont</div>
        <h1>
          Ai uitat parola?{" "}
          <span className="gradient-text">Îți trimitem un link de resetare.</span>
        </h1>
        <p>
          Introdu adresa de email asociată contului tău Beyond Knowing și îți vom trimite un link securizat valabil 60 de minute.
        </p>

        <ul className="auth-features">
          <li><span className="feat-icon">✦</span> Procedură rapidă și securizată</li>
          <li><span className="feat-icon">✦</span> Valabilitate 60 de minute</li>
          <li><span className="feat-icon">✦</span> Protecție completă a contului</li>
        </ul>
      </div>

      {/* Right side – card */}
      <div className="auth-card">
        <div className="auth-card-header">
          <span className="brand-mark" style={{ width: 42, height: 42, fontSize: 14, borderRadius: 12 }}>BB</span>
          <div>
            <h1>Recuperare parolă</h1>
            <p>Introdu email-ul contului tău.</p>
          </div>
        </div>

        {message ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <h3 style={{ fontSize: 18, color: "var(--ink)", marginBottom: 8 }}>Verifică-ți email-ul</h3>
            <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 20 }}>
              {message}
            </p>
            <Link
              href="/auth/login"
              className="button primary"
              style={{ display: "inline-block", width: "100%", padding: "12px", textDecoration: "none", borderRadius: 8 }}
            >
              Înapoi la Autentificare
            </Link>
          </div>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                placeholder="adresa@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: 4, width: "100%", fontSize: 15, padding: "13px 20px" }}>
              {loading ? (
                <><span className="spinner" /> Se trimite...</>
              ) : (
                "Trimite link de resetare →"
              )}
            </button>
          </form>
        )}

        {error ? <p className="message error" style={{ marginTop: 14 }}>{error}</p> : null}

        <p className="form-footer" style={{ marginTop: 20 }}>
          Ți-ai amintit parola?{" "}
          <Link href="/auth/login">Autentifică-te</Link>
        </p>
      </div>
    </section>
  );
}
