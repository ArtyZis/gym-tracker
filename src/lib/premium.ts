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

// วันเริ่มใช้ — ถ้ายังไม่มีให้ตั้งเป็นวันนี้ (ผู้ใช้เก่าที่มีข้อมูลอยู่แล้วก็ได้ 30 วันเต็มนับจากวันอัปเดต)
export function ensureStartedAt(d: Data): void {
  if (!d.settings.startedAt) d.settings.startedAt = new Date().toISOString();
}

export function trialDaysLeft(data: Data): number {
  const started = data.settings.startedAt;
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
