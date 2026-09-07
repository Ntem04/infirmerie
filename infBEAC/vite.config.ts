// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "BEAC Pharmacie Institutionnelle",
        short_name: "BEAC Pharma",
        description: "Gestion sécurisée des stocks et prescriptions médicales",
        theme_color: "#059669", // Ton vert médical
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // C'est ici que la magie du mode "Offline-First" opère
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ["gravity-dollop-sizably.ngrok-free.dev"],
    watch: {
      ignored: ["**/db.json"], // Le frontend ignorera toutes les modifications de la BDD
    },
  },
  preview: {
    allowedHosts: true,
  },
});
