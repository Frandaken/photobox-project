import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // biar bisa diakses dari device lain di jaringan saat dev (mis. HP)
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
