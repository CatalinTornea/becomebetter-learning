import type { ReactNode } from "react";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <div className="app-shell">
          <AppHeader />
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}
