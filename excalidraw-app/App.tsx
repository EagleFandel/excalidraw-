import {
  Excalidraw,
  LiveCollaborationTrigger,
  TTDDialogTrigger,
  CaptureUpdateAction,
  reconcileElements,
  useEditorInterface,
} from "@excalidraw/excalidraw";
import { trackEvent } from "@excalidraw/excalidraw/analytics";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@excalidraw/excalidraw/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import { openConfirmModal } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirmState";
import { ShareableLinkDialog } from "@excalidraw/excalidraw/components/ShareableLinkDialog";
import Trans from "@excalidraw/excalidraw/components/Trans";
import {
  APP_NAME,
  EVENT,
  THEME,
  VERSION_TIMEOUT,
  debounce,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isRunningInIframe,
  isDevEnv,
} from "@excalidraw/common";
import polyfill from "@excalidraw/excalidraw/polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { useCallbackRefState } from "@excalidraw/excalidraw/hooks/useCallbackRefState";
import { t } from "@excalidraw/excalidraw/i18n";

import {
  GithubIcon,
  XBrandIcon,
  DiscordIcon,
  ExcalLogo,
  usersIcon,
  exportToPlus,
  share,
  youtubeIcon,
} from "@excalidraw/excalidraw/components/icons";
import { isElementLink } from "@excalidraw/element";
import {
  bumpElementVersions,
  restoreAppState,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";
import { newElementWith } from "@excalidraw/element";
import { isInitializedImageElement } from "@excalidraw/element";
import clsx from "clsx";
import {
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from "@excalidraw/excalidraw/data/library";

import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
import type {
  FileId,
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ResolutionType } from "@excalidraw/common/utility-types";
import type { ResolvablePromise } from "@excalidraw/common/utils";

import CustomStats from "./CustomStats";
import {
  Provider,
  useAtom,
  useAtomValue,
  useAtomWithInitialValue,
  appJotaiStore,
} from "./app-jotai";
import {
  FIREBASE_STORAGE_PREFIXES,
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "./app_constants";
import { authApi } from "./auth/auth-api";
import { AuthDialog } from "./auth/auth-dialog";
import {
  authStatusAtom,
  currentUserAtom,
  isAuthenticatedAtom,
} from "./auth/auth-jotai";
import Collab, {
  collabAPIAtom,
  isCollaboratingAtom,
  isOfflineAtom,
} from "./collab/Collab";
import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import {
  ExportToExcalidrawPlus,
  exportToExcalidrawPlus,
} from "./components/ExportToExcalidrawPlus";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  getCollaborationLinkData,
  importFromBackend,
  isCollaborationLink,
} from "./data";

import { updateStaleImageStatuses } from "./data/FileManager";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
} from "./data/localStorage";

import { loadFilesFromFirebase } from "./data/firebase";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
  localStorageQuotaExceededAtom,
} from "./data/LocalData";
import { FilesApiError, filesApi } from "./files/files-api";
import {
  applyFileSceneToExcalidraw,
  getEmptyFileScene,
  serializeSceneFromExcalidraw,
} from "./files/files-scene";
import {
  currentFileIdAtom,
  fileMetaMapAtom,
  filesListAtom,
  filesPanelErrorAtom,
  fileSyncStateAtom,
} from "./files/files-jotai";
import { MyFilesLocalStore } from "./files/localStore";
import { teamsApi } from "./teams/teams-api";
import {
  currentScopeAtom,
  currentTeamIdAtom,
  teamMembersAtom,
  teamsAtom,
  teamsPanelErrorAtom,
  type FilesScope,
} from "./teams/teams-jotai";
import { TeamMembersDialog } from "./teams/team-members-dialog";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import CollabError, { collabErrorIndicatorAtom } from "./collab/CollabError";
import { useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";
import { AIComponents } from "./components/AI";
import { ExcalidrawPlusIframeExport } from "./ExcalidrawPlusIframeExport";

import "./index.scss";

import { ExcalidrawPlusPromoBanner } from "./components/ExcalidrawPlusPromoBanner";
import { AppSidebar } from "./components/AppSidebar";

import type { CollabAPI } from "./collab/Collab";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

// Adding a listener outside of the component as it may (?) need to be
// subscribed early to catch the event.
//
// Also note that it will fire only if certain heuristics are met (user has
// used the app for some time, etc.)
window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    // prevent Chrome <= 67 from automatically showing the prompt
    event.preventDefault();
    // cache for later use
    pwaEvent = event;
  },
);

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const shareableLinkConfirmDialog = {
  title: t("overwriteConfirm.modal.shareableLink.title"),
  description: (
    <Trans
      i18nKey="overwriteConfirm.modal.shareableLink.description"
      bold={(text) => <strong>{text}</strong>}
      br={() => <br />}
    />
  ),
  actionLabel: t("overwriteConfirm.modal.shareableLink.button"),
  color: "danger",
} as const;

