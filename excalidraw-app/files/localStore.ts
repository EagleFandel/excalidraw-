import { createStore, get, set, del, entries } from "idb-keyval";

import type { FileScenePayload } from "./files-api";

export type LocalFileRecord = {
  fileId: string;
  version: number;
  scene: FileScenePayload;
  dirty: boolean;
  updatedAt: number;
};

const filesStore = createStore("my-files-db", "my-files-store");

export const MyFilesLocalStore = {
  async getLocalFile(fileId: string) {
    return get<LocalFileRecord>(fileId, filesStore);
  },

  async setLocalFile(file: LocalFileRecord) {
    await set(file.fileId, file, filesStore);
  },

  async deleteLocalFile(fileId: string) {
    await del(fileId, filesStore);
  },

  async listLocalFiles() {
    const allEntries = await entries(filesStore);
    return allEntries.map(([, value]) => value as LocalFileRecord);
  },
};
