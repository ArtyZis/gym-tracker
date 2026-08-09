// ตารางอ้างอิง — เกณฑ์ว่า "ตารางที่ดีหน้าตาเป็นยังไง"
//
// PPL×2 หกวันพักศุกร์ ที่ผู้ใช้ใช้จริง · ต้องได้ 100 คะแนนเต็มเสมอ
// ถ้าวันหนึ่งแก้ตัววิเคราะห์แล้วตารางนี้ตกจาก 100 แปลว่าเกณฑ์ใหม่เข้มเกินจริง
// ไม่ใช่ตารางแย่ลง — ให้กลับไปดูเกณฑ์ก่อน
//
// และต้องคู่กับการพิสูจน์ว่าตารางที่แย่จริงยังได้คะแนนต่ำ ไม่งั้นการผ่อนเกณฑ์
// จะกลายเป็นการทำให้ทุกตารางได้ 100 ซึ่งทำให้คะแนนไม่มีความหมาย
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-reference.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { analyzeProgram } from "../src/lib/analyzer.ts";
import { createDefault, createEmpty } from "../src/lib/store.ts";
import { findTemplate, incFor, isMachineEx, unitFor } from "../src/lib/exerciseDB.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };

// [ชื่อท่า, เซต, ครั้ง]  ('amrap' = ทำให้สุด)
const REFERENCE = {
  mon: ["Push หนัก", [
    ["Barbell Bench Press", 4, 5], ["Overhead Press", 3, 6], ["Incline DB Press", 3, 8],
    ["Dip", 3, 8], ["Cable Lateral Raise", 4, 12], ["Overhead Tricep Extension", 3, 10],
  ]],
  tue: ["Pull หนัก", [
    ["Deadlift", 4, 5], ["Pull-up", 4, 6], ["T-Bar Row", 3, 8],
    ["Cable Pullover", 3, 12], ["Face Pull", 3, 15], ["Barbell Curl", 3, 8],
  ]],
  wed: ["Legs หนัก", [
    ["Barbell Squat", 5, 5], ["Romanian Deadlift", 3, 8], ["Hack Squat", 3, 10],
    ["Seated Leg Curl", 3, 12], ["Standing Calf Raise", 4, 10], ["Hanging Leg Raise", 3, "amrap"],
  ]],
  thu: ["Push ปริมาณ", [
    ["Incline Barbell Press", 4, 8], ["Overhead Press", 3, 10], ["Cable Fly", 3, 12],
    ["Dip", 3, 10], ["Cable Lateral Raise", 4, 15], ["Tricep Pushdown", 3, 15],
  ]],
  sat: ["Pull ปริมาณ", [
    ["Lat Pulldown", 4, 10], ["Seated Cable Row", 4, 10], ["Dumbbell Row", 3, 12],
    ["Cable Pullover", 3, 12], ["Rear Delt Fly", 4, 15], ["Incline DB Curl", 3, 12], ["Hammer Curl", 3, 12],
  ]],
  sun: ["Legs ปริมาณ", [
    ["Front Squat", 4, 8], ["Bulgarian Split Squat", 3, 10], ["Leg Press", 3, 12],
    ["Leg Extension", 3, 15], ["Lying Leg Curl", 3, 15], ["Seated Calf Raise", 4, 15], ["Hanging Leg Raise", 3, "amrap"],
  ]],
};

function build(program) {
  const d = Object.assign(createDefault(), createEmpty());
  let order = 0;
  for (const [day, [label, list]] of Object.entries(program)) {
    d.dayLabels[day] = label;
    for (const [name, sets, reps] of list) {
      const t = findTemplate(name);
      if (!t) throw new Error(`ไม่เจอท่า "${name}" ในคลัง`);
      const amrap = reps === "amrap";
      d.exercises.push({
        id: "x" + order, name, day, order: order++,
        type: t.type === "bodyweight" && !amrap ? "weight" : t.type,
        sets, rmin: amrap ? 1 : reps, rmax: amrap ? 999 : reps,
        ...(amrap ? { amrap: true } : {}),
        unit: unitFor(t), inc: incFor(t), ...(isMachineEx(t) ? { machine: true } : {}),
      });
    }
  }
  return d;
}

console.log("═══ 1. ชื่อท่าทุกตัวต้องตรงคลังเป๊ะ ═══");
{
  // สะกดไม่ตรง = findTemplate เดาผิดท่า แล้วทั้งการวิเคราะห์และการแนะนำน้ำหนักเพี้ยนเงียบๆ
  // (เคสจริง: "Incline Barbell Bench Press" ไปตรงกับ "Barbell Bench Press" ซึ่งเป็นท่าราบ)
  let bad = [];
  for (const [, list] of Object.values(REFERENCE))
    for (const [name] of list) {
      const t = findTemplate(name);
      if (!t || t.name !== name) bad.push(`${name} -> ${t?.name ?? "ไม่เจอ"}`);
    }
  ok("ทุกชื่อตรงกับคลัง", bad.length === 0, bad.join(" | "));
}

