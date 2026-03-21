import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // This points to your Neon DB URL in your .env.local
    url: process.env.DATABASE_URL,
  },
});
