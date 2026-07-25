// รุ่นของแอป — กำหนดตอน build ผ่าน VITE_EDITION (ดู .env.coach)
//
// personal = เว็บของ ARTYZ เอง (artytraining) — ไม่มีบัญชี ไม่มีรหัสปลดล็อก ไม่มีลิมิตใดๆ
//            โค้ดส่วนขาย/ล็อกไม่ถูกคอมไพล์เข้ามาเลย ไม่ใช่แค่ "ปิดไว้"
// coach    = รุ่นขายให้เทรนเนอร์ — ทะเบียนลูกเทรนหลายคน + ปลดล็อกด้วยรหัส
//
// ค่าเริ่มต้นคือ personal เสมอ: build เดิมของผู้ใช้จึงได้ผลลัพธ์เหมือนก่อนมีไฟล์นี้ทุกประการ
export type Edition = "personal" | "coach";

export const EDITION: Edition = import.meta.env.VITE_EDITION === "coach" ? "coach" : "personal";

export const isCoach = EDITION === "coach";

export const APP_NAME = isCoach ? "Gym Tracker Coach" : "Gym Tracker";
