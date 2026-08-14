// ชั่วคราว: จำลองว่าถ้าเล่นตามที่แอปแนะนำ 6 เดือน จะไปถึงไหน (ลบทิ้งหลังใช้)
import { suggestTarget } from "../src/lib/progression.ts";
import { createDefault, createEmpty } from "../src/lib/store.ts";
import { findTemplate, incFor, isMachineEx, unitFor } from "../src/lib/exerciseDB.ts";
import { epley1RM } from "../src/lib/progression.ts";

const dk = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toISOString().slice(0, 10); };

// ตารางจริง + สถิติล่าสุดที่ผู้ใช้ให้มา  [ชื่อ, เซต, reps, น้ำหนักที่ทำได้ตอนนี้]
const PROGRAM = {
  mon: [
    ["Barbell Bench Press", 4, 5, 50], ["Overhead Press", 3, 6, 17.5], ["Incline DB Press", 3, 8, 20],
    ["Dip", 3, 8, 10], ["Cable Lateral Raise", 4, 12, 5], ["Overhead Tricep Extension", 3, 10, 10],
  ],
  tue: [
    ["Deadlift", 4, 5, 70], ["Pull-up", 4, 6, 5], ["T-Bar Row", 3, 8, 17.5],
    ["Cable Pullover", 3, 12, 30], ["Face Pull", 3, 15, 20], ["Barbell Curl", 3, 8, 20],
  ],
  wed: [
    ["Barbell Squat", 5, 5, 40], ["Romanian Deadlift", 3, 8, 40], ["Hack Squat", 3, 10, 50],
    ["Seated Leg Curl", 3, 12, 40], ["Standing Calf Raise", 4, 10, 40], ["Hanging Leg Raise", 3, "amrap", 0],
  ],
  thu: [
    ["Incline Barbell Press", 4, 8, 50], ["Overhead Press", 3, 10, 15], ["Cable Fly", 3, 12, 30],
    ["Dip", 3, 10, 5], ["Cable Lateral Raise", 4, 15, 5], ["Tricep Pushdown", 3, 15, 20],
  ],
  sat: [
    ["Lat Pulldown", 4, 10, 45], ["Seated Cable Row", 4, 10, 30], ["Dumbbell Row", 3, 12, 12.5],
    ["Cable Pullover", 3, 12, 30], ["Rear Delt Fly", 4, 15, 10], ["Incline DB Curl", 3, 12, 7.5],
    ["Hammer Curl", 3, 12, 7.5],
  ],
  sun: [
    ["Front Squat", 4, 8, 30], ["Bulgarian Split Squat", 3, 10, 5], ["Leg Press", 3, 12, 50],
    ["Leg Extension", 3, 15, 20], ["Lying Leg Curl", 3, 15, 30], ["Seated Calf Raise", 4, 15, 60],
    ["Hanging Leg Raise", 3, "amrap", 0],
  ],
};

const d = Object.assign(createDefault(), createEmpty());
const cap = {};   // ความสามารถจริง: 1RM ประมาณของแต่ละท่า
const START = {}; // น้ำหนักตั้งต้นจากสถิติจริงที่ผู้ใช้จดไว้
let order = 0;
for (const [day, list] of Object.entries(PROGRAM)) {
  for (const [name, sets, reps, w] of list) {
    const t = findTemplate(name);
    const amrap = reps === "amrap";
    const id = "x" + order;
    d.exercises.push({
      id, name, day, order: order++,
      type: amrap ? "bodyweight" : "weight",
      sets, rmin: amrap ? 1 : reps, rmax: amrap ? 999 : reps,
      ...(amrap ? { amrap: true } : {}),
      unit: t ? unitFor(t) : "kg", inc: t ? incFor(t) : 2.5, ...(t && isMachineEx(t) ? { machine: true } : {}),
    });
    if (!amrap) { cap[id] = epley1RM(w, reps); START[id] = w; } // ตั้งต้นจากสถิติจริง
  }
}

