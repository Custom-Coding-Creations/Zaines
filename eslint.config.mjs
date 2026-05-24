import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["src/app/api/**/*.{ts,tsx}", "src/lib/auth.ts", "src/lib/auth/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@auth/core", "@auth/core/*"],
              message:
                "Do not import from @auth/core in app routes/server auth entrypoints; use next-auth provider wrappers and local auth helpers.",
            },
            {
              group: ["next-auth/lib/*"],
              message:
                "Do not import internal next-auth/lib/* modules in runtime code. These imports are not deployment-safe on Vercel Turbopack.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
