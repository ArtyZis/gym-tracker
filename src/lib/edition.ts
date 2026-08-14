// รุ่นของแอป — กำหนดตอน build ผ่าน VITE_EDITION (ดู .env.pro)
//
// personal = เว็บส่วนตัวของ ARTYZ (artytraining) — เปิดทุกฟีเจอร์ ไม่มีช่วงทดลอง ไม่มีรหัส
//            โค้ดตรวจสิทธิ์ไม่ถูกคอมไพล์เข้ามาเลย ไม่ใช่แค่ "ปิดไว้"
// pro      = เว็บที่ขาย (artycoach) — ทดลองฟรี 30 วัน แล้วล็อกฟีเจอร์สมองโค้ช
//            บันทึกฝึก/ประวัติ/สตรีค/การ์ดสรุป ใช้ฟรีตลอดชีพเสมอ
//
// ค่าเริ่มต้นคือ personal เสมอ: build เดิมจึงได้ผลลัพธ์เหมือนก่อนมีไฟล์นี้ทุกประการ
import { t } from "./i18n";

export type Edition = "personal" | "pro";

export const EDITION: Edition = import.meta.env.VITE_EDITION === "pro" ? "pro" : "personal";

export const isPro = EDITION === "pro";

export const APP_NAME = "RANKFORGE";

// ชื่อแท็บ — ต่อท้ายด้วยรุ่นเฉพาะรุ่นที่ขาย เพื่อให้เปิดสองรุ่นพร้อมกันแล้วแยกออก
// (เดิมใช้ APP_NAME เฉยๆ ซึ่งเท่ากันทั้งสองรุ่น เลยไม่ได้แยกอะไรจริง)
//
// เป็นฟังก์ชันเพราะต้องอ่านภาษาหลัง setLang ทำงานแล้ว — ตอนโหลดโมดูลยังไม่รู้ว่าผู้ใช้ตั้งภาษาอะไร
// main.tsx ตั้งครั้งแรกด้วยค่าเริ่มต้น แล้ว App ตั้งซ้ำใน effect เมื่อรู้ค่าจริง
export const appTitle = (): string => `${APP_NAME}${isPro ? " PRO" : ""} — ${t("ตารางเวท ระบบแรงค์", "Lifting log with a rank system")}`;
