import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/ant-sim",
  resolve: {
    alias: {
      "@styles": "/src/styles",
      "@components": "/src/components",
      "@simulation": "/src/simulation",
      "@helpers": "/src/helpers",
      "@": "/src",
    },
  },
});
