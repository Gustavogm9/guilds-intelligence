import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Guilds Intelligence Engine — Inteligência de Mercado Personalizada",
  description:
    "Relatórios personalizados de inteligência de mercado gerados por IA para empresas B2B. PDF, áudio, WhatsApp e social media todo mês.",
  keywords: [
    "inteligência de mercado",
    "relatórios personalizados",
    "IA",
    "B2B",
    "market intelligence",
    "Guilds",
  ],
  openGraph: {
    title: "Guilds Intelligence Engine",
    description:
      "Relatórios personalizados de inteligência de mercado gerados por IA.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
