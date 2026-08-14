import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "../components/PwaRegister";

export const metadata: Metadata = {
  title: "FORMA｜12 周腹肌计划",
  description: "为你定制的低冲击减脂与核心训练计划。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport = { themeColor: "#10152d", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><PwaRegister/>{children}</body></html>;
}
