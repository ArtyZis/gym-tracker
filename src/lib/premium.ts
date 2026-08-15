// สิทธิ์ใช้ฟีเจอร์ "สมองโค้ช" — ทดลองฟรี 30 วัน แล้วต้องปลดล็อกด้วยรหัสจ่ายครั้งเดียว
//
// รุ่น personal (เว็บส่วนตัวของ ARTYZ): เปิดหมดตลอด ไม่มีการตรวจอะไรเลย
// รุ่น pro (เว็บที่ขาย): 30 วันแรกใช้ได้ครบ หลังจากนั้นตกกลับเป็นรุ่นฟรี
//
// สิ่งที่ "ไม่เคย" ล็อก แม้หมดช่วงทดลอง — บันทึกฝึก ประวัติ สตรีค จับเวลาพัก การ์ดสรุป
// เพราะล็อกข้อมูลผู้ใช้ = จับข้อมูลเขาเป็นตัวประกัน เสียชื่อมากกว่าได้เงิน
// และการ์ดสรุปคือช่องทางที่คนเอาไปแชร์ต่อ ปิดไปเท่ากับปิดการตลาดตัวเอง

import type { Data } from "./store";
import { isPro } from "./edition";
import { isUnlocked } from "./license";

export const TRIAL_DAYS = 30;

const DAY_MS = 86400000;

/**
 * เริ่มจับเวลาช่วงทดลอง — เรียกตอน **บันทึกเซตแรก** ไม่ใช่ตอนเปิดแอปครั้งแรก
 *
 * เดิมนับตั้งแต่เปิดแอป ซึ่งกินวันทดลองฟรีไปโดยที่ลูกค้ายังไม่ได้ใช้อะไรเลย:
 * คนโหลดมาดูตอนดึก เจอหน้าว่างเพราะยังไม่ได้สร้างตาราง ปิดไป กลับมาอีกทีตอน
 * เริ่มเข้ายิมจริงสามสัปดาห์ถัดมา — เหลือ 9 วัน แล้วของหมดอายุก่อนจะทันเห็นค่า
 * นับจากเซตแรกแปลว่า 30 วันนั้นเป็น 30 วันที่เขาได้ลองจริงเสมอ
 *
 * ไม่ตั้งย้อนหลังให้คนที่มีประวัติอยู่แล้ว — undefined = ยังไม่เริ่มนับ = ยังได้ 30 วันเต็ม
 * (กฎเหล็กข้อ 1: ฟิลด์ optional ต้องตีความ undefined เป็นค่าที่ไม่ทำร้ายผู้ใช้)
 */
export function startTrialIfNeeded(d: Data): void {
  if (!d.settings.startedAt) d.settings.startedAt = new Date().toISOString();
}

export function trialDaysLeft(data: Data): number {
  const started = data.settings.startedAt;
  // ยังไม่เคยบันทึกเซตเลย = ยังไม่เริ่มนับ ได้ครบ 30 วันรออยู่
  if (!started) return TRIAL_DAYS;
  const ms = Date.parse(started);
  if (!Number.isFinite(ms)) return TRIAL_DAYS;
  // เผื่อคนหมุนนาฬิกาเครื่องย้อนหลัง: ถือว่าเริ่มวันนี้ ไม่ให้ได้ทดลองเกิน 30 วัน
  const used = Math.floor((Date.now() - ms) / DAY_MS);
  return Math.max(0, TRIAL_DAYS - Math.max(0, used));
}

export const inTrial = (data: Data): boolean => trialDaysLeft(data) > 0;

// ใช้ฟีเจอร์สมองโค้ชได้ไหม — รุ่น personal จริงเสมอ (โค้ดตรวจถูก tree-shake ออกทั้งหมด)
export function isPremium(data: Data): boolean {
  if (!isPro) return true;
  return isUnlocked() || inTrial(data);
}

// ซื้อแล้วหรือยัง (แยกจาก isPremium เพราะช่วงทดลองยังไม่ได้ซื้อ)
export const isPaid = (): boolean => !isPro || isUnlocked();
