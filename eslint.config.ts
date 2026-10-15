import { fileURLToPath } from "node:url";
import path from "node:path";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettierConfig from "eslint-config-prettier";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  { ignores: ["**/dist/**", "**/node_modules/**", "**/build/**"] },

  // Reglas base para TODO el repo (TS)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Fija el root dir para que typescript-eslint no se confunda entre
  // los distintos tsconfig.json del monorepo (raíz, apps/web, apps/api)
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
      },
    },
  },

  // Reglas específicas para el frontend (React)
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-refresh/only-export-components": "warn",
    },
    settings: {
      react: { version: "detect" },
    },
  },

  // Reglas específicas para el backend
  {
    files: ["apps/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // Reglas generales de calidad, aplican a todo
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // SIEMPRE al final: desactiva reglas que chocan con Prettier
  prettierConfig,
];
