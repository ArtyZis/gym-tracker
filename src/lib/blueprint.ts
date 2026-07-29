// โครงตารางฝึกมาตรฐาน — ใช้ตอนแนะนำ "เพิ่มวันฝึก" ให้ได้ตารางที่เล่นได้จริง
//
// ปัญหาที่แก้: engine เดิมเสนอทีละท่าแบบไล่อุดช่องว่าง ไม่มีภาพโครงตารางในหัว
// กดตามไปเรื่อยๆ เลยลามเป็นฝึก 7 วันไม่มีวันพัก ซึ่งฟื้นตัวไม่ทันและเล่นจริงไม่ไหว
//
// วิธีใหม่: กำหนดโครงที่ใช้กันจริงไว้ล่วงหน้า พร้อมวันพักที่เว้นถูกตำแหน่ง
// แล้วเสนอ "เพิ่มทั้งวัน" ตามโครง ผู้ใช้กดทีเดียวได้วันฝึกที่สมบูรณ์เลย

import type { Data, DayKey, Exercise } from "./store";
import { exercisesForDay, uid } from "./store";
import type { FatigueCost, MuscleKey, Pattern } from "./muscles";
import type { ExTemplate } from "./exerciseDB";
import { EXERCISE_DB, TIER_RANK, isMachineEx, incFor, tierOf, unitFor } from "./exerciseDB";
import { canDoWithEquip, getDayEquip } from "./profile";

// ฝึกเกิน 5 วัน/สัปดาห์ ไม่ได้ให้ผลดีกว่าและฟื้นตัวไม่ทันสำหรับคนทั่วไป
// ตั้งเพดานตายตัวไว้เพื่อไม่ให้คำแนะนำลามจนกลายเป็นฝึกทุกวัน
export const MAX_TRAINING_DAYS = 5;

export type DayType = "push" | "pull" | "legs" | "upper" | "lower" | "full";

export const DAY_TYPE_TH: Record<DayType, string> = {
  push: "วันดัน (อก ไหล่ ไตรเซป)",
  pull: "วันดึง (หลัง ไบเซป)",
  legs: "วันขา (ขา ก้น น่อง)",
  upper: "วันบน (อก หลัง ไหล่ แขน)",
  lower: "วันล่าง (ขา ก้น น่อง)",
  full: "เต็มตัว",
};

export const DAY_TYPE_SHORT: Record<DayType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  full: "Full Body",
};

// ── โครงตารางตามจำนวนวันที่ฝึกได้ ──
// เว้นวันพักให้กล้ามเนื้อกลุ่มเดิมห่างกันอย่างน้อย 48 ชม. เสมอ
// 2 วัน: เต็มตัว จ+พฤ (ห่าง 72/96)
// 3 วัน: Push/Pull/Legs จ+พ+ศ (ทุกวันคนละกลุ่ม พักวันเว้นวัน)
// 4 วัน: Upper/Lower สลับ จ+อ+พฤ+ศ (กลุ่มเดิมห่าง 72 ชม.)
// 5 วัน: PPL + Upper/Lower จ+อ+พฤ+ศ+ส
export const SPLITS: Record<number, { day: DayKey; type: DayType }[]> = {
  1: [{ day: "mon", type: "full" }],
  2: [
    { day: "mon", type: "full" },
    { day: "thu", type: "full" },
  ],
  3: [
    { day: "mon", type: "push" },
    { day: "wed", type: "pull" },
    { day: "fri", type: "legs" },
  ],
  4: [
    { day: "mon", type: "upper" },
    { day: "tue", type: "lower" },
    { day: "thu", type: "upper" },
    { day: "fri", type: "lower" },
  ],
  5: [
    { day: "mon", type: "push" },
    { day: "tue", type: "pull" },
    { day: "thu", type: "legs" },
    { day: "fri", type: "upper" },
    { day: "sat", type: "lower" },
  ],
};

// ── ช่องท่าของแต่ละประเภทวัน ──
// เรียงตามลำดับที่ควรเล่นจริง: compound หนักก่อน -> compound ปานกลาง -> เจาะจง -> core/น่องปิดท้าย
// pattern ระบุไว้เมื่อต้องการรูปแบบเฉพาะ (เช่นวันดึงต้องมีทั้งดึงลงล่างและดึงเข้าตัว)
interface Slot {
  muscle: MuscleKey;
  sets: number;
  pattern?: Pattern;
}

