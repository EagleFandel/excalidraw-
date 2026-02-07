import { atom } from "../app-jotai";

import type { AuthUser } from "./auth-api";

export type AuthStatus = "unknown" | "guest" | "authenticated";

export const currentUserAtom = atom<AuthUser | null>(null);
export const authStatusAtom = atom<AuthStatus>("unknown");

export const isAuthenticatedAtom = atom(
  (get) => get(authStatusAtom) === "authenticated",
);
