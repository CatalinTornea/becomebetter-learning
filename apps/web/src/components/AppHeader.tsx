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
  { href: "/?auth=login", label: "Login" },
  { href: "/?auth=register", label: "Cont nou" }
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
            <span className="brand-mark" aria-hidden="true">
              <svg
                className="brand-symbol"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                focusable="false"
              >
                <path d="M7 9.5c3.8 0 6.5 1.1 9 3.3 2.5-2.2 5.2-3.3 9-3.3v13.2c-3.8 0-6.5 1.1-9 3.3-2.5-2.2-5.2-3.3-9-3.3V9.5Z" />
                <path d="M16 12.8V26" />
                <path d="M11 18.2c2.6-2.9 5.5-4.4 9.2-4.4" />
                <path d="m18.2 11.8 2 2-2 2" />
              </svg>
            </span>
            <span>Beyond Knowing</span>
          </Link>

          <div className="site-header__right">
            <nav className="site-nav" aria-label="Navigatie principala">
              {!user
                ? publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={isActive(link.href) ? "nav-active" : ""}
                      onClick={(e) => {
                        if (pathname === "/") {
                          e.preventDefault();
                          const mode = link.href.includes("register") ? "register" : "login";
                          window.dispatchEvent(new CustomEvent("open-auth", { detail: mode }));
                        }
                      }}
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
          box-shadow: 0 1px 0 rgba(201, 35, 50, 0.10), 0 4px 24px rgba(201, 35, 50, 0.08);
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
