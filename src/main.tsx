import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { APP_NAME } from "./lib/edition";
import "./index.css";

// index.html ใช้ร่วมกันทั้งสองรุ่น — ตั้งชื่อแท็บตามรุ่นตรงนี้ ไม่งั้นเปิดพร้อมกันแล้วแยกไม่ออก
document.title = APP_NAME;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
