"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AuthUser,
  clearCachedUser,
  fetchCurrentUser,
  getCachedUser,
  logout as logoutRequest
} from "../lib/auth";

const publicLinks = [
  { href: "/auth/login", label: "Login" },
  { href: "/auth/signup", label: "Cont nou" }
];

const privateLinks = [
  { href: "/dashboard", label: "Cursuri" },
  { href: "/practice", label: "Practică" },
  { href: "/progress", label: "Analiză" }
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function syncUser() {
      const cached = getCachedUser();
      if (cached) setUser(cached);
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        clearCachedUser();
        setUser(null);
      }
    }

    const handleAuthChanged = () => { void syncUser(); };
    const handleStorage = () => { setUser(getCachedUser()); };

    void syncUser();
    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/auth/login");
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="site-header" data-scrolled={scrolled}>
        <div className="site-header__inner">
          <Link className="brand" href="/dashboard">
            <span className="brand-mark">BB</span>
            <span>Become Better</span>
          </Link>

          <div className="site-header__right">
            <nav className="site-nav" aria-label="Navigatie principala">
              {!user
                ? publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={isActive(link.href) ? "nav-active" : ""}
                    >
                      {link.label}
                    </Link>
                  ))
                : null}
              {user
                ? privateLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={isActive(link.href) ? "nav-active" : ""}
                    >
                      {link.label}
                    </Link>
                  ))
                : null}
            </nav>

            {user ? (
              <div className="user-menu">
                <div className="user-info">
                  <strong>{user.fullName}</strong>
                  <span>{user.role === "ADMIN" ? "Admin" : "Cursant"}</span>
                </div>
                {user.role === "ADMIN" ? (
                  <>
                    <Link className="admin-link" href="/admin">Administrare</Link>
                    <Link className="admin-link" href="/admin/scores">Scoruri</Link>
                  </>
                ) : null}
                <button className="logout-btn" type="button" onClick={() => void logout()}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <style>{`
        .site-header[data-scrolled="true"] {
          background: rgba(255, 255, 255, 0.97);
          box-shadow: 0 1px 0 rgba(124, 58, 237, 0.10), 0 4px 24px rgba(124, 58, 237, 0.08);
        }
        .site-nav a {
          color: #4b5563;
        }
        .site-nav a:hover {
          color: var(--primary);
        }
        .site-nav a.nav-active {
          color: var(--primary);
          background: var(--primary-soft);
          border-color: var(--border-strong);
          font-weight: 700;
        }
        .brand span:last-child {
          color: var(--ink);
        }
        .user-info {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </>
  );
}
