import { atom } from "../app-jotai";

import type { PersonalFileMeta } from "./files-api";

export type FileSyncState =
  | "idle"
  | "dirty"
  | "syncing"
  | "synced"
  | "conflict";

export const filesListAtom = atom<PersonalFileMeta[]>([]);
export const fileMetaMapAtom = atom<Record<string, PersonalFileMeta>>({});
export const currentFileIdAtom = atom<string | null>(null);
export const selectedSidebarFileIdAtom = atom<string | null>(null);
export const fileSyncStateAtom = atom<FileSyncState>("idle");
export const filesPanelErrorAtom = atom<string>("");
