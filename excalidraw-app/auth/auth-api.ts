export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

const AUTH_API_BASE = import.meta.env.VITE_APP_AUTH_API_URL || "";

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${AUTH_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const errorCode = data?.error?.code || "REQUEST_FAILED";
    const errorMessage = data?.error?.message || response.statusText;
    throw new Error(`${errorCode}:${errorMessage}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const authApi = {
  getCurrentUser: async (): Promise<AuthUser | null> => {
    const response = await fetch(`${AUTH_API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`REQUEST_FAILED:${response.statusText}`);
    }

    const result = (await response.json()) as {
      user: AuthUser | null;
    };

    return result.user;
  },

  login: async (input: { email: string; password: string }) => {
    const result = await fetchJson<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.user;
  },

  logout: async () => {
    await fetchJson<void>("/auth/logout", {
      method: "POST",
    });
  },
};
