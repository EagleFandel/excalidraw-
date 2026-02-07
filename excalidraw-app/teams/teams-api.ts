export type TeamRole = "owner" | "admin" | "member";

export type TeamRecord = {
  id: string;
  name: string;
  createdByUserId: string;
  role: TeamRole;
  createdAt: string;
  updatedAt: string;
};

export type TeamMemberRecord = {
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
};

const TEAMS_API_BASE =
  import.meta.env.VITE_APP_FILES_API_URL ||
  import.meta.env.VITE_APP_AUTH_API_URL ||
  "";

const fetchTeamsJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${TEAMS_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || response.statusText;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const teamsApi = {
  listTeams: async (): Promise<TeamRecord[]> => {
    const result = await fetchTeamsJson<{ teams: TeamRecord[] }>("/teams", {
      method: "GET",
    });

    return result.teams;
  },

  createTeam: async (name: string): Promise<TeamRecord> => {
    const result = await fetchTeamsJson<{ team: TeamRecord }>("/teams", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    return result.team;
  },

  listMembers: async (teamId: string): Promise<TeamMemberRecord[]> => {
    const result = await fetchTeamsJson<{ members: TeamMemberRecord[] }>(
      `/teams/${teamId}/members`,
      {
        method: "GET",
      },
    );

    return result.members;
  },

  addMember: async (input: {
    teamId: string;
    email: string;
    role: TeamRole;
  }): Promise<TeamMemberRecord> => {
    const result = await fetchTeamsJson<{ member: TeamMemberRecord }>(
      `/teams/${input.teamId}/members`,
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          role: input.role,
        }),
      },
    );

    return result.member;
  },

  updateMemberRole: async (input: {
    teamId: string;
    userId: string;
    role: TeamRole;
  }): Promise<TeamMemberRecord> => {
    const result = await fetchTeamsJson<{ member: TeamMemberRecord }>(
      `/teams/${input.teamId}/members/${input.userId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role: input.role }),
      },
    );

    return result.member;
  },

  removeMember: async (input: { teamId: string; userId: string }) => {
    await fetchTeamsJson<void>(
      `/teams/${input.teamId}/members/${input.userId}`,
      {
        method: "DELETE",
      },
    );
  },
};
