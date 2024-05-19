import { defineConfig } from "vite";
import path from 'path';

export default defineConfig({
  base: "/OakEngine/",
  build: {
    target: "es2022",
  },
  esbuild: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  resolve: {
    alias: {
      "@projectConfig": path.resolve(__dirname, './src/config.project.json'),
    },
  },
});
