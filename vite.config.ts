import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

// build 2 รุ่นจากซอร์สชุดเดียว:
//   npm run build      -> รุ่นส่วนตัว (ARTYZ) ออกที่ dist/
//   npm run build:pro  -> รุ่นที่ขาย ออกที่ dist-pro/  (โหลด .env.pro)
export default defineConfig(({ mode }) => {
  const pro = mode === "pro";
  // short_name คือชื่อใต้ไอคอนบนหน้าจอโฮม ซึ่งถูกตัดสั้นถ้ายาวเกิน ~12 ตัว
  // จึงต้องเป็นชื่อล้วน ส่วนคำอธิบายภาษาไทยไปอยู่ใน name เต็มแทน
  const name = "RANKFORGE — ตารางเวท ระบบแรงค์";
  const shortName = "RANKFORGE";

  return {
    // path แบบสัมพัทธ์ — เสิร์ฟได้ทั้งที่ราก (Netlify) และที่ path ย่อย (GitHub Pages: /ชื่อ-repo/)
    // ถ้าใช้ "/" แบบเดิม เปิดบน GitHub Pages จะจอขาวเพราะหา assets ไม่เจอ
    base: "./",
    build: { outDir: pro ? "dist-pro" : "dist" },
    // เวอร์ชันจาก package.json + วันที่ build — ใช้บอกว่าเครื่องนี้กำลังใช้ตัวไหนอยู่
    // สำคัญกับ PWA เพราะ Service Worker อาจค้างเวอร์ชันเก่าไว้โดยผู้ใช้ไม่รู้ตัว
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
        manifest: {
          name,
          short_name: shortName,
          description: "ตารางฝึกเวท บันทึกเซต คำนวณเป้าน้ำหนัก วัดแรงค์ความแข็งแรงเทียบน้ำหนักตัว",
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
          // บน GitHub Pages เราวางรุ่นส่วนตัวไว้ที่ /me/ ใต้รุ่นที่ขาย
          // SW ของรุ่นนอกมี scope ครอบ /me/ ด้วย ถ้าไม่กันไว้ navigateFallback
          // จะเสิร์ฟ index.html ของรุ่นนอกทับ = เปิด /me/ แล้วได้แอปผิดรุ่น
          navigateFallbackDenylist: [/\/me\//],
        },
      }),
    ],
  };
});
