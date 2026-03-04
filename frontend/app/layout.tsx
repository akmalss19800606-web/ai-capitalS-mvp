import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Capital Management",
  description: "AI-powered investment platform by Soliev Akmal Idievich",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <header style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 32px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: "bold", fontSize: "16px"
            }}>AI</div>
            <span style={{ fontWeight: "700", fontSize: "18px", color: "#1e293b" }}>
              AI Capital Management
            </span>
          </div>
        </header>
        <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
          {children}
        </main>
        <footer style={{
          textAlign: "center",
          padding: "16px",
          fontSize: "12px",
          color: "#94a3b8",
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          marginTop: "40px"
        }}>
          © 2026 AI Capital Management &nbsp;·&nbsp; Автор: Солиев Акмал Идиевич &nbsp;·&nbsp; Свидетельство об авторском праве №009932
        </footer>
      </body>
    </html>
  );
}
