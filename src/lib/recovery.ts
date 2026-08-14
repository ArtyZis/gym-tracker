// น้ำหนักตัว · โภชนาการ · การนอน — ปัจจัยนอกยิมที่ตัดสินผลลัพธ์มากกว่าตัวโปรแกรมเอง
//
// หลักการเดียวที่ยึดทั้งไฟล์: **ห้ามสรุปจากข้อมูลน้อยเกินไป**
// น้ำหนักตัวแกว่งวันละเป็นกิโลจากน้ำ/อาหารในท้อง/เกลือ ถ้าดู 2-3 วันแล้วสรุปว่า
// "ขึ้นเร็วไป ลดแคล" ผู้ใช้จะลดแคลทั้งที่จริงๆ ยังไม่ได้ขึ้นเลย = พังกว่าไม่แนะนำอะไรเลย

import type { Data, DayKey } from "./store";
import { DAYS, todayStr } from "./store";
import { t } from "./i18n";

export const MIN_DAYS_FOR_TREND = 10; // ต่ำกว่านี้ห้ามสรุปแนวโน้มน้ำหนัก
const MS_DAY = 86400000;

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / MS_DAY);

// ── น้ำหนักตัว ──

export interface WeightTrend {
  avg7: number | null; // ค่าเฉลี่ยเคลื่อนที่ 7 วันล่าสุด
  prevAvg7: number | null; // ค่าเฉลี่ย 7 วันของสัปดาห์ก่อนหน้า
  kgPerWeek: number | null; // อัตราเปลี่ยนแปลงจริง
  days: number; // จำนวนวันที่มีข้อมูล
  enough: boolean; // ข้อมูลพอจะสรุปไหม
}

function avgInRange(data: Data, fromDaysAgo: number, toDaysAgo: number): number | null {
  const today = todayStr();
  const picked = data.bodyweight.filter((e) => {
    const d = dayDiff(e.date, today); // 0 = วันนี้, 1 = เมื่อวาน (dayDiff คืนค่าบวกอยู่แล้วเมื่อ a เก่ากว่า b)
    return d >= toDaysAgo && d <= fromDaysAgo;
  });
  if (!picked.length) return null;
  return picked.reduce((a, e) => a + e.kg, 0) / picked.length;
}

export function weightTrend(data: Data): WeightTrend {
  const days = new Set(data.bodyweight.map((e) => e.date)).size;
  const avg7 = avgInRange(data, 6, 0);
  const prevAvg7 = avgInRange(data, 13, 7);
  const kgPerWeek = avg7 != null && prevAvg7 != null ? +(avg7 - prevAvg7).toFixed(2) : null;
  return { avg7, prevAvg7, kgPerWeek, days, enough: days >= MIN_DAYS_FOR_TREND };
}

// อัตราเป้าหมาย (กก./สัปดาห์) — lean bulk มาตรฐานคือ 0.25-0.4
export const targetGainRange = (data: Data): [number, number] => {
  const g = data.profile?.gainKgPerWeek;
  return g ? [g * 0.75, g * 1.25] : [0.25, 0.4];
};

export interface WeightAdvice {
  tone: "ok" | "fast" | "slow" | "wait";
  msg: string;
}

export function weightAdvice(data: Data): WeightAdvice {
  const tr = weightTrend(data);
  if (!tr.enough)
    return {
      tone: "wait",
      msg: t(
        `ชั่งมา ${tr.days} วัน — ต้องมีอย่างน้อย ${MIN_DAYS_FOR_TREND} วันถึงจะดูแนวโน้มได้ (น้ำหนักแกว่งวันละเป็นกิโลจากน้ำในตัว)`,
        `${tr.days} days logged — needs at least ${MIN_DAYS_FOR_TREND} to read a trend (water weight swings a kilo a day on its own)`,
      ),
    };
  if (tr.kgPerWeek == null)
    return { tone: "wait", msg: t("ยังเทียบสัปดาห์ต่อสัปดาห์ไม่ได้ — ชั่งต่ออีกสักหน่อย", "Not enough to compare week to week yet — keep weighing in") };

  const [lo, hi] = targetGainRange(data);
  if (tr.kgPerWeek > hi)
    return {
      tone: "fast",
      msg: t(
        `ขึ้น ${tr.kgPerWeek} กก./สัปดาห์ เร็วกว่าเป้า ${lo}-${hi} — ไขมันอาจเพิ่มด้วย ลองลด 150 kcal`,
        `Up ${tr.kgPerWeek} kg/week, faster than the ${lo}-${hi} target — some of that is likely fat. Try cutting 150 kcal.`,
      ),
    };
  if (tr.kgPerWeek < lo)
    return {
      tone: "slow",
      msg: t(
        `ขึ้น ${tr.kgPerWeek} กก./สัปดาห์ ช้ากว่าเป้า ${lo}-${hi} — ลองเพิ่ม 200 kcal`,
        `Up ${tr.kgPerWeek} kg/week, slower than the ${lo}-${hi} target — try adding 200 kcal.`,
      ),
    };
  return {
    tone: "ok",
    msg: t(`ขึ้น ${tr.kgPerWeek} กก./สัปดาห์ อยู่ในเป้า ${lo}-${hi} พอดี`, `Up ${tr.kgPerWeek} kg/week — right in the ${lo}-${hi} target.`),
  };
}

