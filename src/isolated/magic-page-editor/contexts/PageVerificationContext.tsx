import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type VerificationVariant = "none" | "standard" | "official-gold";

/**
 * Trusted verification variant for the rendered page.
 *
 * Defaults to "none" so the editor (where no provider is mounted) keeps the
 * exact current behaviour. Only the public Magic renderer supplies a real value
 * (from the server-side trusted read).
 */
const PageVerificationContext = createContext<VerificationVariant>("none");

export function PageVerificationProvider({
  variant,
  children,
}: {
  variant: VerificationVariant;
  children: ReactNode;
}) {
  return <PageVerificationContext.Provider value={variant}>{children}</PageVerificationContext.Provider>;
}

export function usePageVerification(): VerificationVariant {
  return useContext(PageVerificationContext);
}
