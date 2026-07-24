// แปลงข้อความโปรแกรม (วางทีเดียว) เป็นรายการท่า — รองรับหลายรูปแบบไทย/อังกฤษ
// ตัวอย่างที่รองรับ:
//   Push Day / วันจันทร์            (หัวข้อวัน)
//   Bench Press 4x8                (เซต x เรป)
//   Incline DB Press 3 x 6-8       (ช่วงเรป)
//   Squat 5x5 100kg                (มีน้ำหนัก)
//   Plank 3x30s                    (จับเวลา)
//   Pull-up 3xAMRAP                (ทำสุด)
//   Lateral Raise 3 เซต 15 ครั้ง    (คำไทย)

import type { DayKey, ExType, Exercise } from "./store";
import { DAYS } from "./store";

export type ParsedExercise = Omit<Exercise, "id" | "order">;

export interface ParsedProgram {
  exercises: ParsedExercise[];
  dayLabels: Partial<Record<DayKey, string>>;
  warnings: string[];
}

const DAY_PATTERNS: [RegExp, DayKey][] = [
  [/จันทร์|monday|\bmon\b/i, "mon"],
  [/อังคาร|tuesday|\btue(s)?\b/i, "tue"],
  [/พุธ|wednesday|\bwed\b/i, "wed"],
  [/พฤหัส|thursday|\bthu(r)?\b/i, "thu"],
  [/ศุกร์|friday|\bfri\b/i, "fri"],
  [/เสาร์|saturday|\bsat\b/i, "sat"],
  [/อาทิตย์|sunday|\bsun\b/i, "sun"],
];

// ท่าที่ไม่ระบุน้ำหนัก แต่ชื่อบ่งชี้ว่าเป็นน้ำหนักตัว
const BODYWEIGHT_HINT =
  /push.?up|pull.?up|chin.?up|\bdip\b|plank|sit.?up|crunch|burpee|mountain climber|superman|air squat|glute bridge|calf raise|hanging|leg raise|knee raise|australian|pike|handstand|l.?sit|dead hang|dead.?bug/i;

// ชื่อที่ชัดเจนว่าเป็นเครื่อง (คำกำกวมอย่าง chest/shoulder press เดี่ยวๆ ไม่นับ ให้ผู้ใช้กดเองทีหลัง)
const MACHINE_HINT =
  /machine|cable|pulldown|pull.?down|pec.?deck|pec.?fly|leg press|leg extension|leg curl|\bsmith\b|hack squat|hammer strength|seated row|cable row|lat.?pull/i;

// หัวข้อที่บอกว่าเป็นชื่อบล็อค/วัน (ไม่ใช่ชื่อวันตรงๆ แต่ก็ถือเป็นตัวแบ่งวัน)
const BLOCK_HINT = /\b(day|push|pull|legs?|upper|lower|full body|chest|back|shoulder|arm|core|เดย์|วัน|ขา|อก|หลัง|ไหล่|แขน|ท้อง|ดัน|ดึง)\b/i;

function detectDay(line: string): DayKey | null {
  for (const [re, day] of DAY_PATTERNS) if (re.test(line)) return day;
  return null;
}

function toNum(s: string): number {
  return parseFloat(s.replace(/[,\s]/g, ""));
}

interface LineParse {
  ex: ParsedExercise | null;
  looksLikeExercise: boolean; // มี set×rep แต่ parse ไม่ครบ → เตือน
}

