import type { FileScenePayload } from "./files-api";

type PendingSaveOp = {
  type: "save";
  fileId: string;
  version: number;
  title?: string;
  scene: FileScenePayload;
};

type PendingOp = PendingSaveOp;

const maxQueueSize = 100;

export const enqueuePendingOp = (queue: PendingOp[], op: PendingOp) => {
  const nextQueue = queue.filter((item) => {
    return !(item.type === "save" && item.fileId === op.fileId);
  });

  nextQueue.push(op);
  if (nextQueue.length > maxQueueSize) {
    return nextQueue.slice(nextQueue.length - maxQueueSize);
  }

  return nextQueue;
};

export const dequeuePendingOp = (queue: PendingOp[]) => {
  if (!queue.length) {
    return {
      op: null,
      queue,
    };
  }

  const [head, ...rest] = queue;

  return {
    op: head,
    queue: rest,
  };
};

export type { PendingOp, PendingSaveOp };

