import type { Metadata } from "next";
import "./globals.css";
import "./interface.css";
import "./order-summary.css";
import "./advisor-performance.css";
import "./business.css";
import "./christmas.css";

export const metadata: Metadata = {
  title: "Copy Print Caja",
  description: "Sistema de pedidos, caja y clientes de Copy Print.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
