import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Tests unitaires des helpers PURS (odds, quota, complétude des matchs…).
// On ne teste QUE des modules sans dépendance serveur (Prisma/Clerk/Wizebot) —
// d'où l'alias `@` vers la racine, identique au tsconfig.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
