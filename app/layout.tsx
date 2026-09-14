import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Off The Hosel — Fantasy Golf",
  description: "Off The Hosel: One & Done and Major Challenge fantasy golf. Every pick matters.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app">
            <Header displayName={profile?.display_name} />
            <main className="main">{children}</main>
            <BottomNav />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
