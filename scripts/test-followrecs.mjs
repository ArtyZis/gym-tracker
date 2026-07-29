// จำลองผู้ใช้ "กดตามคำแนะนำไปเรื่อยๆ" จากโปรแกรมว่างเปล่า
// เป้าหมาย: ต้องได้ตารางที่เล่นได้จริง — ไม่เกิน 5 วัน มีวันพักชัดเจน คะแนนขึ้นถึง 100
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-followrecs.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { analyzeProgram, buildRecommendations, applyRecommendation, minGapHours } from "../src/lib/analyzer.ts";
import { MAX_TRAINING_DAYS } from "../src/lib/blueprint.ts";
import { MUSCLE_TH } from "../src/lib/muscles.ts";
import { tierOf } from "../src/lib/exerciseDB.ts";
import { createDefault, createEmpty, exercisesForDay, DAYS, DAY_TH } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`); }
};

// เริ่มจากโปรแกรมว่างเปล่าจริงๆ (เหมือนผู้ใช้กด "ลบทั้งหมดให้ว่างเปล่า")
const d = Object.assign(createDefault(), createEmpty());
d.exercises = [];

console.log("═══ เริ่มจากโปรแกรมว่างเปล่า แล้วกดตามคำแนะนำไปเรื่อยๆ ═══\n");

const history = [];
for (let step = 1; step <= 25; step++) {
  const a = analyzeProgram(d);
  const recs = buildRecommendations(d, a);
  history.push({ step, score: a.execution, ceiling: a.ceiling, days: a.dayLoads.length, recs: recs.length });
  if (!recs.length) {
    console.log(`ครั้งที่ ${step}: ไม่มีคำแนะนำแล้ว — คะแนน ${a.execution}/${a.ceiling}`);
    break;
  }
  const top = recs[0];
  console.log(`ครั้งที่ ${step}: [${a.execution}/${a.ceiling}] กด "${top.title}"`);
  applyRecommendation(d, top);
}

const final = analyzeProgram(d);
const trained = DAYS.filter((day) => exercisesForDay(d, day).length > 0);
const rest = DAYS.filter((day) => exercisesForDay(d, day).length === 0);

console.log("\n═══ ตารางที่ได้ ═══");
for (const day of DAYS) {
  const exs = exercisesForDay(d, day);
  if (!exs.length) { console.log(`${DAY_TH[day].padEnd(8)} — พัก`); continue; }
  const sets = exs.reduce((x, e) => x + e.sets, 0);
  console.log(`${DAY_TH[day].padEnd(8)} ${String(exs.length).padStart(2)} ท่า ${String(sets).padStart(2)} เซต  ${d.dayLabels[day] || ""}`);
  for (const e of exs) console.log(`           ${tierOf(e.name)} · ${e.name} ${e.sets}x${e.rmin}-${e.rmax}`);
}

console.log("\n═══ ตรวจว่าเล่นได้จริงไหม ═══");
ok(`ไม่เกิน ${MAX_TRAINING_DAYS} วัน/สัปดาห์`, trained.length <= MAX_TRAINING_DAYS, `ได้ ${trained.length} วัน`);
ok("มีวันพักอย่างน้อย 2 วัน", rest.length >= 2, `พัก ${rest.length} วัน`);
ok("ไม่ฝึกติดกันเกิน 3 วัน", final.consecutive <= 3, `ติดกัน ${final.consecutive} วัน`);
ok("ไม่มีกล้ามเนื้อมัดไหนฟื้นตัวไม่ทัน", final.recovery.length === 0,
   final.recovery.map((r) => `${MUSCLE_TH[r.muscle]} ${DAY_TH[r.a]}/${DAY_TH[r.b]}`).join(", "));
ok("ไม่มีวันไหนเกินเพดานเซต/เวลา", final.dayLoads.every((x) => !x.overSets && !x.overTime),
   final.dayLoads.filter((x) => x.overSets || x.overTime).map((x) => DAY_TH[x.day]).join(", "));

const gaps = final.stats.filter((s) => s.status === "missing" || s.status === "low");
ok("ทุกกลุ่มกล้ามเนื้อถึงเป้าหมาย", gaps.length === 0,
   gaps.map((s) => `${MUSCLE_TH[s.muscle]}:${s.sets}`).join(", "));

const sTier = d.exercises.filter((e) => tierOf(e.name) === "S").length;
ok("ท่าส่วนใหญ่เป็น tier S", sTier / d.exercises.length >= 0.6,
   `S ${sTier}/${d.exercises.length} (${Math.round((100 * sTier) / d.exercises.length)}%)`);

ok("คะแนนถึง 100", final.execution >= 100, `ได้ ${final.execution}/${final.ceiling}`);

console.log("\n═══ คะแนนแยกหมวด (หาว่าที่ขาดอยู่หมวดไหน) ═══");
const b = final.breakdown;
const W = { volume: 40, patterns: 20, recovery: 20, sessionCap: 10, order: 10 };
for (const [k, v] of Object.entries(b))
  console.log(`  ${k.padEnd(12)} ${(v * 100).toFixed(0).padStart(3)}%  ->  ${(v * W[k]).toFixed(1).padStart(5)} / ${W[k]} คะแนน`);
if (final.issues.length) {
  console.log("\n  จุดที่ยังเตือน:");
  for (const i of final.issues.slice(0, 6)) console.log(`    · ${i}`);
}

console.log("\n═══ เส้นทางคะแนน ═══");
console.log(history.map((h) => `${h.step}:${h.score}`).join(" -> ") + ` -> ${final.execution}`);

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
