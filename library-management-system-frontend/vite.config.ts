import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,       // no sourcemap in production builds
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Function form handles every node_modules package automatically.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@radix-ui"))       return "radix";
          if (id.includes("react-router"))    return "router";
          if (id.includes("@tanstack"))       return "query";
          if (id.includes("lucide-react"))    return "icons";
          if (id.includes("framer-motion"))   return "motion";
          if (id.includes("formik") || id.includes("yup")) return "forms";
          if (id.includes("react-hot-toast")) return "toast";
          // react + react-dom go into vendor
          return "vendor";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
});
