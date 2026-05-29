"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error("Date de autentificare invalide");
      }

      const payload = await response.json();
      localStorage.setItem("accessToken", payload.accessToken);
      localStorage.setItem("refreshToken", payload.refreshToken);
      localStorage.setItem("user", JSON.stringify(payload.user));
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-intro">
        <p className="course-meta">Platforma de antrenament operational</p>
        <h1>Invata prin scenarii, primeste feedback, creste vizibil.</h1>
        <p>
          Intra in spatiul tau de cursuri si practica situatii realiste cu evaluare asistata.
        </p>
        <div className="stats-strip">
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
      </div>

      <div className="auth-card">
        <h1>Autentificare</h1>
        <p>Conecteaza-te pentru a continua cursurile.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
        <input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input placeholder="Parola" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button type="submit" disabled={loading}>
          {loading ? "Se autentifica..." : "Intra in platforma"}
        </button>
      </form>
      {error ? <p className="message error">{error}</p> : null}
      <p className="form-footer">
        Nu ai cont? <Link href="/auth/signup">Creeaza cont</Link>
      </p>
      </div>
    </section>
  );
}
