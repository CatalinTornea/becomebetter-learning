"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.message ?? "Nu am putut crea contul.";
        throw new Error(message);
      }

      const payload = await response.json();
      localStorage.setItem("accessToken", payload.accessToken);
      localStorage.setItem("refreshToken", payload.refreshToken);
      localStorage.setItem("user", JSON.stringify(payload.user));
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Eroare la inregistrare");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-intro">
        <p className="course-meta">Cont nou</p>
        <h1>Pregateste-ti parcursul de invatare in cateva minute.</h1>
        <p>
          Creeaza un cont si salveaza progresul pe cursuri, module si scenarii de practica.
        </p>
      </div>

      <div className="auth-card">
      <h1>Creare cont</h1>
      <p>Inregistreaza-te ca sa intri in platforma de cursuri.</p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <input
          placeholder="Nume complet"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={3}
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          placeholder="Parola"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
        />
        <input
          placeholder="Confirma parola"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Se creeaza contul..." : "Creeaza cont"}
        </button>
      </form>
      {error ? <p className="message error">{error}</p> : null}
      <p className="form-footer">
        Ai deja cont? <Link href="/auth/login">Autentifica-te</Link>
      </p>
      </div>
    </section>
  );
}
