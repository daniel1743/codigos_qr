import type { SupervisorInput } from "./types";

export function validateSupervisorInput(value: unknown): SupervisorInput {
  if (!value || typeof value !== "object") throw new Error("Invalid supervisor input");
  const input = value as Partial<SupervisorInput>;
  if (!input.userIntent || !input.engineSummary || !Array.isArray(input.selectedMedia)) {
    throw new Error("Incomplete supervisor input");
  }
  return input as SupervisorInput;
}
