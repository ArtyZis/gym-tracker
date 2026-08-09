// จำลอง "ผู้ใช้มีตารางของตัวเองอยู่แล้ว" (ไม่ใช่ว่างเปล่า) แล้วกดตามคำแนะนำไปเรื่อยๆ
// เป้าหมาย: ไม่ว่าตารางเริ่มต้นจะเละแค่ไหน กดตามคำแนะนำต้องไปถึง 100 ได้ (หรือถึง ceiling ถ้าตารางเดิมมีข้อจำกัดจริง)
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-existing.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { analyzeProgram, buildRecommendations, applyRecommendation } from "../src/lib/analyzer.ts";
import { createDefault, createEmpty, exercisesForDay, DAYS, DAY_TH, uid } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`); }
};

function mkEx(name, day, sets, rmin, rmax, order) {
  return { id: uid() + Math.random(), name, day, type: "weight", sets, rmin, rmax, inc: 2.5, unit: "kg", order };
}

function runScenario(label, seed) {
  console.log(`\n\n═══════════ ${label} ═══════════`);
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = seed;

  const start = analyzeProgram(d);
  const startDays = DAYS.filter((day) => exercisesForDay(d, day).length > 0);
  console.log(`เริ่มต้น: ${start.execution}/${start.ceiling} · ฝึก ${startDays.length} วัน`);

  const history = [start.execution];
  let step = 0;
  for (step = 1; step <= 40; step++) {
    const a = analyzeProgram(d);
    const recs = buildRecommendations(d, a);
    if (!recs.length) {
      console.log(`ครั้งที่ ${step}: ไม่มีคำแนะนำแล้ว — คะแนน ${a.execution}/${a.ceiling}`);
      break;
    }
    const top = recs[0];
    console.log(`ครั้งที่ ${step}: [${a.execution}/${a.ceiling}] กด "${top.title}" (${top.kind})`);
    applyRecommendation(d, top);
    history.push(analyzeProgram(d).execution);
  }

  const final = analyzeProgram(d);
  const trained = DAYS.filter((day) => exercisesForDay(d, day).length > 0);

  console.log("\nตารางสุดท้าย:");
  for (const day of DAYS) {
    const exs = exercisesForDay(d, day);
    if (!exs.length) continue;
    console.log(`  ${DAY_TH[day].padEnd(8)} ${exs.length} ท่า ${exs.reduce((a, e) => a + e.sets, 0)} เซต`);
  }

  console.log(`เส้นทางคะแนน: ${history.join(" -> ")}`);
  if (final.execution < final.ceiling) {
    console.log("  breakdown:", final.breakdown);
    console.log("  issues:", final.issues);
    console.log("  blockedInsights:", final.blockedInsights);
  }
  // สิ่งที่ต้องรับประกัน: คำแนะนำต้องไม่ทำให้แย่ลง และต้องไม่ไป "รื้อ" ของที่ผู้ใช้จัดไว้
  //
  // เดิมห้ามเพิ่มวันฝึกเด็ดขาด แต่พอต้องพาตารางไปให้ถึงคะแนนเต็ม ตารางที่ฝึกน้อยวัน
  // ก็ติดเพดานถาวรโดยไม่มีอะไรให้กดต่อ · เกณฑ์จึงเปลี่ยนเป็น "ห้ามแตะวันเดิม"
  // คือวันที่ผู้ใช้ฝึกอยู่ต้องยังฝึกอยู่ และท่าเดิมต้องไม่ถูกย้ายข้ามวัน
  // ส่วนการเปิดวันที่ว่างอยู่แล้วเพิ่มถือว่าเป็นการเสนอทางเลือก ไม่ใช่การรื้อ
  ok(`${label}: คะแนนดีขึ้นจากเดิม`, final.execution >= start.execution, `${start.execution} -> ${final.execution}`);
  ok(`${label}: ไม่แย่ลงระหว่างทาง (ทุกก้าวคะแนนไม่ตก)`, history.every((h, i) => i === 0 || h >= history[i - 1]), history.join(" -> "));
  ok(`${label}: วันฝึกเดิมยังอยู่ครบ ไม่ถูกยุบ`, startDays.every((d) => trained.includes(d)),
     `เริ่ม [${startDays.join(",")}] จบ [${trained.join(",")}]`);
  ok(`${label}: ยังเหลือวันพักอย่างน้อย 1 วัน`, trained.length <= 6, `ฝึก ${trained.length} วัน`);
  ok(`${label}: ไม่ค้าง (จบภายใน 40 ครั้ง)`, step <= 40);
}

// สถานการณ์ 1: ตารางมีแค่วัน Push เดียว (ไม่มีขา ไม่มีหลังเลย) — เคสจริงที่คนเริ่มเล่นมักทำ
runScenario("มีแค่วัน Push เดียว", [
  mkEx("Barbell Bench Press", "mon", 4, 6, 10, 0),
  mkEx("Overhead Press", "mon", 3, 8, 12, 1),
]);

// สถานการณ์ 2: ตารางเละ — จัดวันสุ่มไม่ตรงกลุ่มกล้ามเนื้อ (เหมือนที่ผู้ใช้รายงานว่า "มั่ว")
runScenario("จัดวันสุ่มไม่เข้ากลุ่ม", [
  mkEx("Barbell Squat", "mon", 3, 6, 10, 0),
  mkEx("Barbell Bench Press", "mon", 3, 6, 10, 1),
  mkEx("Bicep Curl (Dumbbell)", "wed", 3, 10, 15, 0),
  mkEx("Leg Press", "fri", 3, 8, 12, 0),
]);

// สถานการณ์ 3: ตารางแขนล้วน (ไม่มีขาเลย ไม่มีหลังเลย) — เคสสุดโต่ง
runScenario("แขนล้วน ไม่มีขา/หลัง", [
  mkEx("Bicep Curl (Dumbbell)", "mon", 4, 10, 15, 0),
  mkEx("Tricep Pushdown", "mon", 4, 10, 15, 1),
  mkEx("Hammer Curl", "thu", 3, 10, 15, 0),
]);

console.log(`\n\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