// ── โภชนาการ ──

// ประเมิน TDEE จากผลสแกนล่าสุด (Katch-McArdle ใช้มวลไร้ไขมัน แม่นกว่าสูตรที่ใช้แค่น้ำหนักรวม)
// คืน null ถ้าไม่มีข้อมูลพอ — ห้ามเดา
export function estimateTDEE(data: Data, activityFactor = 1.55): number | null {
  const scan = [...data.bodyScans].sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (!scan?.weightKg) return null;
  const lean = scan.fatPct != null ? scan.weightKg * (1 - scan.fatPct / 100) : scan.muscleKg ? scan.weightKg * 0.85 : null;
  if (lean == null) return null;
  const bmr = 370 + 21.6 * lean;
  return Math.round(bmr * activityFactor);
}

export const nutritionHit = (data: Data, date = todayStr()): boolean | null =>
  data.nutritionLog?.find((n) => n.date === date)?.hit ?? null;

// สตรีคการกินถึงเป้า — นับแยกจากสตรีคการเทรนโดยตั้งใจ
// (คนที่เทรนครบแต่กินไม่ถึงจะไม่โต ต้องเห็นสองอย่างแยกกันถึงจะรู้ว่าคอขวดอยู่ไหน)
export function nutritionStreak(data: Data): number {
  const log = data.nutritionLog;
  if (!log?.length) return 0;
  const map = new Map(log.map((n) => [n.date, n.hit]));
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    // ต้องเป็นวันที่ท้องถิ่น ไม่ใช่ UTC — ไม่งั้นช่วงเที่ยงคืนถึง 7 โมงจะไปเทียบกับเมื่อวาน
    const d = todayStr(new Date(today.getTime() - i * MS_DAY));
    const hit = map.get(d);
    if (hit === true) streak++;
    else if (hit === false) break;
    else if (i > 0) break; // ไม่ได้บันทึก = ตัดสตรีค (ยกเว้นวันนี้ที่ยังไม่จบวัน)
  }
  return streak;
}

// ── การนอน ──

export interface SleepSummary {
  avg7: number | null;
  shortNights: number; // จำนวนคืนที่ได้ < 7 ชม. ใน 7 วันล่าสุด
  days: number;
  underRecovered: boolean; // เฉลี่ย < 6.5 ชม. ติดกัน 5 วัน = คอขวดอยู่ที่การฟื้นตัว
}

export const SHORT_NIGHT_HOURS = 7;
const UNDER_RECOVERED_HOURS = 6.5;
const UNDER_RECOVERED_DAYS = 5;

export function sleepSummary(data: Data): SleepSummary {
  const log = data.sleepLog ?? [];
  const today = todayStr();
  const recent = log.filter((s) => {
    const ago = dayDiff(s.date, today);
    return ago >= 0 && ago <= 6;
  });
  const avg7 = recent.length ? +(recent.reduce((a, s) => a + s.hours, 0) / recent.length).toFixed(1) : null;

  const last5 = log
    .filter((s) => {
      const ago = dayDiff(s.date, today);
      return ago >= 0 && ago < UNDER_RECOVERED_DAYS;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const underRecovered =
    last5.length >= UNDER_RECOVERED_DAYS &&
    last5.reduce((a, s) => a + s.hours, 0) / last5.length < UNDER_RECOVERED_HOURS;

  return {
    avg7,
    shortNights: recent.filter((s) => s.hours < SHORT_NIGHT_HOURS).length,
    days: log.length,
    underRecovered,
  };
}

// เวลาที่ควรเข้านอนคืนนี้ — ย้อนจากภาระเช้าที่สุดของวันพรุ่งนี้ 8 ชม. + 30 นาทีเผื่อหลับ
// คืน null ถ้าไม่รู้ว่าพรุ่งนี้ต้องตื่นกี่โมง (ไม่เดา)
export function bedtimeFor(data: Data, tomorrow: DayKey): string | null {
  const first = data.dayFirstCommitment?.[tomorrow];
  if (!first) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(first);
  if (!m) return null;
  const wake = +m[1] * 60 + +m[2] - 60; // ตื่นก่อนภาระแรก 1 ชม.
  const bed = ((wake - 8 * 60 - 30) % 1440 + 1440) % 1440;
  return `${String(Math.floor(bed / 60)).padStart(2, "0")}:${String(bed % 60).padStart(2, "0")}`;
}

export const tomorrowKey = (): DayKey => DAYS[(new Date().getDay() + 6) % 7];