console.log("\n═══ 2. ตารางอ้างอิงต้องได้ 100 เต็ม ═══");
const ref = analyzeProgram(build(REFERENCE));
console.log(`   ได้ ${ref.execution} / เพดาน ${ref.ceiling} — "${ref.headline}"`);
for (const [k, v] of Object.entries(ref.breakdown)) console.log(`     ${k.padEnd(11)} ${Math.round(v * 100)}%`);
ok("คะแนนเต็ม 100", ref.execution === 100, `ได้ ${ref.execution} · ${(ref.issues ?? []).slice(0, 3).join(" | ")}`);
ok("เพดานเต็ม 100", ref.ceiling === 100, `ได้ ${ref.ceiling}`);
for (const [k, v] of Object.entries(ref.breakdown)) ok(`หมวด ${k} เต็ม`, v >= 0.999, `${Math.round(v * 100)}%`);
ok("ไม่มีมัดไหนหลุดเกณฑ์", ref.stats.every((s) => s.status === "good"), ref.stats.filter((s) => s.status !== "good").map((s) => `${s.muscle}:${s.status}`).join(", "));

console.log("\n═══ 3. ตารางที่แย่จริงต้องยังได้คะแนนต่ำ ═══");
const bads = {
  "ดันอย่างเดียว ไม่มีดึงเลย": {
    mon: ["", [["Barbell Bench Press", 4, 8], ["Incline DB Press", 4, 10], ["Overhead Press", 4, 10], ["Cable Fly", 4, 12], ["Tricep Pushdown", 4, 12]]],
    thu: ["", [["Barbell Bench Press", 4, 8], ["Dip", 4, 10], ["Cable Lateral Raise", 4, 15], ["Overhead Tricep Extension", 4, 12]]],
  },
  "ท่าหนักมัดเดิมสองวันติด": {
    mon: ["", [["Deadlift", 5, 5], ["Barbell Row", 4, 6], ["Pull-up", 4, 6]]],
    tue: ["", [["Romanian Deadlift", 5, 6], ["Barbell Squat", 5, 5], ["Seated Leg Curl", 4, 8]]],
  },
  "ลำดับมั่ว: น่อง/ท้องก่อนสควอท": {
    mon: ["", [["Standing Calf Raise", 4, 15], ["Hanging Leg Raise", 3, "amrap"], ["Leg Extension", 3, 15], ["Barbell Squat", 5, 5], ["Front Squat", 4, 8]]],
    thu: ["", [["Cable Lateral Raise", 4, 15], ["Tricep Pushdown", 4, 15], ["Barbell Bench Press", 4, 5], ["Overhead Press", 4, 6]]],
  },
  "อัดวันเดียว 40 เซต": {
    mon: ["", [["Barbell Bench Press", 8, 8], ["Barbell Squat", 8, 8], ["Deadlift", 8, 5], ["Pull-up", 8, 8], ["Overhead Press", 8, 8]]],
  },
};
for (const [label, prog] of Object.entries(bads)) {
  const a = analyzeProgram(build(prog));
  console.log(`   ${String(a.execution).padStart(3)} — ${label}`);
  ok(`"${label}" ต้องต่ำกว่า 90`, a.execution < 90, `ได้ ${a.execution}`);
}
{
  const a = analyzeProgram(build(bads["ท่าหนักมัดเดิมสองวันติด"]));
  ok("ท่าหนักชนกันยังถูกจับได้ (recovery ไม่เต็ม)", a.breakdown.recovery < 1, `${Math.round(a.breakdown.recovery * 100)}%`);
}
{
  const a = analyzeProgram(build(bads["ลำดับมั่ว: น่อง/ท้องก่อนสควอท"]));
  ok("ลำดับมั่วยังถูกจับได้ (order ไม่เต็ม)", a.breakdown.order < 1, `${Math.round(a.breakdown.order * 100)}%`);
}

console.log("\n═══ 4. เปิดแอปครั้งแรกต้องว่างเปล่า ═══");
{
  const fresh = createDefault();
  ok("ไม่มีท่าติดมาให้", fresh.exercises.length === 0, `มี ${fresh.exercises.length} ท่า`);
  ok("ไม่มีชื่อวันติดมาให้", Object.values(fresh.dayLabels).every((v) => v === ""), JSON.stringify(fresh.dayLabels));
  ok("วิเคราะห์ตารางว่างแล้วไม่พัง", Number.isFinite(analyzeProgram(fresh).execution));
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
