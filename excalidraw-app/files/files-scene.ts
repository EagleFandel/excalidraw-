import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  restoreAppState,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";

import type {
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";

import type { FileScenePayload } from "./files-api";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object";
};

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

export const getEmptyFileScene = (): FileScenePayload => ({
  elements: [],
  appState: {},
  files: {},
});

export const serializeSceneFromExcalidraw = (
  excalidrawAPI: ExcalidrawImperativeAPI,
): FileScenePayload => {
  return {
    elements: excalidrawAPI
      .getSceneElementsIncludingDeleted()
      .map((element) => ({ ...element })),
    appState: {
      ...getDefaultAppState(),
      ...excalidrawAPI.getAppState(),
    },
    files: { ...excalidrawAPI.getFiles() },
  };
};

export const applyFileSceneToExcalidraw = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  scene: FileScenePayload,
) => {
  const elementsInput = isArray(scene.elements) ? scene.elements : [];
  const filesInput = isRecord(scene.files) ? scene.files : {};
  const appStateInput = isRecord(scene.appState) ? scene.appState : {};

  const restoredElements = restoreElements(
    elementsInput as OrderedExcalidrawElement[],
    null,
    {
      repairBindings: true,
    },
  );

  const restoredAppState = restoreAppState(appStateInput, null);

  excalidrawAPI.updateScene({
    elements: restoredElements,
    appState: restoredAppState,
  });

  excalidrawAPI.addFiles(Object.values(filesInput) as BinaryFileData[]);
};
