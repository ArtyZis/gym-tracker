import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { appTitle } from "./lib/edition";
import "./index.css";

// index.html ใช้ร่วมกันทั้งสองรุ่น — ตั้งชื่อแท็บตามรุ่นตรงนี้ ไม่งั้นเปิดพร้อมกันแล้วแยกไม่ออก
// ตอนนี้ยังไม่รู้ภาษาที่ผู้ใช้ตั้งไว้ (ยังไม่ได้อ่าน localStorage) จึงได้ไทยไปก่อน
// แล้ว App ตั้งซ้ำใน effect เมื่ออ่านค่าจริงแล้ว
document.title = appTitle();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
