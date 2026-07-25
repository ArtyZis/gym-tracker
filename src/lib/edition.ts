// รุ่นของแอป — กำหนดตอน build ผ่าน VITE_EDITION (ดู .env.pro)
//
// personal = เว็บส่วนตัวของ ARTYZ (artytraining) — เปิดทุกฟีเจอร์ ไม่มีช่วงทดลอง ไม่มีรหัส
//            โค้ดตรวจสิทธิ์ไม่ถูกคอมไพล์เข้ามาเลย ไม่ใช่แค่ "ปิดไว้"
// pro      = เว็บที่ขาย (artycoach) — ทดลองฟรี 30 วัน แล้วล็อกฟีเจอร์สมองโค้ช
//            บันทึกฝึก/ประวัติ/สตรีค/การ์ดสรุป ใช้ฟรีตลอดชีพเสมอ
//
// ค่าเริ่มต้นคือ personal เสมอ: build เดิมจึงได้ผลลัพธ์เหมือนก่อนมีไฟล์นี้ทุกประการ
export type Edition = "personal" | "pro";

export const EDITION: Edition = import.meta.env.VITE_EDITION === "pro" ? "pro" : "personal";

export const isPro = EDITION === "pro";

export const APP_NAME = "Gym Tracker";
