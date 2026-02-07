import { fetchWithCsrf } from "../auth/csrf";

export type FileScenePayload = {
  elements: unknown[];
  appState: Record<string, unknown> | null;
  files: Record<string, unknown>;
};

export type PersonalFileMeta = {
  id: string;
  title: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  teamId?: string | null;
  isTrashed?: boolean;
  trashedAt?: string | null;
  lastOpenedAt?: string | null;
  isFavorite?: boolean;
};

export type PersonalFileRecord = PersonalFileMeta & {
  scene: FileScenePayload;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
  currentVersion?: number;
};

export class FilesApiError extends Error {
  code: string;
  status: number;
  currentVersion?: number;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    currentVersion?: number;
  }) {
    super(opts.message);
    this.name = "FilesApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.currentVersion = opts.currentVersion;
  }
}

const FILES_API_BASE =
  import.meta.env.VITE_APP_FILES_API_URL ||
  import.meta.env.VITE_APP_AUTH_API_URL ||
  "";

const fetchFilesJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const headers = new Headers(init?.headers || undefined);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchWithCsrf(`${FILES_API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiErrorPayload | null;

    throw new FilesApiError({
      code: payload?.error?.code || "REQUEST_FAILED",
      message: payload?.error?.message || response.statusText,
      status: response.status,
      currentVersion: payload?.currentVersion,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const filesApi = {
  listPersonalFiles: async (opts?: {
    includeTrashed?: boolean;
    favoritesOnly?: boolean;
  }): Promise<PersonalFileMeta[]> => {
    const params = new URLSearchParams({
      scope: "personal",
    });
    if (opts?.includeTrashed) {
      params.set("includeTrashed", "true");
    }
    if (opts?.favoritesOnly) {
      params.set("favoritesOnly", "true");
    }

    const result = await fetchFilesJson<{ files: PersonalFileMeta[] }>(
      `/files?${params.toString()}`,
      {
        method: "GET",
      },
    );
    return result.files;
  },

  createPersonalFile: async (input?: {
    title?: string;
    scope?: "personal" | "team";
    teamId?: string | null;
    scene?: FileScenePayload;
  }): Promise<PersonalFileRecord> => {
    const result = await fetchFilesJson<{ file: PersonalFileRecord }>(
      "/files",
      {
        method: "POST",
        body: JSON.stringify({
          title: input?.title,
          scope: input?.scope || "personal",
          teamId: input?.teamId || null,
          scene: input?.scene,
        }),
      },
    );

    return result.file;
  },

  getFile: async (fileId: string): Promise<PersonalFileRecord> => {
    const result = await fetchFilesJson<{ file: PersonalFileRecord }>(
      `/files/${fileId}`,
      {
        method: "GET",
      },
    );

    return result.file;
  },

  saveFile: async (input: {
    fileId: string;
    version: number;
    title?: string;
    scene: FileScenePayload;
  }): Promise<PersonalFileRecord> => {
    const result = await fetchFilesJson<{ file: PersonalFileRecord }>(
      `/files/${input.fileId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          version: input.version,
          title: input.title,
          scene: input.scene,
        }),
      },
    );

    return result.file;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await fetchFilesJson<void>(`/files/${fileId}`, {
      method: "DELETE",
    });
  },

  restoreFile: async (fileId: string): Promise<PersonalFileRecord> => {
    const result = await fetchFilesJson<{ file: PersonalFileRecord }>(
      `/files/${fileId}/restore`,
      {
        method: "POST",
      },
    );

    return result.file;
  },

  permanentlyDeleteFile: async (fileId: string): Promise<void> => {
    await fetchFilesJson<void>(`/files/${fileId}/permanent`, {
      method: "DELETE",
    });
  },

  setFavorite: async (
    fileId: string,
    isFavorite: boolean,
  ): Promise<PersonalFileRecord> => {
    const result = await fetchFilesJson<{ file: PersonalFileRecord }>(
      `/files/${fileId}/favorite`,
      {
        method: "PATCH",
        body: JSON.stringify({ isFavorite }),
      },
    );

    return result.file;
  },

  listTeamFiles: async (opts: {
    teamId: string;
    includeTrashed?: boolean;
    favoritesOnly?: boolean;
  }): Promise<PersonalFileMeta[]> => {
    const params = new URLSearchParams({
      scope: "team",
      teamId: opts.teamId,
    });
    if (opts.includeTrashed) {
      params.set("includeTrashed", "true");
    }
    if (opts.favoritesOnly) {
      params.set("favoritesOnly", "true");
    }

    const result = await fetchFilesJson<{ files: PersonalFileMeta[] }>(
      `/files?${params.toString()}`,
      {
        method: "GET",
      },
    );

    return result.files;
  },
};
