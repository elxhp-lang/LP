import type { ReactNode } from "react";

import AppShell from "@/components/AppShell";

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="app-body">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
