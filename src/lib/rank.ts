// สถิติสูงสุดต่อท่า + แรงค์รวม — ไว้แชร์อวดกัน
//
// แรงค์คิดจาก "ความแข็งแรงเทียบน้ำหนักตัว" ไม่ใช่จำนวนวันที่มายิมหรือปริมาณเซต
// เพราะเป็นตัวเดียวที่เทียบข้ามคนได้จริง — คน 60 กก. เบนช์ 80 แข็งแรงกว่าคน 90 กก. เบนช์ 90
//
// **เป็นค่าประมาณ** เกณฑ์ที่ใช้เป็นมาตรฐานความแข็งแรงที่อ้างอิงกันทั่วไปในวงการฝึกเวท
// และอิงกับผู้ชายเป็นหลัก ผู้หญิงอัตราส่วนจะต่ำกว่าราว 25-30% โดยธรรมชาติ
// จึงบอกไว้ในการ์ดตรงๆ ว่าเป็นการประเมิน ไม่ใช่การวัดที่แม่นยำ

import type { Data, Exercise } from "./store";
import { findTemplate } from "./exerciseDB";
import { epley1RM } from "./progression";

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];

export const RANK_TH: Record<Rank, string> = {
  E: "เริ่มต้น",
  D: "มือใหม่",
  C: "ระดับกลาง",
  B: "ค่อนข้างแข็งแรง",
  A: "แข็งแรงมาก",
  S: "ระดับแข่งขัน",
};

export const RANK_COLOR: Record<Rank, string> = {
  E: "#7c8aa8",
  D: "#3fd0a8",
  C: "#4fd8ff",
  B: "#7b8cff",
  A: "#c46bff",
  S: "#ffc14d",
};

// สีคู่สำหรับไล่เฉดบนตราแรงค์ — ทำให้โลหะดูมีมิติ ไม่แบน
export const RANK_COLOR2: Record<Rank, string> = {
  E: "#4a5670",
  D: "#1f9a86",
  C: "#2f8fd6",
  B: "#4b4fd0",
  A: "#7b3fd6",
  S: "#ff8a2b",
};

// จำนวนดาวใต้ตรา — บอกระดับแบบที่เกมใช้กัน อ่านเร็วกว่าตัวอักษรอย่างเดียว
export const RANK_STARS: Record<Rank, number> = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

// ท่าหลักที่ใช้ตัดสินแรงค์ + เกณฑ์อัตราส่วน 1RM ต่อน้ำหนักตัว สำหรับ [D, C, B, A, S]
// ต่ำกว่าเกณฑ์ D ทั้งหมด = E
export const LIFT_STANDARDS: { key: string; label: string; names: string[]; ratios: [number, number, number, number, number] }[] = [
  { key: "squat", label: "สควอท", names: ["Barbell Squat", "Front Squat", "Box Squat", "Smith Machine Squat"], ratios: [1.0, 1.25, 1.5, 2.0, 2.5] },
  { key: "bench", label: "เบนช์", names: ["Barbell Bench Press", "Incline Barbell Press", "Close Grip Bench Press"], ratios: [0.75, 1.0, 1.25, 1.5, 2.0] },
  { key: "deadlift", label: "เดดลิฟต์", names: ["Deadlift", "Sumo Deadlift", "Romanian Deadlift", "Stiff Leg Deadlift"], ratios: [1.25, 1.5, 1.75, 2.25, 3.0] },
  { key: "ohp", label: "ดันบ่า", names: ["Overhead Press", "Push Press"], ratios: [0.45, 0.6, 0.75, 0.9, 1.1] },
];

export interface BestLift {
  name: string;
  weight: number; // น้ำหนักสูงสุดที่เคยทำ
  reps: number; // จำนวนครั้งที่ทำได้ที่น้ำหนักนั้น
  sets: number; // จำนวนเซตที่ทำได้ที่น้ำหนักนั้นในวันเดียว
  unit: string;
  oneRM: number; // ประเมินจากสูตร Epley
  date: string;
}

