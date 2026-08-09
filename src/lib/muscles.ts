// อนุกรมวิธานกล้ามเนื้อ รูปแบบการเคลื่อนไหว และอุปกรณ์ — ใช้ร่วมกันทั้งคลังท่าและตัววิเคราะห์
//
// แยกออกมาเป็นไฟล์ของตัวเองเพราะเป็น "ข้อมูลอ้างอิง" ไม่ใช่ "ตรรกะวิเคราะห์"
// เดิมอยู่ใน analyzer.ts ทำให้ exerciseDB ต้อง import จากตัววิเคราะห์ ซึ่งกลับหัวกลับหาง

// ── กลุ่มกล้ามเนื้อ ──
// แยกไหล่เป็น 3 มัด และแยกก้น/หลังขา ตามสเปค เพราะรวมกันแล้วมองไม่เห็นช่องว่าง:
//   ไหล่หน้าโดนเยอะจากทุกท่าดันอยู่แล้ว แต่ไหล่ข้างโดนเฉพาะ Lateral Raise
//   ถ้ารวมเป็น "ไหล่" ตัวเลขจะดูพอ ทั้งที่ไหล่ข้างแทบไม่ได้อะไรเลย
//
// เพิ่ม core จากสเปค 12 กลุ่ม (สเปคมี core เป็น pattern แต่ไม่มีเป็นกลุ่มกล้ามเนื้อ)
// เพราะแอปติดตามหน้าท้องอยู่แล้วและผู้ใช้คาดหวัง — ตัดออกคือถอยหลัง
export type MuscleKey =
  | "chest"
  | "back"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export const MUSCLE_KEYS: MuscleKey[] = [
  "chest",
  "back",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

export const MUSCLE_TH: Record<MuscleKey, string> = {
  chest: "อก",
  back: "หลัง",
  front_delts: "ไหล่หน้า",
  side_delts: "ไหล่ข้าง",
  rear_delts: "ไหล่หลัง",
  biceps: "ไบเซป",
  triceps: "ไตรเซป",
  forearms: "ปลายแขน",
  quads: "ต้นขาหน้า",
  hamstrings: "หลังขา",
  glutes: "ก้น",
  calves: "น่อง",
  core: "แกนกลาง",
};

// คำที่คนไทยพิมพ์ค้นจริง — ต่างจากชื่อทางการด้านบน
export const MUSCLE_ALIAS: Record<MuscleKey, string> = {
  chest: "หน้าอก อก chest pec",
  back: "หลัง ปีก แลท lat back",
  front_delts: "ไหล่หน้า ไหล่ delt shoulder",
  side_delts: "ไหล่ข้าง ไหล่กลาง ไหล่ side delt",
  rear_delts: "ไหล่หลัง หลังไหล่ rear delt",
  biceps: "ไบเซป แขนหน้า ต้นแขน bicep",
  triceps: "ไตรเซป แขนหลัง tricep",
  forearms: "ปลายแขน แขนท่อนล่าง forearm grip",
  quads: "ต้นขาหน้า ขาหน้า ต้นขา ขา quad",
  hamstrings: "หลังขา แฮมสตริง ขาหลัง ขา ham",
  glutes: "ก้น สะโพก glute",
  calves: "น่อง calf",
  core: "ท้อง หน้าท้อง แกนกลาง แอบ abs core ซิกแพค",
};

// กล้ามเนื้อมัดเล็ก — ฟื้นตัวเร็ว ไม่ต้องเตือนเมื่อปริมาณเกินขอบบน (ตามสเปค 4.1)
export const SMALL_MUSCLES: MuscleKey[] = ["calves", "forearms", "rear_delts", "side_delts"];

/**
 * มัดที่ได้งานทางอ้อมมากพอจนไม่ต้องเทรนแยก — ไม่เตือนว่า "ต่ำกว่าเป้า"
 *
 * ปลายแขนทำงานทุกครั้งที่จับบาร์/ดัมเบล: เดดลิฟต์ โรว์ พูลอัพ เคิร์ล ล้วนบังคับให้กำค้างไว้
 * ตารางที่มีท่าดึงตามปกติจึงได้ปลายแขนพอแล้วโดยไม่ต้องมีท่าเจาะจง
 * การเตือนว่าขาดทำให้ผู้ใช้ไปเพิ่ม wrist curl ทั้งที่ไม่จำเป็น และกินเวลาที่ควรใช้กับมัดใหญ่
 */
export const INDIRECT_MUSCLES: MuscleKey[] = ["forearms"];

// กล้ามเนื้อมัดใหญ่ — ขาดแล้วกระทบภาพรวมมาก หักคะแนนหนักกว่า
export const MAJOR_MUSCLES: MuscleKey[] = ["chest", "back", "quads", "hamstrings", "glutes"];

// ── รูปแบบการเคลื่อนไหว ──
// ใช้ตรวจสมดุลที่ระดับ "แพทเทิร์น" ไม่ใช่แค่กล้ามเนื้อ
// เช่นคนที่มี Pull-up + Pulldown แต่ไม่มี Row เลย -> หลังได้เซตครบ แต่ขาดการดึงเข้าหาตัว
// ซึ่งกระทบท่าทาง (ไหล่ห่อ) แม้ตัวเลขเซตจะดูดี
export type Pattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hip_hinge"
  | "lunge"
  | "isolation"
  | "core";

export const PATTERN_TH: Record<Pattern, string> = {
  horizontal_push: "ดันออกหน้า",
  vertical_push: "ดันขึ้นบน",
  horizontal_pull: "ดึงเข้าหาตัว",
  vertical_pull: "ดึงลงล่าง",
  squat: "ย่อขา",
  hip_hinge: "บานพับสะโพก",
  lunge: "ก้าวขาเดียว",
  isolation: "ท่าเจาะจง",
  core: "แกนกลาง",
};

// ── อุปกรณ์ ──
// ต้องแยกละเอียดพอที่จะตอบได้ว่า "วันนี้ผู้ใช้ทำท่านี้ได้จริงไหม"
// bench แยกจาก dumbbell เพราะมีดัมเบลที่บ้านแต่ไม่มีม้านั่งเป็นเรื่องปกติ
export type EquipTag =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bench"
  | "rack"
  | "pullup_bar"
  | "bodyweight"
  | "band"
  | "kettlebell"
  | "other";

export const EQUIP_TH: Record<EquipTag, string> = {
  barbell: "บาร์เบล",
  dumbbell: "ดัมเบล",
  cable: "เคเบิล",
  machine: "เครื่อง",
  bench: "ม้านั่ง",
  rack: "แร็ค",
  pullup_bar: "บาร์โหน",
  bodyweight: "น้ำหนักตัว",
  band: "ยางยืด",
  kettlebell: "เคตเทิลเบล",
  other: "อุปกรณ์เสริม",
};

// ชุดอุปกรณ์สำเร็จรูป — ให้ผู้ใช้กดเลือกทีเดียวแทนติ๊กทีละอัน
export const EQUIP_PRESETS: { id: string; label: string; equip: EquipTag[] }[] = [
  {
    id: "gym",
    label: "ยิมเต็มรูปแบบ",
    equip: ["barbell", "dumbbell", "cable", "machine", "bench", "rack", "pullup_bar", "bodyweight", "other"],
  },
  { id: "home_dumbbell", label: "บ้าน (มีดัมเบล)", equip: ["dumbbell", "bodyweight", "band"] },
  { id: "home_bar", label: "บ้าน (มีบาร์โหน)", equip: ["pullup_bar", "bodyweight", "band"] },
  { id: "bodyweight", label: "ตัวเปล่า", equip: ["bodyweight"] },
];

// ── ต้นทุนความล้า ──
// ใช้ประเมินเวลาต่อเซตและจัดลำดับท่าในวัน (ท่าล้าสูงต้องมาก่อน)
export type FatigueCost = "low" | "moderate" | "high";

// นาทีต่อเซตโดยประมาณ (รวมเวลาพัก) — ตามสเปค 4.2
export const MINUTES_PER_SET: Record<FatigueCost, number> = {
  high: 4, // compound หนัก พัก 2-3 นาที
  moderate: 3, // compound ปานกลาง พัก 1.5-2 นาที
  low: 2, // isolation พัก 60-90 วิ
};

// ── เป้าหมายปริมาณเซตต่อสัปดาห์ตามระดับประสบการณ์ (สเปค 4.1) ──
export type Experience = "beginner" | "intermediate" | "advanced";

export const EXPERIENCE_TH: Record<Experience, string> = {
  beginner: "เริ่มต้น",
  intermediate: "ปานกลาง",
  advanced: "ขั้นสูง",
};

// คำอธิบายให้ผู้ใช้เลือกได้ถูก — คนมักประเมินตัวเองสูงเกิน
export const EXPERIENCE_DESC: Record<Experience, string> = {
  beginner: "ฝึกจริงจังมาไม่ถึง 1 ปี",
  intermediate: "ฝึกต่อเนื่อง 1-3 ปี น้ำหนักยังขึ้นเรื่อยๆ",
  advanced: "ฝึกเกิน 3 ปี น้ำหนักขึ้นช้าแล้ว",
};

export type Goal = "hypertrophy" | "strength" | "fatloss" | "general";

export const GOAL_TH: Record<Goal, string> = {
  hypertrophy: "สร้างกล้าม",
  strength: "เพิ่มความแข็งแรง",
  fatloss: "ลดไขมัน",
  general: "สุขภาพทั่วไป",
};

export interface VolumeTarget {
  min: number; // ขอบล่างของช่วงเป้าหมาย
  max: number; // ขอบบนของช่วงเป้าหมาย
  warnLow: number; // ต่ำกว่านี้ = เตือน
  warnHigh: number; // เกินนี้ = เตือน (ยกเว้นกล้ามเนื้อมัดเล็ก)
}

export const VOLUME_TARGETS: Record<Experience, VolumeTarget> = {
  beginner: { min: 6, max: 12, warnLow: 5, warnHigh: 16 },
  intermediate: { min: 10, max: 18, warnLow: 8, warnHigh: 22 },
  advanced: { min: 14, max: 20, warnLow: 10, warnHigh: 25 },
};

/**
 * ตัวคูณเพดานปริมาณรายมัด — ปริมาณที่ฟื้นตัวไหวไม่เท่ากันทุกมัด
 *
 * ใช้เพดานตัวเดียวกับทุกมัดคือจุดที่เกณฑ์เดิมหยาบเกินไป:
 * "หลัง" ในระบบนี้นับรวม lats + traps + rhomboids + erectors เป็นก้อนเดียว
 * ซึ่งเป็นหลายมัดที่แบ่งงานกัน จึงรับปริมาณได้มากกว่าอกที่เป็นมัดเดียวจริงๆ
 * ตาราง Pull 2 วันที่ทำกันปกติจะได้หลัง 25-30 เซต ซึ่งไม่ใช่ปริมาณที่มากเกิน
 * แต่เกณฑ์เดิมตีว่า "เกินโซนคุ้มค่า" ทำให้ตารางมาตรฐานเสียคะแนนฟรี
 *
 * ต้นขาหน้าก็เช่นกัน — สควอท/ลันจ์/เลกเพรสคนละแพทเทิร์นกัน ซ้อนกันได้มากกว่ามัดเดี่ยว
 */
export const VOLUME_CEILING_MUL: Partial<Record<MuscleKey, number>> = {
  back: 1.6,
  quads: 1.3,
  glutes: 1.3,
  hamstrings: 1.2,
};

// ── เพดานต่อเซสชัน (สเปค 4.2) ──
export const MAX_SETS_PER_MUSCLE_PER_SESSION = 10;
export const DEFAULT_MAX_SETS_PER_SESSION = 30;
export const DEFAULT_SESSION_TIME_CAP_MINUTES = 90;

// ── ระยะห่างการฟื้นตัว (สเปค 4.3) ──
export const MIN_RECOVERY_HOURS = 48;
export const FULL_RECOVERY_HOURS = 72;
// ถือว่ากล้ามเนื้อ "โดนหนัก" ในวันนั้นเมื่อได้ตั้งแต่กี่เซตขึ้นไป
export const HEAVY_HIT_SETS = 4;

// ── อาการบาดเจ็บที่กรองท่าได้ ──
export type InjuryKey = "lower_back" | "shoulder" | "knee" | "elbow" | "wrist";

export const INJURY_TH: Record<InjuryKey, string> = {
  lower_back: "หลังล่าง",
  shoulder: "หัวไหล่",
  knee: "เข่า",
  elbow: "ข้อศอก",
  wrist: "ข้อมือ",
};