function parseExerciseLine(raw: string): LineParse {
  // normalize ตัวคูณและ bullet
  const line = raw
    .replace(/^[\s\-•*·▪◦]+/, "")
    .replace(/[×✕✖⨯]/g, "x")
    .trim();
  if (!line) return { ex: null, looksLikeExercise: false };

  // รูปแบบหลัก: <ชื่อ> <sets> x <reps|amrap> [หน่วยเวลา] ... [น้ำหนัก]
  // จับ set×rep pattern แรกในบรรทัด
  const setRep =
    /(\d+)\s*(?:sets?|เซต|ชุด|set)?\s*x\s*(amrap|max|สุด|\d+(?:\s*[-–]\s*\d+)?)\s*(s|sec|secs|วิ|วินาที)?/i.exec(line);

  // รูปแบบไทย: <ชื่อ> <sets> เซต <reps> ครั้ง/วิ
  const thai =
    /(\d+)\s*(?:sets?|เซต|ชุด)\s*[×x]?\s*(\d+(?:\s*[-–]\s*\d+)?)\s*(?:reps?|ครั้ง|ที|rep)/i.exec(line);
  const thaiTime = /(\d+)\s*(?:sets?|เซต|ชุด)\D{0,4}(\d+(?:\s*[-–]\s*\d+)?)\s*(?:วิ|วินาที|sec|s)\b/i.exec(line);

  let m = setRep;
  let isTime = !!setRep?.[3];
  let repsRaw = setRep?.[2] ?? "";

  if (!m && thaiTime) {
    m = thaiTime;
    isTime = true;
    repsRaw = thaiTime[2];
  } else if (!m && thai) {
    m = thai;
    repsRaw = thai[2];
  }

  if (!m) {
    // ไม่มี pattern เซต×เรป — อาจเป็นหัวข้อ ไม่ใช่ท่า
    return { ex: null, looksLikeExercise: false };
  }

  const sets = Math.max(1, Math.min(20, parseInt(m[1], 10)));
  const name = line.slice(0, m.index).replace(/[\s:.\-–—]+$/, "").trim();
  if (!name || name.length < 2) return { ex: null, looksLikeExercise: true };

  // น้ำหนัก: 100kg / 100 กก / @100 / 100 โล
  const wMatch =
    /@\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(kg|กก\.?|กิโล|โล|lbs?|ปอนด์)/i.exec(line.slice(m.index + m[0].length)) ||
    /@\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(kg|กก\.?|กิโล|โล|lbs?|ปอนด์)/i.exec(line);
  const weight = wMatch ? toNum(wMatch[1] || wMatch[2]) : null;

  // ช่วงเรป
  const amrap = /amrap|max|สุด/i.test(repsRaw);
  let rmin: number;
  let rmax: number;
  if (amrap) {
    rmin = 1;
    rmax = 999;
  } else {
    const parts = repsRaw.split(/[-–]/).map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
    rmin = parts[0] ?? 8;
    rmax = parts[1] ?? parts[0] ?? 12;
    if (rmax < rmin) [rmin, rmax] = [rmax, rmin];
  }

  // ชนิดท่า
  let type: ExType;
  let unit: string | undefined;
  if (isTime) {
    type = "time";
    unit = "วิ";
  } else if (weight != null) {
    type = "weight";
    unit = /lbs?|ปอนด์/i.test(wMatch?.[3] || "") ? "lbs" : "kg";
  } else if (amrap || BODYWEIGHT_HINT.test(name)) {
    type = "bodyweight";
  } else {
    type = "weight"; // เดาว่าเป็นท่าเวท ให้ผู้ใช้ใส่น้ำหนักเอง
    unit = "kg";
  }

  const machine = type === "weight" && MACHINE_HINT.test(name);

  return {
    ex: {
      name,
      day: "mon",
      type,
      sets,
      rmin,
      rmax,
      amrap: type === "bodyweight" && amrap ? true : false,
      inc: type === "weight" ? (machine ? 5 : 2.5) : undefined,
      unit: machine && unit?.includes("ข้าง") ? "kg" : unit,
      machine: machine || undefined,
    },
    looksLikeExercise: true,
  };
}

export function parseProgram(text: string): ParsedProgram {
  const lines = text.split(/\r?\n/);
  const exercises: ParsedExercise[] = [];
  const dayLabels: Partial<Record<DayKey, string>> = {};
  const warnings: string[] = [];

  const usedDays = new Set<DayKey>();
  let currentDay: DayKey | null = null;

  const nextFreeDay = (): DayKey => {
    for (const d of DAYS) if (!usedDays.has(d)) return d;
    return "mon";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const { ex, looksLikeExercise } = parseExerciseLine(line);

    if (ex) {
      if (currentDay == null) currentDay = nextFreeDay();
      usedDays.add(currentDay);
      exercises.push({ ...ex, day: currentDay });
      continue;
    }

    // ไม่ใช่ท่า
    if (looksLikeExercise) {
      warnings.push(`อ่านบรรทัดนี้ไม่ออก ข้ามไป: "${line.slice(0, 40)}"`);
      continue;
    }

    // ถือเป็นหัวข้อวัน
    const named = detectDay(line);
    if (named) {
      currentDay = named;
      usedDays.add(named);
      const label = line.replace(DAY_PATTERNS.find(([re]) => re.test(line))![0], "").replace(/[():\-–—]/g, " ").trim();
      if (label) dayLabels[named] = label.slice(0, 24);
    } else if (BLOCK_HINT.test(line) || line.length < 30) {
      currentDay = nextFreeDay();
      usedDays.add(currentDay);
      dayLabels[currentDay] = line.replace(/[()#:]/g, " ").trim().slice(0, 24);
    } else {
      warnings.push(`ข้ามบรรทัด: "${line.slice(0, 40)}"`);
    }
  }

  return { exercises, dayLabels, warnings };
}
