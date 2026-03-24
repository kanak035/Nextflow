import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "@prisma/config";

// Explicitly load .env.local BEFORE Prisma reads the config
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
