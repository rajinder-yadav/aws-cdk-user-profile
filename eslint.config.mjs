// @ts-check

import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  globalIgnores(["**/*.js", "**/*.d.ts", ".config/*", "dist/", "build/", "cdk.out"])
);
