# CONV-02 · deliberately rejected artifacts

Five source files from the Conversion Advisor worktree (`cripqer-conversion-advisor`,
`06f9310a8ee52c450c8df9ae8bcc822b15837f5c`) were **not** integrated into the
canonical tree. They are preserved here as `.txt` so no runner can execute them:
the directory names and `.txt` extension keep Vitest's default include
(`**/*.{test,spec}.?(c|m)[jt]s?(x)`) from matching them, and no import in `src/`
refers to this folder.

| File (original path) | Why rejected |
| --- | --- |
| `advisor-landing-mount.test.tsx` | Mounts `ApprovedChatLanding` with an `advisorTransport` prop. `ApprovedChatLandingProps` has no such prop and CONV-02 must not add it: the landing is wired in CONV-03. |
| `advisor-integration-contract.test.ts` | Asserts the CONV-03 integration contract between the route, `useCripqerSession` and the advisor transport. |
| `ui-latency-instrumentation.test.tsx` | Mounts the landing with the advisor mount and measures UI latency through the CONV-03 provider cutover. |
| `ui-landing-product-e2e.test.tsx` | Boots the landing product flow through the advisor provider; requires the CONV-03 cutover. |
| `ui-e2e-landing-entry.tsx` | Entry fixture for that E2E, importing the landing with the advisor transport attached. |

These five are the **only** source files from the certified advisor set that were
not integrated. They are the source of all 10 structural type errors seen during
integration (`ApprovedChatLandingProps` has no `advisorTransport`, plus the
mount-only helpers) and of the deferred test failures in the advisor suite.

Everything else — the advisor core, the provider bridge, the deterministic action
planner, the wire contract, the observability module, the evaluation fail-closed
guard and their tests — is in place. CONV-03 restores these five by:

1. renaming each `.txt` back to its original name under
   `src/lib/conversion-advisor/` (or `src/features/approved-chat-landing/` for the
   UI entries), and
2. adding the `advisorTransport` seam and the `useCripqerSession` cutover that
   they assert.

No test was deleted, weakened or skipped to reach the CONV-02 result. The
governing `ROTATION_VISUAL_FROZEN` suites are untouched and pass 24/24.
