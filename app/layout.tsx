import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keybound // Keyboard Arcade",
  description: "Turn Windows shortcuts into superpowers with quick rounds, daily challenges, combos, and saved progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
