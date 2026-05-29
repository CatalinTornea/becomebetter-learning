"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StoredUser = {
  fullName: string;
  email: string;
  role: "STUDENT" | "COACH" | "ADMIN";
};

const links = [
  { href: "/auth/login", label: "Login" },
  { href: "/auth/signup", label: "Cont nou" },
  { href: "/dashboard", label: "Cursuri" },
  { href: "/practice", label: "Practica" },
  { href: "/progress", label: "Analiza" }
];

export function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    function syncUser() {
      const stored = localStorage.getItem("user");
      if (!stored) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(stored) as StoredUser);
      } catch {
        localStorage.removeItem("user");
        setUser(null);
      }
    }

    syncUser();
    window.addEventListener("auth-changed", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("auth-changed"));
    router.push("/auth/login");
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">BB</span>
          <span>Become better</span>
        </Link>
        <div className="site-header__right">
          <nav className="site-nav" aria-label="Navigatie principala">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          {user ? (
            <div className="user-menu">
              <div>
                <strong>{user.fullName}</strong>
                <span>{user.role === "ADMIN" ? "Admin" : "Cursant"}</span>
              </div>
              {user.role === "ADMIN" ? (
                <Link className="admin-link" href="/admin">
                  Administrare
                </Link>
              ) : null}
              <button className="logout-btn" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
