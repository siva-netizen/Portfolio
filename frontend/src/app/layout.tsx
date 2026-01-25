import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siva Sabarivel | AI/ML Engineer",
  description: "AI/ML Engineer specializing in LLM Systems, RAG, and Agentic AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
