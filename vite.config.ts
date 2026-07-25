import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// build 2 รุ่นจากซอร์สชุดเดียว:
//   npm run build      -> รุ่นส่วนตัว (ARTYZ) ออกที่ dist/
//   npm run build:pro  -> รุ่นที่ขาย ออกที่ dist-pro/  (โหลด .env.pro)
export default defineConfig(({ mode }) => {
  const pro = mode === "pro";
  const name = "Gym Tracker";

  return {
    build: { outDir: pro ? "dist-pro" : "dist" },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
        manifest: {
          name,
          short_name: name,
          description: "ตารางฝึกเวท บันทึกเซต คำนวณเป้าน้ำหนัก วิเคราะห์สมดุลกล้ามเนื้ออัตโนมัติ",
          lang: "th",
          dir: "ltr",
          start_url: ".",
          scope: ".",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#04070D",
          background_color: "#04070D",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          navigateFallback: "index.html",
        },
      }),
    ],
  };
});
