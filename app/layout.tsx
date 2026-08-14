import type { Metadata } from "next";
import "./globals.css";
import "../features/landing/landing.css";
import "./polish.css";
import PwaRegister from "../shared/pwa/PwaRegister";

export const metadata: Metadata = {
  title: "FORMA｜12 周腹肌计划",
  description: "为你定制的低冲击减脂与核心训练计划。",
  applicationName: "FORMA 自律健身",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FORMA" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport = { themeColor: "#10152d", colorScheme: "dark", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><PwaRegister/>{children}</body></html>;
}
