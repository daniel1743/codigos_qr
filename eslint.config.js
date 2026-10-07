import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `_ui_reference` holds third-party Magic Patterns material kept for audit
  // only. It sits outside `src/`, is not in tsconfig, and nothing in the app
  // imports it — it must stay out of lint and build.
  //
  // `src/features/approved-chat-landing` is a byte-controlled exact port of the
  // approved Magic Patterns chat landing, and `.approved-chat-landing-reference`
  // is its read-only source of truth. Both keep the reference's original
  // formatting so their SHA-256 hashes stay equal to the approved artifact, so
  // they are excluded from lint/format as well — see
  // CRIPQER_APPROVED_CHAT_LANDING_PORT_CLOSE_OUT_V1.md.
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".nitro",
      "_ui_reference/**",
      "src/features/approved-chat-landing/**",
      ".approved-chat-landing-reference/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
);