// สมมติ: คนที่เล่นมา 6 เดือนแล้วยังโตได้ ~0.6%/สัปดาห์ (ช้าลงกว่าช่วงเริ่มต้น)
// ท่าเล็ก/isolation โตช้ากว่าท่ารวม
const GROW = (name) => (findTemplate(name)?.pattern === "isolation" ? 0.004 : 0.007);
const repsAt = (w, oneRM) => Math.max(0, Math.floor(30 * (oneRM / w - 1)));

const WEEKS = 26;
d.history = {};
// ใส่สถิติจริงเป็นสัปดาห์ที่ 0 — ไม่งั้นระบบจะเริ่มนับหนึ่งจาก 10 kg เหมือนคนไม่เคยเล่น
for (const ex of d.exercises) {
  d.history[ex.id] = [];
  if (ex.amrap) continue;
  const w = START[ex.id];
  d.history[ex.id].push({
    date: dk((WEEKS + 1) * 7),
    sets: Array.from({ length: ex.sets }, () => ({ weight: w, reps: ex.rmax })),
  });
}

for (let wk = 0; wk < WEEKS; wk++) {
  for (const ex of d.exercises) {
    if (ex.amrap) continue;
    const oneRM = cap[ex.id] * Math.pow(1 + GROW(ex.name), wk);
    const t = suggestTarget(d, ex);
    const w = t.weight ?? 10;
    const sets = [];
    for (let i = 0; i < ex.sets; i++) {
      const able = repsAt(w, oneRM * (1 - i * 0.03)); // เซตหลังอ่อนแรงลงเล็กน้อย
      const reps = Math.min(ex.rmax, able);
      const s = { weight: w, reps };
      if (i === ex.sets - 1) s.rir = Math.max(0, Math.min(5, able - reps));
      sets.push(s);
    }
    d.history[ex.id].push({ date: dk((WEEKS - wk) * 7), sets });
  }
}

console.log("=== ผลจำลอง 6 เดือน (26 สัปดาห์) เล่นตามที่แอปแนะนำทุกครั้ง ===\n");
console.log("ท่า                              เริ่ม      ->  จบ         เพิ่ม");
console.log("─".repeat(72));
const rows = [];
for (const ex of d.exercises) {
  if (ex.amrap) continue;
  const logs = d.history[ex.id];
  const first = logs[0]?.sets[0];
  const last = logs[logs.length - 1]?.sets[0];
  if (!first || !last) continue;
  const gain = last.weight - first.weight;
  const pct = ((last.weight / first.weight - 1) * 100).toFixed(0);
  rows.push({ name: ex.name, day: ex.day, from: first.weight, to: last.weight, gain, pct, reps: ex.rmax });
}
const DAY_TH = { mon: "จ", tue: "อ", wed: "พ", thu: "พฤ", sat: "ส", sun: "อา" };
const HEAVY = ["mon", "tue", "wed"];
for (const grp of [HEAVY, ["thu", "sat", "sun"]]) {
  console.log(grp === HEAVY ? "\n── วันหนัก (จ/อ/พ) ──" : "\n── วันปริมาณ (พฤ/ส/อา) ──");
  for (const r of rows.filter((x) => grp.includes(x.day)).sort((a, b) => b.to - a.to))
    console.log(`${DAY_TH[r.day].padStart(2)} ${r.name.padEnd(28)} ${String(r.from).padStart(6)} -> ${String(r.to).padStart(6)} kg × ${String(r.reps).padEnd(3)} +${String(r.gain).padStart(5)} (${r.pct}%)`);
}

// เทียบท่าที่อยู่ทั้งสองวัน — ยืนยันว่าวันปริมาณใช้น้ำหนักน้อยกว่าจริง
console.log("\n── ท่าที่เล่นทั้งวันหนักและวันปริมาณ ──");
const byName = new Map();
for (const r of rows) {
  if (!byName.has(r.name)) byName.set(r.name, []);
  byName.get(r.name).push(r);
}
for (const [name, list] of byName) {
  if (list.length < 2) continue;
  const h = list.find((x) => HEAVY.includes(x.day));
  const v = list.find((x) => !HEAVY.includes(x.day));
  if (h && v) console.log(`${name.padEnd(30)} หนัก ${h.to} kg × ${h.reps}  ·  ปริมาณ ${v.to} kg × ${v.reps}`);
}
