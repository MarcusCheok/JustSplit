"use client";

import Link from "next/link";
import { useCurrentUser } from "./CurrentUserProvider";

export function Header() {
  const { currentUser, setCurrentUser, users } = useCurrentUser();
  const other = users.find((u) => u.id !== currentUser?.id);

  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white/70 px-5 py-3 backdrop-blur">
      <Link href="/trips" className="text-lg font-bold text-ink">
        💞 JustSplit
      </Link>
      <button
        onClick={() => other && setCurrentUser(other.id)}
        className="flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1.5 text-sm font-medium transition active:scale-[0.97]"
        title="Not you? Tap to switch"
      >
        <span>{currentUser?.emoji}</span>
        <span>{currentUser?.name}</span>
      </button>
    </header>
  );
}
