import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chord // Shortcut Trainer",
  description: "Build keyboard shortcut fluency through quick, focused practice.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
