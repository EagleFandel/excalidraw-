import { atom } from "../app-jotai";

import type { PersonalFileMeta } from "./files-api";
import type { PendingOp } from "./sync-queue";

export type FileListSort = "recent" | "updated" | "name";

export type FileSyncState =
  | "idle"
  | "dirty"
  | "syncing"
  | "synced"
  | "conflict"
  | "offline";

export type ConflictContext = {
  fileId: string;
  title: string;
  localSceneVersion: number;
  serverVersion: number;
};

export const filesListAtom = atom<PersonalFileMeta[]>([]);
export const fileMetaMapAtom = atom<Record<string, PersonalFileMeta>>({});
export const currentFileIdAtom = atom<string | null>(null);
export const selectedSidebarFileIdAtom = atom<string | null>(null);
export const fileSyncStateAtom = atom<FileSyncState>("idle");
export const filesPanelErrorAtom = atom<string>("");
export const pendingOpsAtom = atom<PendingOp[]>([]);
export const conflictContextAtom = atom<ConflictContext | null>(null);
export const fileListQueryAtom = atom("");
export const fileListSortAtom = atom<FileListSort>("recent");
export const fileListFavoritesOnlyAtom = atom(false);
