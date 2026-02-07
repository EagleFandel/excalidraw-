import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import {
  TrashIcon,
  file,
  usersIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import clsx from "clsx";

import "./AppSidebar.scss";

import type { PersonalFileMeta } from "../files/files-api";
import type { TeamRecord } from "../teams/teams-api";
import type { FilesScope } from "../teams/teams-jotai";

export const AppSidebar = ({
  files,
  trashedFiles,
  teams,
  currentFileId,
  currentScope,
  currentTeamId,
  isLoading,
  isAuthenticated,
  syncState,
  errorMessage,
  onCreateFile,
  onOpenFile,
  onDeleteFile,
  onRestoreFile,
  onPermanentDeleteFile,
  onToggleFavorite,
  onScopeChange,
  onSelectTeam,
  onCreateTeam,
  onManageTeamMembers,
}: {
  files: PersonalFileMeta[];
  trashedFiles: PersonalFileMeta[];
  teams: TeamRecord[];
  currentFileId: string | null;
  currentScope: FilesScope;
  currentTeamId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  syncState: "idle" | "dirty" | "syncing" | "synced" | "conflict";
  errorMessage: string;
  onCreateFile: () => void;
  onOpenFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRestoreFile: (fileId: string) => void;
  onPermanentDeleteFile: (fileId: string) => void;
  onToggleFavorite: (fileId: string, isFavorite: boolean) => void;
  onScopeChange: (scope: FilesScope) => void;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
  onManageTeamMembers: () => void;
}) => {
  const { openSidebar } = useUIAppState();

  const syncLabel =
    syncState === "syncing"
      ? "Syncing"
      : syncState === "synced"
      ? "Saved"
      : syncState === "dirty"
      ? "Unsaved"
      : syncState === "conflict"
      ? "Conflict"
      : "Idle";

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="myFiles"
          style={{ opacity: openSidebar?.tab === "myFiles" ? 1 : 0.4 }}
        >
          {file}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="myFiles">
        <div className="app-sidebar-files-container">
          <div className="app-sidebar-files-header">
            <div className="app-sidebar-files-title">My Files</div>
            <div
              className={clsx("app-sidebar-sync-status", {
                "is-syncing": syncState === "syncing",
                "is-dirty": syncState === "dirty",
                "is-conflict": syncState === "conflict",
                "is-synced": syncState === "synced",
              })}
            >
              {syncLabel}
            </div>
          </div>

          {!isAuthenticated && (
            <div className="app-sidebar-files-empty">
              Sign in to create and sync personal files.
            </div>
          )}

          {isAuthenticated && (
            <>
              <div className="app-sidebar-scope-tabs" role="tablist">
                <button
                  type="button"
                  className={clsx("app-sidebar-scope-tab", {
                    "is-active": currentScope === "personal",
                  })}
                  onClick={() => onScopeChange("personal")}
                >
                  Personal
                </button>
                <button
                  type="button"
                  className={clsx("app-sidebar-scope-tab", {
                    "is-active": currentScope === "team",
                  })}
                  onClick={() => onScopeChange("team")}
                >
                  Team
                </button>
                <button
                  type="button"
                  className={clsx("app-sidebar-scope-tab", {
                    "is-active": currentScope === "trash",
                  })}
                  onClick={() => onScopeChange("trash")}
                >
                  Trash
                </button>
              </div>

              {currentScope === "team" && (
                <div className="app-sidebar-team-panel">
                  <div className="app-sidebar-team-list">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        className={clsx("app-sidebar-team-item", {
                          "is-active": currentTeamId === team.id,
                        })}
                        onClick={() => onSelectTeam(team.id)}
                      >
                        <span>{usersIcon}</span>
                        <span>{team.name}</span>
                      </button>
                    ))}
                  </div>
                  <FilledButton
                    size="medium"
                    fullWidth
                    label="Create team"
                    onClick={onCreateTeam}
                  />
                  {currentTeamId && (
                    <FilledButton
                      size="medium"
                      fullWidth
                      label="Members"
                      onClick={onManageTeamMembers}
                    />
                  )}
                </div>
              )}

              {currentScope !== "trash" && (
                <FilledButton
                  size="large"
                  fullWidth
                  label="New file"
                  onClick={onCreateFile}
                />
              )}

              {isLoading && (
                <div className="app-sidebar-files-empty">Loading files...</div>
              )}

              {errorMessage && (
                <div className="app-sidebar-files-error">{errorMessage}</div>
              )}

              {!isLoading &&
                currentScope !== "trash" &&
                !files.length &&
                !errorMessage && (
                  <div className="app-sidebar-files-empty">
                    No files yet. Create your first file.
                  </div>
                )}

              {!isLoading &&
                currentScope === "trash" &&
                !trashedFiles.length &&
                !errorMessage && (
                  <div className="app-sidebar-files-empty">Trash is empty.</div>
                )}

              {!!files.length && currentScope !== "trash" && (
                <div className="app-sidebar-file-list">
                  {files.map((item) => (
                    <div
                      key={item.id}
                      className={clsx("app-sidebar-file-item", {
                        "is-active": item.id === currentFileId,
                      })}
                    >
                      <button
                        type="button"
                        className="app-sidebar-file-open"
                        onClick={() => onOpenFile(item.id)}
                      >
                        <div className="app-sidebar-file-item-title">
                          {item.isFavorite ? "[Fav] " : ""}
                          {item.title}
                        </div>
                        <div className="app-sidebar-file-item-meta">
                          v{item.version}
                          {" | "}
                          {new Date(item.updatedAt).toLocaleString()}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="app-sidebar-file-favorite"
                        aria-label={item.isFavorite ? "Unfavorite" : "Favorite"}
                        onClick={() =>
                          onToggleFavorite(item.id, !item.isFavorite)
                        }
                      >
                        {item.isFavorite ? "Unfav" : "Fav"}
                      </button>
                      <button
                        type="button"
                        className="app-sidebar-file-delete"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => onDeleteFile(item.id)}
                      >
                        {TrashIcon}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!!trashedFiles.length && currentScope === "trash" && (
                <div className="app-sidebar-file-list">
                  {trashedFiles.map((item) => (
                    <div key={item.id} className="app-sidebar-file-item">
                      <div className="app-sidebar-file-open">
                        <div className="app-sidebar-file-item-title">
                          {item.title}
                        </div>
                        <div className="app-sidebar-file-item-meta">
                          Trashed {new Date(item.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="app-sidebar-file-restore"
                        aria-label={`Restore ${item.title}`}
                        onClick={() => onRestoreFile(item.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="app-sidebar-file-delete"
                        aria-label={`Permanently delete ${item.title}`}
                        onClick={() => onPermanentDeleteFile(item.id)}
                      >
                        {TrashIcon}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