// ปริมาณตั้งไว้ให้ "ครบเป้าตั้งแต่กดครั้งแรก" ไม่ต้องมาไล่เติมทีหลัง
// จุดที่ต้องระวังจากการทดสอบจริง:
//  - ท่าดึงเข้าตัวต้องไม่น้อยกว่าท่าดันออกหน้า (ไม่งั้นเสียสมดุลไหล่) -> วันดึงมี 2 ช่อง horizontal_pull
//  - น่องฟื้นตัวเร็ว ใส่ได้หลายวัน -> กระจายไปวันดัน/วันบนด้วย ไม่ใช่กองไว้วันขาวันเดียว
//  - ไหล่หลังโดนจากท่าโรว์แค่ครึ่งเซต ต้องมีช่องของตัวเอง ไม่งั้นตกเป้าเสมอ
const SLOTS: Record<DayType, Slot[]> = {
  push: [
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "front_delts", sets: 4, pattern: "vertical_push" },
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "side_delts", sets: 4 },
    { muscle: "triceps", sets: 4 },
    { muscle: "side_delts", sets: 3 },
    { muscle: "calves", sets: 4 },
  ],
  pull: [
    { muscle: "back", sets: 4, pattern: "vertical_pull" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "rear_delts", sets: 4 },
    { muscle: "biceps", sets: 4 },
    { muscle: "biceps", sets: 3 },
    { muscle: "forearms", sets: 3 },
  ],
  legs: [
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "hamstrings", sets: 4, pattern: "hip_hinge" },
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "glutes", sets: 4 },
    { muscle: "hamstrings", sets: 4 },
    { muscle: "calves", sets: 4 },
    { muscle: "core", sets: 4 },
  ],
  upper: [
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "front_delts", sets: 3, pattern: "vertical_push" },
    { muscle: "back", sets: 3, pattern: "vertical_pull" },
    { muscle: "side_delts", sets: 4 },
    { muscle: "rear_delts", sets: 3 },
    { muscle: "biceps", sets: 3 },
    { muscle: "triceps", sets: 3 },
  ],
  lower: [
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "hamstrings", sets: 4, pattern: "hip_hinge" },
    { muscle: "glutes", sets: 4 },
    { muscle: "quads", sets: 3 },
    { muscle: "calves", sets: 4 },
    { muscle: "core", sets: 3 },
  ],
  full: [
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "hamstrings", sets: 4, pattern: "hip_hinge" },
    { muscle: "front_delts", sets: 3, pattern: "vertical_push" },
    { muscle: "back", sets: 3, pattern: "vertical_pull" },
    { muscle: "side_delts", sets: 4 },
    { muscle: "biceps", sets: 3 },
    { muscle: "triceps", sets: 3 },
    { muscle: "calves", sets: 4 },
    { muscle: "core", sets: 3 },
  ],
};

// เลือกท่าที่ดีที่สุดสำหรับช่องนั้น — tier S ก่อน และต้องทำได้ด้วยอุปกรณ์ของวันนั้นจริง
function pickForSlot(data: Data, day: DayKey, slot: Slot, used: Set<string>): ExTemplate | null {
  const equip = getDayEquip(data, day);
  const pool = EXERCISE_DB.filter(
    (t) =>
      t.pri.includes(slot.muscle) &&
      !used.has(t.name.toLowerCase()) &&
      canDoWithEquip(t.equip, equip) &&
      (!slot.pattern || t.pattern === slot.pattern),
  ).sort((a, b) => {
    const tier = TIER_RANK[tierOf(a.name)] - TIER_RANK[tierOf(b.name)];
    if (tier) return tier;
    // tier เท่ากัน: เอาท่าที่โดนกล้ามเป้าหมายเป็นหลักตัวแรก (เจาะจงกว่า)
    return a.pri.indexOf(slot.muscle) - b.pri.indexOf(slot.muscle);
  });
  if (pool.length) return pool[0];

  // ไม่มีท่าที่ตรง pattern -> ผ่อนเฉพาะ pattern (ยังคงเงื่อนไขอุปกรณ์ไว้เสมอ)
  if (slot.pattern) return pickForSlot(data, day, { ...slot, pattern: undefined }, used);
  return null;
}

