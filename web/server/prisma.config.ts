import "./lib/env.js";
import { defineConfig } from "prisma/config";

console.log(process.env.DATABASE_URL);

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