/** สถิติสูงสุดของทุกท่าที่เคยเล่น เรียงจากหนักสุด */
export function bestLifts(data: Data): BestLift[] {
  const out: BestLift[] = [];
  const byId = new Map(data.exercises.map((e) => [e.id, e]));

  for (const [exId, sessions] of Object.entries(data.history)) {
    const ex: Exercise | undefined = byId.get(exId);
    if (!ex || ex.type !== "weight") continue;

    let best = 0;
    let bestReps = 0;
    let bestDate = "";
    for (const s of sessions)
      for (const st of s.sets) {
        if (!st?.weight || !st.reps) continue;
        // หนักกว่าเดิม หรือหนักเท่ากันแต่ทำได้มากครั้งกว่า = สถิติที่ดีกว่า
        if (st.weight > best || (st.weight === best && st.reps > bestReps)) {
          best = st.weight;
          bestReps = st.reps;
          bestDate = s.date;
        }
      }
    if (!best) continue;

    // นับว่าวันนั้นทำน้ำหนักสูงสุดนี้ได้กี่เซต
    const day = sessions.find((s) => s.date === bestDate);
    const sets = day ? day.sets.filter((st) => st?.weight === best).length : 1;

    out.push({
      name: ex.name,
      weight: best,
      reps: bestReps,
      sets,
      unit: ex.unit || "kg",
      oneRM: Math.round(epley1RM(best, bestReps) * 10) / 10,
      date: bestDate,
    });
  }
  return out.sort((a, b) => b.oneRM - a.oneRM);
}

/** น้ำหนักตัวล่าสุดที่บันทึกไว้ — ไม่มี = ประเมินแรงค์ไม่ได้ */
export function latestBodyweight(data: Data): number | null {
  const bw = [...data.bodyweight].sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (bw?.kg) return bw.kg;
  const scan = [...data.bodyScans].sort((a, b) => a.date.localeCompare(b.date)).pop();
  return scan?.weightKg ?? null;
}

export interface LiftRank {
  key: string;
  label: string;
  name: string;
  oneRM: number;
  ratio: number;
  rank: Rank;
}

export interface RankResult {
  rank: Rank | null; // null = ข้อมูลไม่พอ
  lifts: LiftRank[];
  bodyweight: number | null;
  missing: string[]; // ท่าหลักที่ยังไม่มีข้อมูล
}

const rankOf = (ratio: number, ratios: [number, number, number, number, number]): Rank => {
  let r: Rank = "E";
  for (let i = 0; i < ratios.length; i++) if (ratio >= ratios[i]) r = RANKS[i + 1];
  return r;
};

/** เกณฑ์ที่ต้องถึงของแรงค์นั้นในแต่ละท่าหลัก (เท่าของน้ำหนักตัว) — ใช้โชว์ว่าอีกไกลแค่ไหน */
export function requirementFor(rank: Rank): { label: string; ratio: number }[] {
  const i = RANKS.indexOf(rank) - 1; // E ไม่มีเกณฑ์ (เป็นระดับเริ่มต้น)
  if (i < 0) return [];
  return LIFT_STANDARDS.map((s) => ({ label: s.label, ratio: s.ratios[i] }));
}

export function computeRank(data: Data): RankResult {
  const bw = latestBodyweight(data);
  const lifts = bestLifts(data);
  const out: LiftRank[] = [];
  const missing: string[] = [];

  for (const std of LIFT_STANDARDS) {
    // จับคู่ทั้งชื่อตรงและชื่อที่ผู้ใช้ตั้งเองที่ map กลับไปท่าเดียวกันได้
    const hit = lifts.find((l) => {
      const canon = findTemplate(l.name)?.name ?? l.name;
      return std.names.includes(canon);
    });
    if (!hit || !bw) {
      missing.push(std.label);
      continue;
    }
    const ratio = hit.oneRM / bw;
    out.push({ key: std.key, label: std.label, name: hit.name, oneRM: hit.oneRM, ratio: +ratio.toFixed(2), rank: rankOf(ratio, std.ratios) });
  }

  // ต้องมีอย่างน้อย 2 ท่าหลักถึงจะให้แรงค์ — ท่าเดียวตัดสินความแข็งแรงรวมไม่ได้
  if (out.length < 2) return { rank: null, lifts: out, bodyweight: bw, missing };

  const avg = out.reduce((a, l) => a + RANKS.indexOf(l.rank), 0) / out.length;
  return { rank: RANKS[Math.floor(avg)], lifts: out, bodyweight: bw, missing };
}
