import type { FileScenePayload } from "./files-api";

type PendingSaveOp = {
  type: "save";
  fileId: string;
  version: number;
  title?: string;
  scene: FileScenePayload;
  attempt: number;
  nextRetryAt: number;
  lastErrorCode?: string;
};

type PendingOp = PendingSaveOp;

const maxQueueSize = 100;
const maxRetryDelayMs = 60_000;
const retryJitterMs = 500;

const normalizePendingOp = (op: PendingOp): PendingOp => {
  return {
    ...op,
    attempt: typeof op.attempt === "number" ? op.attempt : 0,
    nextRetryAt:
      typeof op.nextRetryAt === "number" ? op.nextRetryAt : Date.now(),
    lastErrorCode: op.lastErrorCode,
  };
};

const computeRetryDelayMs = (attempt: number) => {
  const exponential = 2 ** Math.max(1, attempt) * 1000;
  const jitter = Math.floor(Math.random() * (retryJitterMs + 1));
  return Math.min(maxRetryDelayMs, exponential + jitter);
};

export const enqueuePendingOp = (queue: PendingOp[], op: PendingOp) => {
  const normalizedOp = normalizePendingOp(op);
  const nextQueue = queue.filter((item) => {
    return !(item.type === "save" && item.fileId === normalizedOp.fileId);
  });

  nextQueue.push(normalizedOp);
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

export const dequeueReadyPendingOp = (queue: PendingOp[], now = Date.now()) => {
  if (!queue.length) {
    return {
      op: null,
      queue,
      nextRetryAt: null as number | null,
    };
  }

  const nextRetryAt = queue.reduce<number | null>((current, item) => {
    if (current === null) {
      return item.nextRetryAt;
    }
    return Math.min(current, item.nextRetryAt);
  }, null);

  const readyIndex = queue.findIndex((item) => item.nextRetryAt <= now);
  if (readyIndex === -1) {
    return {
      op: null,
      queue,
      nextRetryAt,
    };
  }

  const op = queue[readyIndex];
  const rest = queue.filter((_item, index) => index !== readyIndex);

  return {
    op,
    queue: rest,
    nextRetryAt,
  };
};

export const markPendingOpForRetry = (
  op: PendingOp,
  opts?: { errorCode?: string },
): PendingOp => {
  const nextAttempt = op.attempt + 1;
  const retryAfter = computeRetryDelayMs(nextAttempt);

  return {
    ...op,
    attempt: nextAttempt,
    nextRetryAt: Date.now() + retryAfter,
    lastErrorCode: opts?.errorCode,
  };
};

export type { PendingOp, PendingSaveOp };