const initializeScene = async (opts: {
  collabAPI: CollabAPI | null;
  excalidrawAPI: ExcalidrawImperativeAPI;
}): Promise<
  { scene: ExcalidrawInitialDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(
    /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
  );
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: Omit<
    RestoredDataState,
    // we're not storing files in the scene database/localStorage, and instead
    // fetch them async from a different store
    "files"
  > & {
    scrollToContent?: boolean;
  } = {
    elements: restoreElements(localDataState?.elements, null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    }),
    appState: restoreAppState(localDataState?.appState, null),
  };

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      (await openConfirmModal(shareableLinkConfirmDialog))
    ) {
      if (jsonBackendMatch) {
        const imported = await importFromBackend(
          jsonBackendMatch[1],
          jsonBackendMatch[2],
        );

        scene = {
          elements: bumpElementVersions(
            restoreElements(imported.elements, null, {
              repairBindings: true,
              deleteInvisibleElements: true,
            }),
            localDataState?.elements,
          ),
          appState: restoreAppState(
            imported.appState,
            // local appState when importing from backend to ensure we restore
            // localStorage user settings which we do not persist on server.
            localDataState?.appState,
          ),
        };
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // https://github.com/excalidraw/excalidraw/issues/1919
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (
        !scene.elements.length ||
        (await openConfirmModal(shareableLinkConfirmDialog))
      ) {
        return { scene: data, isExternalScene };
      }
    } catch (error: any) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData && opts.collabAPI) {
    const { excalidrawAPI } = opts;

    const scene = await opts.collabAPI.startCollaboration(roomLinkData);

    return {
      // when collaborating, the state may have already been updated at this
      // point (we may have received updates from other clients), so reconcile
      // elements and appState with existing state
      scene: {
        ...scene,
        appState: {
          ...restoreAppState(
            {
              ...scene?.appState,
              theme: localDataState?.appState?.theme || scene?.appState?.theme,
            },
            excalidrawAPI.getAppState(),
          ),
          // necessary if we're invoking from a hashchange handler which doesn't
          // go through App.initializeScene() that resets this flag
          isLoading: false,
        },
        elements: reconcileElements(
          scene?.elements || [],
          excalidrawAPI.getSceneElementsIncludingDeleted() as RemoteExcalidrawElement[],
          excalidrawAPI.getAppState(),
        ),
      },
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const ExcalidrawWrapper = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const isCollabDisabled = isRunningInIframe();

  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();

  const [langCode, setLangCode] = useAppLangCode();

  const editorInterface = useEditorInterface();

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  const [, setShareDialogState] = useAtom(shareDialogStateAtom);
  const [collabAPI] = useAtom(collabAPIAtom);
  const [authStatus, setAuthStatus] = useAtom(authStatusAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const [filesList, setFilesList] = useAtom(filesListAtom);
  const [currentFileId, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [, setFileMetaMap] = useAtom(fileMetaMapAtom);
  const [filesPanelError, setFilesPanelError] = useAtom(filesPanelErrorAtom);
  const [fileSyncState, setFileSyncState] = useAtom(fileSyncStateAtom);
  const [teams, setTeams] = useAtom(teamsAtom);
  const [currentTeamId, setCurrentTeamId] = useAtom(currentTeamIdAtom);
  const [currentScope, setCurrentScope] = useAtom(currentScopeAtom);
  const [teamsPanelError, setTeamsPanelError] = useAtom(teamsPanelErrorAtom);
  const [teamMembersMap, setTeamMembersMap] = useAtom(teamMembersAtom);
  const [trashedFiles, setTrashedFiles] = useState<typeof filesList>([]);
  const [trashSourceScope, setTrashSourceScope] =
    useState<Exclude<FilesScope, "trash">>("personal");
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isTeamMembersDialogOpen, setIsTeamMembersDialogOpen] = useState(false);
  const [isTeamMembersLoading, setIsTeamMembersLoading] = useState(false);
  const [isCollaborating] = useAtomWithInitialValue(isCollaboratingAtom, () => {
    return isCollaborationLink(window.location.href);
  });
  const collabError = useAtomValue(collabErrorIndicatorAtom);

  const currentFileIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentFileIdRef.current = currentFileId;
  }, [currentFileId]);

  const saveVersionRef = useRef<Record<string, number>>({});
  const isApplyingPersonalSceneRef = useRef(false);

  const applyPersonalFileScene = useCallback(
    (scene: ReturnType<typeof getEmptyFileScene>) => {
      if (!excalidrawAPI) {
        return;
      }

      isApplyingPersonalSceneRef.current = true;
      applyFileSceneToExcalidraw(excalidrawAPI, scene);
      window.setTimeout(() => {
        isApplyingPersonalSceneRef.current = false;
      }, 0);
    },
    [excalidrawAPI],
  );

  const loadTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setCurrentTeamId(null);
      setTeamsPanelError("");
      return;
    }

    try {
      setTeamsPanelError("");
      const remoteTeams = await teamsApi.listTeams();
      setTeams(remoteTeams);
      if (!currentTeamId && remoteTeams[0]) {
        setCurrentTeamId(remoteTeams[0].id);
      }
    } catch {
      setTeamsPanelError("Failed to load teams");
    }
  }, [
    currentTeamId,
    isAuthenticated,
    setCurrentTeamId,
    setTeams,
    setTeamsPanelError,
  ]);

  const loadScopedFiles = useCallback(async () => {
    if (!isAuthenticated) {
      setFilesList([]);
      setTrashedFiles([]);
      setFileMetaMap({});
      setCurrentFileId(null);
      setFilesPanelError("");
      setFileSyncState("idle");
      saveVersionRef.current = {};
      return;
    }

    try {
      setFilesPanelError("");
      const activeDataScope =
        currentScope === "trash" ? trashSourceScope : currentScope;

      const scopeFiles =
        activeDataScope === "team" && currentTeamId
          ? await filesApi.listTeamFiles({
              teamId: currentTeamId,
              includeTrashed: true,
            })
          : await filesApi.listPersonalFiles({ includeTrashed: true });

      const files = scopeFiles.filter((item) => !item.trashedAt);
      const trash = scopeFiles.filter((item) => !!item.trashedAt);

      setFilesList(files);
      setTrashedFiles(trash);
      setFileMetaMap(
        files.reduce<Record<string, typeof files[number]>>((acc, file) => {
          acc[file.id] = file;
          return acc;
        }, {}),
      );
      saveVersionRef.current = files.reduce<Record<string, number>>(
        (acc, file) => {
          acc[file.id] = file.version;
          return acc;
        },
        {},
      );
    } catch {
      setFilesPanelError("Failed to load files");
    }
  }, [
    currentScope,
    currentTeamId,
    isAuthenticated,
    setCurrentFileId,
    setFileMetaMap,
    setFileSyncState,
    setFilesList,
    setFilesPanelError,
    setTrashedFiles,
    trashSourceScope,
  ]);

  const openFile = useCallback(
    async (fileId: string) => {
      if (!excalidrawAPI) {
        return;
      }

      setFilesPanelError("");
      setCurrentFileId(fileId);

      const local = await MyFilesLocalStore.getLocalFile(fileId);
      if (local) {
        applyPersonalFileScene(local.scene);
        saveVersionRef.current[fileId] = local.version;
        setFileSyncState(local.dirty ? "dirty" : "synced");
      } else {
        setFileSyncState("idle");
      }

      try {
        const remote = await filesApi.getFile(fileId);
        saveVersionRef.current[fileId] = remote.version;

        await MyFilesLocalStore.setLocalFile({
          fileId,
          version: remote.version,
          scene: remote.scene,
          dirty: false,
          updatedAt: Date.now(),
        });

        if (!local || remote.version > local.version) {
          applyPersonalFileScene(remote.scene);
        }

        setFilesList((prev) =>
          prev
            .map((file) => (file.id === remote.id ? remote : file))
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            ),
        );
        setFileMetaMap((prev) => ({
          ...prev,
          [remote.id]: remote,
        }));
        setFileSyncState("synced");
      } catch {
        if (!local) {
          setFilesPanelError("Failed to open file");
        }
      }
    },
    [
      applyPersonalFileScene,
      excalidrawAPI,
      setCurrentFileId,
      setFileMetaMap,
      setFileSyncState,
      setFilesList,
      setFilesPanelError,
    ],
  );

  const createFile = useCallback(async () => {
    if (!isAuthenticated || !excalidrawAPI) {
      return;
    }

    setFilesPanelError("");
    try {
      const scene = getEmptyFileScene();
      const isTeamScope = currentScope === "team" && !!currentTeamId;
      const created = await filesApi.createPersonalFile({
        title: "Untitled",
        scope: isTeamScope ? "team" : "personal",
        teamId: isTeamScope ? currentTeamId : null,
        scene,
      });

      await MyFilesLocalStore.setLocalFile({
        fileId: created.id,
        version: created.version,
        scene: created.scene,
        dirty: false,
        updatedAt: Date.now(),
      });

      saveVersionRef.current[created.id] = created.version;
      setFilesList((prev) => [
        created,
        ...prev.filter((file) => file.id !== created.id),
      ]);
      setFileMetaMap((prev) => ({
        ...prev,
        [created.id]: created,
      }));
      setCurrentFileId(created.id);
      applyPersonalFileScene(created.scene);
      setFileSyncState("synced");
      await loadScopedFiles();
    } catch {
      setFilesPanelError("Failed to create file");
    }
  }, [
    applyPersonalFileScene,
    currentScope,
    currentTeamId,
    excalidrawAPI,
    isAuthenticated,
    loadScopedFiles,
    setCurrentFileId,
    setFileMetaMap,
    setFileSyncState,
    setFilesList,
    setFilesPanelError,
  ]);

  const saveCurrentFileDebounced = useRef(
    debounce(
      async (opts: {
        fileId: string;
        scene: ReturnType<typeof serializeSceneFromExcalidraw>;
        title?: string;
      }) => {
        const currentVersion = saveVersionRef.current[opts.fileId];
        if (!currentVersion) {
          return;
        }

        setFileSyncState("syncing");

        try {
          const saved = await filesApi.saveFile({
            fileId: opts.fileId,
            version: currentVersion,
            title: opts.title,
            scene: opts.scene,
          });

          saveVersionRef.current[opts.fileId] = saved.version;

          await MyFilesLocalStore.setLocalFile({
            fileId: opts.fileId,
            version: saved.version,
            scene: saved.scene,
            dirty: false,
            updatedAt: Date.now(),
          });

          setFilesList((prev) =>
            prev
              .map((file) => (file.id === saved.id ? saved : file))
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              ),
          );
          setFileMetaMap((prev) => ({
            ...prev,
            [saved.id]: saved,
          }));
          setFileSyncState("synced");
        } catch (error) {
          if (
            error instanceof FilesApiError &&
            error.code === "VERSION_CONFLICT"
          ) {
            setFileSyncState("conflict");
            setFilesPanelError(
              "Version conflict detected. Please reopen the file.",
            );
            return;
          }

          setFileSyncState("dirty");
        }
      },
      1200,
    ),
  ).current;

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!isAuthenticated) {
        return;
      }

      setFilesPanelError("");

      try {
        saveCurrentFileDebounced.flush();
        await filesApi.deleteFile(fileId);
        await MyFilesLocalStore.deleteLocalFile(fileId);

        delete saveVersionRef.current[fileId];

        const nextFiles = filesList.filter((file) => file.id !== fileId);
        setFilesList(nextFiles);
        setFileMetaMap((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });

        if (currentFileIdRef.current === fileId) {
          setCurrentFileId(null);

          if (nextFiles[0]) {
            await openFile(nextFiles[0].id);
          } else {
            applyPersonalFileScene(getEmptyFileScene());
            setFileSyncState("idle");
          }
        }

        await loadScopedFiles();
      } catch {
        setFilesPanelError("Failed to delete file");
      }
    },
    [
      applyPersonalFileScene,
      filesList,
      isAuthenticated,
      loadScopedFiles,
      openFile,
      saveCurrentFileDebounced,
      setCurrentFileId,
      setFileMetaMap,
      setFileSyncState,
      setFilesList,
      setFilesPanelError,
    ],
  );

  const restoreFileFromTrash = useCallback(
    async (fileId: string) => {
      try {
        await filesApi.restoreFile(fileId);
        await loadScopedFiles();
      } catch {
        setFilesPanelError("Failed to restore file");
      }
    },
    [loadScopedFiles, setFilesPanelError],
  );

  const permanentlyDeleteFile = useCallback(
    async (fileId: string) => {
      try {
        await filesApi.permanentlyDeleteFile(fileId);
        await MyFilesLocalStore.deleteLocalFile(fileId);
        delete saveVersionRef.current[fileId];
        await loadScopedFiles();
      } catch {
        setFilesPanelError("Failed to permanently delete file");
      }
    },
    [loadScopedFiles, setFilesPanelError],
  );

  const toggleFavorite = useCallback(
    async (fileId: string, isFavorite: boolean) => {
      try {
        await filesApi.setFavorite(fileId, isFavorite);
        await loadScopedFiles();
      } catch {
        setFilesPanelError("Failed to update favorite");
      }
    },
    [loadScopedFiles, setFilesPanelError],
  );

  const createTeam = useCallback(async () => {
    const teamName = window.prompt("Team name", "My Team")?.trim();
    if (!teamName) {
      return;
    }

    try {
      const created = await teamsApi.createTeam(teamName);
      setTeams((prev) => [created, ...prev]);
      setCurrentScope("team");
      setCurrentTeamId(created.id);
      setTrashSourceScope("team");
    } catch {
      setTeamsPanelError("Failed to create team");
    }
  }, [
    setCurrentScope,
    setCurrentTeamId,
    setTeams,
    setTeamsPanelError,
    setTrashSourceScope,
  ]);

  const loadTeamMembers = useCallback(async () => {
    if (!currentTeamId) {
      return;
    }

    setIsTeamMembersLoading(true);
    try {
      const members = await teamsApi.listMembers(currentTeamId);
      setTeamMembersMap((prev) => ({
        ...prev,
        [currentTeamId]: members,
      }));
      setTeamsPanelError("");
    } catch {
      setTeamsPanelError("Failed to load team members");
    } finally {
      setIsTeamMembersLoading(false);
    }
  }, [currentTeamId, setTeamMembersMap, setTeamsPanelError]);

  const manageTeamMembers = useCallback(async () => {
    if (!currentTeamId) {
      return;
    }

    setIsTeamMembersDialogOpen(true);
    await loadTeamMembers();
  }, [currentTeamId, loadTeamMembers]);

  const addTeamMember = useCallback(
    async (input: { email: string; role: "owner" | "admin" | "member" }) => {
      if (!currentTeamId) {
        return;
      }

      try {
        await teamsApi.addMember({
          teamId: currentTeamId,
          email: input.email,
          role: input.role,
        });
        await loadTeamMembers();
      } catch {
        setTeamsPanelError("Failed to add team member");
      }
    },
    [currentTeamId, loadTeamMembers, setTeamsPanelError],
  );

  const updateTeamMemberRole = useCallback(
    async (input: { userId: string; role: "owner" | "admin" | "member" }) => {
      if (!currentTeamId) {
        return;
      }

      try {
        await teamsApi.updateMemberRole({
          teamId: currentTeamId,
          userId: input.userId,
          role: input.role,
        });
        await loadTeamMembers();
      } catch {
        setTeamsPanelError("Failed to update member role");
      }
    },
    [currentTeamId, loadTeamMembers, setTeamsPanelError],
  );

  const removeTeamMember = useCallback(
    async (userId: string) => {
      if (!currentTeamId) {
        return;
      }

      try {
        await teamsApi.removeMember({
          teamId: currentTeamId,
          userId,
        });
        await loadTeamMembers();
      } catch {
        setTeamsPanelError("Failed to remove team member");
      }
    },
    [currentTeamId, loadTeamMembers, setTeamsPanelError],
  );

  const onScopeChange = useCallback(
    (scope: FilesScope) => {
      setCurrentScope(scope);
      setCurrentFileId(null);
      if (scope === "trash") {
        setFileSyncState("idle");
      } else {
        setTrashSourceScope(scope);
      }
    },
    [setCurrentFileId, setCurrentScope, setFileSyncState, setTrashSourceScope],
  );

  const onSelectTeam = useCallback(
    (teamId: string) => {
      setCurrentScope("team");
      setCurrentTeamId(teamId);
      setCurrentFileId(null);
      setTrashSourceScope("team");
    },
    [setCurrentFileId, setCurrentScope, setCurrentTeamId, setTrashSourceScope],
  );

  useHandleLibrary({
    excalidrawAPI,
    adapter: LibraryIndexedDBAdapter,
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (authStatus !== "unknown") {
      return;
    }

    authApi
      .getCurrentUser()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          setAuthStatus("authenticated");
        } else {
          setCurrentUser(null);
          setAuthStatus("guest");
        }
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthStatus("guest");
      });
  }, [authStatus, setAuthStatus, setCurrentUser]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadScopedFiles();
  }, [loadScopedFiles]);

  useEffect(() => {
    if (
      !excalidrawAPI ||
      !isAuthenticated ||
      currentScope === "trash" ||
      currentFileId ||
      !filesList.length
    ) {
      return;
    }

    openFile(filesList[0].id);
  }, [
    currentFileId,
    currentScope,
    excalidrawAPI,
    filesList,
    isAuthenticated,
    openFile,
  ]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !excalidrawAPI ||
      filesList.length ||
      currentScope !== "personal"
    ) {
      return;
    }

    createFile();
  }, [
    createFile,
    currentScope,
    excalidrawAPI,
    filesList.length,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (isDevEnv()) {
      const debugState = loadSavedDebugState();

      if (debugState.enabled && !window.visualDebug) {
        window.visualDebug = {
          data: [],
        };
      } else {
        delete window.visualDebug;
      }
      forceRefresh((prev) => !prev);
    }
  }, [excalidrawAPI]);

  useEffect(() => {
    if (!excalidrawAPI || (!isCollabDisabled && !collabAPI)) {
      return;
    }

    const loadImages = (
      data: ResolutionType<typeof initializeScene>,
      isInitialLoad = false,
    ) => {
      if (!data.scene) {
        return;
      }
      if (collabAPI?.isCollaborating()) {
        if (data.scene.elements) {
          collabAPI
            .fetchImageFilesFromFirebase({
              elements: data.scene.elements,
              forceFetchFiles: true,
            })
            .then(({ loadedFiles, erroredFiles }) => {
              excalidrawAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                excalidrawAPI,
                erroredFiles,
                elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
              });
            });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, [] as FileId[]) || [];

        if (data.isExternalScene) {
          loadFilesFromFirebase(
            `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
            data.key,
            fileIds,
          ).then(({ loadedFiles, erroredFiles }) => {
            excalidrawAPI.addFiles(loadedFiles);
            updateStaleImageStatuses({
              excalidrawAPI,
              erroredFiles,
              elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
            });
          });
        } else if (isInitialLoad) {
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
          // on fresh load, clear unused files from IDB (from previous
          // session)
          LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
        }
      }
    };

    initializeScene({ collabAPI, excalidrawAPI }).then(async (data) => {
      loadImages(data, /* isInitialLoad */ true);
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

    const onHashChange = async (event: HashChangeEvent) => {
      event.preventDefault();
      const libraryUrlTokens = parseLibraryTokensFromUrl();
      if (!libraryUrlTokens) {
        if (
          collabAPI?.isCollaborating() &&
          !isCollaborationLink(window.location.href)
        ) {
          collabAPI.stopCollaboration(false);
        }
        excalidrawAPI.updateScene({ appState: { isLoading: true } });

        initializeScene({ collabAPI, excalidrawAPI }).then((data) => {
          loadImages(data);
          if (data.scene) {
            excalidrawAPI.updateScene({
              elements: restoreElements(data.scene.elements, null, {
                repairBindings: true,
              }),
              appState: restoreAppState(data.scene.appState, null),
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        });
      }
    };

    const syncData = debounce(() => {
      if (isTestEnv()) {
        return;
      }
      if (
        !document.hidden &&
        ((collabAPI && !collabAPI.isCollaborating()) || isCollabDisabled)
      ) {
        // don't sync if local state is newer or identical to browser state
        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
          const localDataState = importFromLocalStorage();
          const username = importUsernameFromLocalStorage();
          setLangCode(getPreferredLanguage());
          excalidrawAPI.updateScene({
            ...localDataState,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          LibraryIndexedDBAdapter.load().then((data) => {
            if (data) {
              excalidrawAPI.updateLibrary({
                libraryItems: data.libraryItems,
              });
            }
          });
          collabAPI?.setUsername(username || "");
        }

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
          const currFiles = excalidrawAPI.getFiles();
          const fileIds =
            elements?.reduce((acc, element) => {
              if (
                isInitializedImageElement(element) &&
                // only load and update images that aren't already loaded
                !currFiles[element.fileId]
              ) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => {
      LocalData.flushSave();
    };

    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) {
        LocalData.flushSave();
      }
      if (
        event.type === EVENT.VISIBILITY_CHANGE ||
        event.type === EVENT.FOCUS
      ) {
        syncData();
      }
    };

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(
        EVENT.VISIBILITY_CHANGE,
        visibilityChange,
        false,
      );
    };
  }, [isCollabDisabled, collabAPI, excalidrawAPI, setLangCode]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();

      if (
        excalidrawAPI &&
        LocalData.fileStorage.shouldPreventUnload(
          excalidrawAPI.getSceneElements(),
        )
      ) {
        if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
          preventUnload(event);
        } else {
          console.warn(
            "preventing unload disabled (VITE_APP_DISABLE_PREVENT_UNLOAD)",
          );
        }
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [excalidrawAPI]);

  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.syncElements(elements);
    }

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;

          const elements = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (
                LocalData.fileStorage.shouldUpdateImageElementStatus(element)
              ) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) {
                  didChange = true;
                }
                return newElement;
              }
              return element;
            });

          if (didChange) {
            excalidrawAPI.updateScene({
              elements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    const activeFileId = currentFileIdRef.current;
    if (
      excalidrawAPI &&
      activeFileId &&
      isAuthenticated &&
      !isApplyingPersonalSceneRef.current
    ) {
      const serializedScene = serializeSceneFromExcalidraw(excalidrawAPI);
      setFileSyncState("dirty");

      MyFilesLocalStore.setLocalFile({
        fileId: activeFileId,
        version: saveVersionRef.current[activeFileId] || 1,
        scene: serializedScene,
        dirty: true,
        updatedAt: Date.now(),
      }).catch(() => {
        // ignore local caching errors
      });

      saveCurrentFileDebounced({
        fileId: activeFileId,
        scene: serializedScene,
      });
    }

    // Render the debug scene if the debug canvas is available
    if (debugCanvasRef.current && excalidrawAPI) {
      debugRenderer(
        debugCanvasRef.current,
        appState,
        elements,
        window.devicePixelRatio,
      );
    }
  };

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(
    null,
  );

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (url) {
        setLatestShareableLink(url);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
        throw new Error(error.message);
      }
    }
  };

  const renderCustomStats = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: UIAppState,
  ) => {
    return (
      <CustomStats
        setToast={(message) => excalidrawAPI!.setToast({ message })}
        appState={appState}
        elements={elements}
      />
    );
  };

  const isOffline = useAtomValue(isOfflineAtom);

  const localStorageQuotaExceeded = useAtomValue(localStorageQuotaExceededAtom);

  const onCollabDialogOpen = useCallback(
    () => setShareDialogState({ isOpen: true, type: "collaborationOnly" }),
    [setShareDialogState],
  );

  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  const ExcalidrawPlusCommand = {
    label: "Excalidraw+",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: <div style={{ width: 14 }}>{ExcalLogo}</div>,
    keywords: ["plus", "cloud", "server"],
    perform: () => {
      window.open(
        `${
          import.meta.env.VITE_APP_PLUS_LP
        }/plus?utm_source=excalidraw&utm_medium=app&utm_content=command_palette`,
        "_blank",
      );
    },
  };
  const ExcalidrawPlusAppCommand = {
    label: isAuthenticated ? "Go to Excalidraw+" : "Sign up",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: <div style={{ width: 14 }}>{ExcalLogo}</div>,
    keywords: [
      "excalidraw",
      "plus",
      "cloud",
      "server",
      "signin",
      "login",
      "signup",
    ],
    perform: () => {
      if (!isAuthenticated) {
        setIsAuthDialogOpen(true);
        return;
      }

      window.open(
        `${
          import.meta.env.VITE_APP_PLUS_APP
        }?utm_source=excalidraw&utm_medium=app&utm_content=command_palette`,
        "_blank",
      );
    },
  };

  return (
    <div
      style={{ height: "100%" }}
      className={clsx("excalidraw-app", {
        "is-collaborating": isCollaborating,
      })}
    >
      <Excalidraw
        excalidrawAPI={excalidrawRefCallback}
        onChange={onChange}
        initialData={initialStatePromiseRef.current.promise}
        isCollaborating={isCollaborating}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {
              onExportToBackend,
              renderCustomUI: excalidrawAPI
                ? (elements, appState, files) => {
                    return (
                      <ExportToExcalidrawPlus
                        elements={elements}
                        appState={appState}
                        files={files}
                        name={excalidrawAPI.getName()}
                        onError={(error) => {
                          excalidrawAPI?.updateScene({
                            appState: {
                              errorMessage: error.message,
                            },
                          });
                        }}
                        onSuccess={() => {
                          excalidrawAPI.updateScene({
                            appState: { openDialog: null },
                          });
                        }}
                      />
                    );
                  }
                : undefined,
            },
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        renderTopRightUI={(isMobile) => {
          if (isMobile || !collabAPI || isCollabDisabled) {
            return null;
          }

          return (
            <div className="excalidraw-ui-top-right">
              {excalidrawAPI?.getEditorInterface().formFactor === "desktop" && (
                <ExcalidrawPlusPromoBanner isSignedIn={isAuthenticated} />
              )}

              {collabError.message && <CollabError collabError={collabError} />}
              <LiveCollaborationTrigger
                isCollaborating={isCollaborating}
                onSelect={() =>
                  setShareDialogState({ isOpen: true, type: "share" })
                }
                editorInterface={editorInterface}
              />
            </div>
          );
        }}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            excalidrawAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        <AppMainMenu
          onCollabDialogOpen={onCollabDialogOpen}
          isCollaborating={isCollaborating}
          isCollabEnabled={!isCollabDisabled}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
          refresh={() => forceRefresh((prev) => !prev)}
          isSignedIn={isAuthenticated}
          onAuthClick={() => {
            if (isAuthenticated) {
              window.open(
                `${
                  import.meta.env.VITE_APP_PLUS_APP
                }?utm_source=signin&utm_medium=app&utm_content=hamburger`,
                "_blank",
              );
              return;
            }
            setIsAuthDialogOpen(true);
          }}
        />
        <AppWelcomeScreen
          onCollabDialogOpen={onCollabDialogOpen}
          isCollabEnabled={!isCollabDisabled}
          isSignedIn={isAuthenticated}
        />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
          {excalidrawAPI && (
            <OverwriteConfirmDialog.Action
              title={t("overwriteConfirm.action.excalidrawPlus.title")}
              actionLabel={t("overwriteConfirm.action.excalidrawPlus.button")}
              onClick={() => {
                exportToExcalidrawPlus(
                  excalidrawAPI.getSceneElements(),
                  excalidrawAPI.getAppState(),
                  excalidrawAPI.getFiles(),
                  excalidrawAPI.getName(),
                );
              }}
            >
              {t("overwriteConfirm.action.excalidrawPlus.description")}
            </OverwriteConfirmDialog.Action>
          )}
        </OverwriteConfirmDialog>
        <AppFooter
          onChange={() => excalidrawAPI?.refresh()}
          isSignedIn={isAuthenticated}
        />
        {excalidrawAPI && <AIComponents excalidrawAPI={excalidrawAPI} />}

        <TTDDialogTrigger />
        {isCollaborating && isOffline && (
          <div className="alertalert--warning">
            {t("alerts.collabOfflineWarning")}
          </div>
        )}
        {localStorageQuotaExceeded && (
          <div className="alert alert--danger">
            {t("alerts.localStorageQuotaExceeded")}
          </div>
        )}
        {latestShareableLink && (
          <ShareableLinkDialog
            link={latestShareableLink}
            onCloseRequest={() => setLatestShareableLink(null)}
            setErrorMessage={setErrorMessage}
          />
        )}
        {excalidrawAPI && !isCollabDisabled && (
          <Collab excalidrawAPI={excalidrawAPI} />
        )}

        <ShareDialog
          collabAPI={collabAPI}
          onExportToBackend={async () => {
            if (excalidrawAPI) {
              try {
                await onExportToBackend(
                  excalidrawAPI.getSceneElements(),
                  excalidrawAPI.getAppState(),
                  excalidrawAPI.getFiles(),
                );
              } catch (error: any) {
                setErrorMessage(error.message);
              }
            }
          }}
        />

        <AppSidebar
          files={filesList}
          trashedFiles={trashedFiles}
          teams={teams}
          currentFileId={currentFileId}
          currentScope={currentScope}
          currentTeamId={currentTeamId}
          isLoading={authStatus === "unknown"}
          isAuthenticated={isAuthenticated}
          syncState={fileSyncState}
          errorMessage={filesPanelError || teamsPanelError}
          onCreateFile={createFile}
          onOpenFile={openFile}
          onDeleteFile={deleteFile}
          onRestoreFile={restoreFileFromTrash}
          onPermanentDeleteFile={permanentlyDeleteFile}
          onToggleFavorite={toggleFavorite}
          onScopeChange={onScopeChange}
          onSelectTeam={onSelectTeam}
          onCreateTeam={createTeam}
          onManageTeamMembers={manageTeamMembers}
        />

        <AuthDialog
          isOpen={isAuthDialogOpen}
          onClose={() => setIsAuthDialogOpen(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            setAuthStatus("authenticated");
            loadTeams();
            loadScopedFiles();
          }}
        />

        <TeamMembersDialog
          isOpen={isTeamMembersDialogOpen}
          teamName={
            teams.find((team) => team.id === currentTeamId)?.name || "Team"
          }
          members={currentTeamId ? teamMembersMap[currentTeamId] || [] : []}
          isLoading={isTeamMembersLoading}
          errorMessage={teamsPanelError}
          currentUserId={currentUser?.id || null}
          onClose={() => setIsTeamMembersDialogOpen(false)}
          onRefresh={loadTeamMembers}
          onAddMember={addTeamMember}
          onUpdateMemberRole={updateTeamMemberRole}
          onRemoveMember={removeTeamMember}
        />

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: t("labels.liveCollaboration"),
              category: DEFAULT_CATEGORIES.app,
              keywords: [
                "team",
                "multiplayer",
                "share",
                "public",
                "session",
                "invite",
              ],
              icon: usersIcon,
              perform: () => {
                setShareDialogState({
                  isOpen: true,
                  type: "collaborationOnly",
                });
              },
            },
            {
              label: t("roomDialog.button_stopSession"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!collabAPI?.isCollaborating(),
              keywords: [
                "stop",
                "session",
                "end",
                "leave",
                "close",
                "exit",
                "collaboration",
              ],
              perform: () => {
                if (collabAPI) {
                  collabAPI.stopCollaboration();
                  if (!collabAPI.isCollaborating()) {
                    setShareDialogState({ isOpen: false });
                  }
                }
              },
            },
            {
              label: t("labels.share"),
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              icon: share,
              keywords: [
                "link",
                "shareable",
                "readonly",
                "export",
                "publish",
                "snapshot",
                "url",
                "collaborate",
                "invite",
              ],
              perform: async () => {
                setShareDialogState({ isOpen: true, type: "share" });
              },
            },
            {
              label: "GitHub",
              icon: GithubIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: [
                "issues",
                "bugs",
                "requests",
                "report",
                "features",
                "social",
                "community",
              ],
              perform: () => {
                window.open(
                  "https://github.com/excalidraw/excalidraw",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            {
              label: t("labels.followUs"),
              icon: XBrandIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["twitter", "contact", "social", "community"],
              perform: () => {
                window.open(
                  "https://x.com/excalidraw",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            {
              label: t("labels.discordChat"),
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              icon: DiscordIcon,
              keywords: [
                "chat",
                "talk",
                "contact",
                "bugs",
                "requests",
                "report",
                "feedback",
                "suggestions",
                "social",
                "community",
              ],
              perform: () => {
                window.open(
                  "https://discord.gg/UexuTaE",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            {
              label: "YouTube",
              icon: youtubeIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["features", "tutorials", "howto", "help", "community"],
              perform: () => {
                window.open(
                  "https://youtube.com/@excalidraw",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            ...(isAuthenticated
              ? [
                  {
                    ...ExcalidrawPlusAppCommand,
                    label: "Sign in / Go to Excalidraw+",
                  },
                ]
              : [ExcalidrawPlusCommand, ExcalidrawPlusAppCommand]),

            {
              label: t("overwriteConfirm.action.excalidrawPlus.button"),
              category: DEFAULT_CATEGORIES.export,
              icon: exportToPlus,
              predicate: true,
              keywords: ["plus", "export", "save", "backup"],
              perform: () => {
                if (excalidrawAPI) {
                  exportToExcalidrawPlus(
                    excalidrawAPI.getSceneElements(),
                    excalidrawAPI.getAppState(),
                    excalidrawAPI.getFiles(),
                    excalidrawAPI.getName(),
                  );
                }
              },
            },
            {
              ...CommandPalette.defaultItems.toggleTheme,
              perform: () => {
                setAppTheme(
                  editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
                );
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
        {isVisualDebuggerEnabled() && excalidrawAPI && (
          <DebugCanvas
            appState={excalidrawAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Excalidraw>
    </div>
  );
};

const ExcalidrawApp = () => {
  const isCloudExportWindow =
    window.location.pathname === "/excalidraw-plus-export";
  if (isCloudExportWindow) {
    return <ExcalidrawPlusIframeExport />;
  }

  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <ExcalidrawWrapper />
      </Provider>
    </TopErrorBoundary>
  );
};

export default ExcalidrawApp;
