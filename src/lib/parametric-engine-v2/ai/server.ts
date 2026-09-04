import { createServerFn } from "@tanstack/react-start";
import { validateSupervisorInput } from "./validation";

export const fetchDeepSeekSupervisorReview = createServerFn({ method: "POST" })
  .validator(validateSupervisorInput)
  .handler(async ({ data }) => {
    if (import.meta.env.PROD)
      return { status: "unavailable" as const, evaluation: null, errorCode: "DISABLED" as const };
    const { superviseWithDeepSeek: supervise } = await import("./deepseek-provider");
    return supervise(data);
  });
