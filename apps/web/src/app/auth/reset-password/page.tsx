"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiJson } from "../../../lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Token-ul de resetare lipsește din link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Parolele introduse nu coincid.");
      return;
    }

    setLoading(true);

    try {
      const payload = await apiJson<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });

      setSuccess(payload.message || "Parola a fost schimbată cu succes!");
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Eroare la resetarea parolei.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <span className="brand-mark" style={{ width: 42, height: 42, fontSize: 14, borderRadius: 12 }}>BB</span>
        <div>
          <h1>Setează noua parolă</h1>
          <p>Introdu noua ta parolă de acces.</p>
        </div>
      </div>

      {success ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 18, color: "var(--ink)", marginBottom: 8 }}>Parolă schimbată!</h3>
          <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 20 }}>
            {success} Vei fi redirecționat automat la pagina de autentificare...
          </p>
          <Link
            href="/auth/login"
            className="button primary"
            style={{ display: "inline-block", width: "100%", padding: "12px", textDecoration: "none", borderRadius: 8 }}
          >
            Intră în cont acum →
          </Link>
        </div>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="reset-password">Parolă nouă</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="reset-password"
                placeholder="Minim 6 caractere"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
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

          <div className="input-group">
            <label className="input-label" htmlFor="reset-confirm">Confirmă noua parolă</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="reset-confirm"
                placeholder="••••••••"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                title={showConfirm ? "Ascunde parola" : "Arată parola"}
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
                {showConfirm ? (
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
              <><span className="spinner" /> Se resetează...</>
            ) : (
              "Salvează noua parolă →"
            )}
          </button>
        </form>
      )}

      {error ? <p className="message error" style={{ marginTop: 14 }}>{error}</p> : null}

      <p className="form-footer" style={{ marginTop: 20 }}>
        Înapoi la{" "}
        <Link href="/auth/login">Autentificare</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="auth-page">
      <div className="auth-intro">
        <div className="auth-badge">Securitate</div>
        <h1>
          Setează o nouă parolă{" "}
          <span className="gradient-text">pentru contul tău.</span>
        </h1>
        <p>
          Alege o parolă puternică de cel puțin 6 caractere pentru a fi protejat.
        </p>
      </div>

      <Suspense fallback={<p>Se încarcă...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </section>
  );
}
