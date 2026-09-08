import type { ReactNode } from "react";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata = {
  title: "Better Through Practice – Platforma de antrenament operational",
  description: "Invata prin scenarii realiste, primeste feedback AI si creste vizibil. Platforma de e-learning cu evaluare asistata."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="app-shell">
          <AppHeader />
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}
