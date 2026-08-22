"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/lib/types";

const STORAGE_KEY = "js_user_id";

type Ctx = {
  users: [User, User];
  currentUser: User | null;
  setCurrentUser: (id: number) => void;
};

const CurrentUserContext = createContext<Ctx | null>(null);

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}

export function CurrentUserProvider({
  users,
  children,
}: {
  users: [User, User];
  children: ReactNode;
}) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    const match = users.find((u) => u.id === stored);
    if (match) setCurrentUserState(match);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCurrentUser(id: number) {
    localStorage.setItem(STORAGE_KEY, String(id));
    setCurrentUserState(users.find((u) => u.id === id) ?? null);
  }

  if (!hydrated) return null;

  if (!currentUser) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-lg font-semibold">Who&apos;s this? 🥰</p>
        <div className="flex gap-4">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setCurrentUser(u.id)}
              className="flex w-32 flex-col items-center gap-2 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:shadow-md active:scale-[0.97]"
            >
              <span className="text-4xl">{u.emoji}</span>
              <span className="font-semibold">{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <CurrentUserContext.Provider value={{ users, currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
