// สีธีม (accent) — ผู้ใช้เลือกได้ในแท็บจัดการ, undefined = cyan (ค่าเดิมของแบรนด์)
// เก็บเป็น hex string ใน settings.accent แล้ว set ลง CSS var --acc ที่ระดับ :root
// ทำไมเก็บเป็น hex ตรงๆ ไม่ใช่ id: กันข้อมูลเก่าพัง — undefined ก็ยัง = cyan เสมอ
// ธีม SYSTEM — ม่วง monarch เป็นค่าเริ่มต้น (เดิมเป็นฟ้า #4fd8ff ซึ่งยังเลือกได้อยู่)
export const DEFAULT_ACCENT = "#8b6bff";

import { t } from "./i18n";

export interface AccentOption {
  color: string;
  /** ฟังก์ชันเพราะต้องอ่านภาษา ณ ตอนเรียก ไม่ใช่ตอนโหลดโมดูล */
  label: () => string;
  /** สตรีคสูงสุดที่ต้องเคยทำได้ถึงจะเลือกสีนี้ได้ · 0 = เปิดตั้งแต่แรก */
  unlockStreak: number;
}

// เรียงตามโทนที่เข้ากับพื้นดำอมน้ำเงินของธีม SYSTEM
//
// สีตั้งแต่ฟ้าขึ้นไปต้องปลดล็อกด้วยสตรีค — เป็นรางวัลของคนที่ฝึกต่อเนื่องจริง
// เลือกล็อก "สี" เพราะเป็นของประดับล้วน ไม่ใช่ของที่ต้องใช้ทำงาน
// (ล็อกของจำเป็นคนเลิกใช้ ล็อกของอวดคนอยากได้ — คนละผลลัพธ์กันคนละขั้ว)
export const ACCENTS: AccentOption[] = [
  { color: "#8b6bff", label: () => t("ม่วง", "Violet"), unlockStreak: 0 },
  { color: "#3f8dff", label: () => t("น้ำเงิน", "Blue"), unlockStreak: 0 },
  { color: "#4fd8ff", label: () => t("ฟ้า", "Cyan"), unlockStreak: 7 },
  { color: "#5fe6b0", label: () => t("เขียว", "Green"), unlockStreak: 20 },
  { color: "#ffb454", label: () => t("อำพัน", "Amber"), unlockStreak: 40 },
  { color: "#ff5c7a", label: () => t("แดง", "Red"), unlockStreak: 75 },
];

/**
 * เลือกสีนี้ได้ไหม — ใช้ "สตรีคสูงสุดที่เคยทำได้" ไม่ใช่สตรีคปัจจุบัน
 *
 * ถ้าใช้สตรีคปัจจุบัน ขาดวันเดียวสีที่อุตส่าห์ปลดได้จะหายไปเอง แล้วธีมทั้งแอป
 * เปลี่ยนกลางคันโดยผู้ใช้ไม่ได้สั่ง — เป็นการลงโทษที่ไม่มีใครยอมรับ
 * ปลดได้แล้วต้องอยู่ถาวร
 */
export const accentUnlocked = (opt: AccentOption, bestStreak: number, locked: boolean): boolean =>
  !locked || opt.unlockStreak === 0 || bestStreak >= opt.unlockStreak;

// รับค่าที่ปลอดภัยเสมอ — ค่าแปลก/undefined = cyan
export function resolveAccent(a?: string): string {
  return a && /^#[0-9a-fA-F]{6}$/.test(a) ? a : DEFAULT_ACCENT;
}