// สร้างท่าทั้งวันตามโครง — คืนรายการที่พร้อมใส่ลง data.exercises ได้เลย
export function buildDayExercises(data: Data, day: DayKey, type: DayType): Exercise[] {
  const used = new Set(data.exercises.map((e) => e.name.toLowerCase()));
  const out: Exercise[] = [];
  let order = 0;
  for (const slot of SLOTS[type]) {
    const t = pickForSlot(data, day, slot, used);
    if (!t) continue;
    used.add(t.name.toLowerCase());
    out.push({
      id: uid() + order,
      name: t.name,
      day,
      type: t.type,
      sets: slot.sets,
      rmin: t.rmin,
      rmax: t.rmax,
      inc: incFor(t),
      unit: unitFor(t),
      amrap: t.amrap ?? false,
      machine: isMachineEx(t) || undefined,
      order: order++,
    });
  }
  return out;
}

// วันถัดไปที่ควรเพิ่มตามโครง — คืน null ถ้าครบเพดานแล้ว
// เลือกโครงของ "จำนวนวันเป้าหมาย" แล้วหาวันในโครงที่ยังว่าง
// สร้างโปรแกรมทั้งชุดจากโครงเดียว — ใช้ตอนผู้ใช้เริ่มจากศูนย์
//
// ทำไมต้องสร้างทีเดียวทั้งชุด ไม่ใช่ทีละวัน:
// ถ้าเพิ่มทีละวันแล้วเลือกโครงใหม่ทุกครั้ง จะได้วันที่ไม่เข้าชุดกัน
// (เช่น Full Body จันทร์ + Lower อังคาร = ขาโดนติดกัน 24 ชม. ฟื้นตัวไม่ทัน)
// โครงทั้งชุดถูกออกแบบให้วันพักและระยะห่างลงตัวตั้งแต่แรก
export function buildFullProgram(data: Data, dayCount: number): { exercises: Exercise[]; labels: Partial<Record<DayKey, string>> } {
  const split = SPLITS[dayCount] ?? SPLITS[4];
  const used = new Set<string>();
  const exercises: Exercise[] = [];
  const labels: Partial<Record<DayKey, string>> = {};

  for (const { day, type } of split) {
    labels[day] = DAY_TYPE_SHORT[type];
    const picked: { t: ExTemplate; sets: number }[] = [];
    for (const slot of SLOTS[type]) {
      const t = pickForSlot(data, day, slot, used);
      if (!t) continue;
      // ท่าเดิมใช้ซ้ำได้ข้ามวันถ้าโครงต้องการ แต่ห้ามซ้ำในโปรแกรมเดียวกัน
      // (used คุมทั้งโปรแกรมเพื่อให้ท่าหลากหลาย ไม่ใช่ท่าเดิมทุกวัน)
      used.add(t.name.toLowerCase());
      picked.push({ t, sets: slot.sets });
    }

    // เรียงตามลำดับที่ควรเล่นจริง ไม่ใช่ตามลำดับช่องในโครง
    // (ช่อง vertical_pull มาก่อน horizontal_pull แต่ Lat Pulldown เบากว่า Barbell Row
    //  ถ้าไม่เรียงใหม่ ท่าหนักจะไปอยู่หลังท่าเบา = เล่นจริงแล้วแรงไม่พอตอนท่าหนัก)
    const rank: Record<FatigueCost, number> = { high: 0, moderate: 1, low: 2 };
    const isFinisher = (t: ExTemplate) => t.pri.includes("core") || t.pri.includes("calves");
    picked.sort((a, b) => {
      const fin = (isFinisher(a.t) ? 1 : 0) - (isFinisher(b.t) ? 1 : 0);
      return fin || rank[a.t.fatigue] - rank[b.t.fatigue];
    });

    picked.forEach(({ t, sets }, order) => {
      exercises.push({
        id: uid() + exercises.length,
        name: t.name,
        day,
        type: t.type,
        sets,
        rmin: t.rmin,
        rmax: t.rmax,
        inc: incFor(t),
        unit: unitFor(t),
        amrap: t.amrap ?? false,
        machine: isMachineEx(t) || undefined,
        order,
      });
    });
  }
  return { exercises, labels };
}

// จำนวนวันที่เสนอให้เลือก — 3/4/5 ครอบคลุมคนส่วนใหญ่
export const OFFERED_SPLITS = [3, 4, 5];

export const splitSummary = (dayCount: number): string => {
  const split = SPLITS[dayCount] ?? SPLITS[4];
  return split.map((s) => DAY_TYPE_SHORT[s.type]).join(" · ");
};

export const splitDays = (dayCount: number): DayKey[] => (SPLITS[dayCount] ?? SPLITS[4]).map((s) => s.day);
