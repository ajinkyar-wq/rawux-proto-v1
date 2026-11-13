import type { AIAction } from "./panels/ImagePanel";

export type ActionStatus = "idle" | "running" | "complete";

export type ActionStatuses = Record<AIAction, ActionStatus>;

export const INITIAL_ACTION_STATUSES: ActionStatuses = {
  cull: "idle",
  edit: "idle",
  retouch: "idle",
};

// Fake duration for the "running" spinner before flipping to complete.
export const ACTION_RUN_DURATION_MS = 1400;
