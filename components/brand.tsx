"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentDayStreak, levelFor } from "../lib/game";
import { useProfile } from "../lib/profile";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Keybound home">
      <span className="brand-cap" aria-hidden="true">
        K
      </span>
      <span className="brand-word">Keybound</span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const level = levelFor(profile.xp);
  const streak = currentDayStreak(profile);
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Main">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
          Play
        </Link>
        <Link
          href="/library"
          aria-current={pathname === "/library" ? "page" : undefined}
        >
          Library
        </Link>
      </nav>
      <div className="player-chip" aria-label="Your progress">
        <span className="chip-level">LV {level.level}</span>
        <span className="chip-xp">{profile.xp.toLocaleString()} XP</span>
        {streak > 0 && (
          <span className="chip-streak" title={`${streak}-day streak`}>
            🔥 {streak}
          </span>
        )}
      </div>
    </header>
  );
}
