// ฟีเจอร์ 3-8: บาร์ · ตั้งน้ำหนักเริ่มต้น · โภชนาการ · การนอน · tier S · ความสม่ำเสมอ
// ใช้ตารางจริงของผู้ใช้ (PPL x2 ฝึก 6 วัน พักศุกร์) เป็นฐานทดสอบ
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-features.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { adherence, analyzeProgram, buildRecommendations, candidatesFor } from "../src/lib/analyzer.ts";
import { findTemplate, tierOf } from "../src/lib/exerciseDB.ts";
import { barKgFor, epley1RM, estimate1RMs, plateCalc, plateText, seedTargets, suggestTarget, usesPlates } from "../src/lib/progression.ts";
import { nutritionStreak, sleepSummary, weightAdvice, weightTrend, MIN_DAYS_FOR_TREND } from "../src/lib/recovery.ts";
import { createDefault, createEmpty, normalizeData, uid } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`); }
};
const mkEx = (name, day, sets, rmin, rmax, order, extra = {}) => ({
  id: uid() + Math.random(), name, day, type: "weight", sets, rmin, rmax, inc: 2.5, unit: "kg", order, ...extra,
});
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// ตารางจริงของผู้ใช้ — PPL x2 หนัก/ปริมาณ พักศุกร์
function realProgram() {
  const d = Object.assign(createDefault(), createEmpty());
  d.dayLabels = { mon: "Push หนัก", tue: "Pull หนัก", wed: "Legs หนัก", thu: "Push ปริมาณ", fri: "", sat: "Pull ปริมาณ", sun: "Legs ปริมาณ" };
  d.exercises = [
    mkEx("Barbell Bench Press", "mon", 4, 5, 5, 0), mkEx("Standing Overhead Press", "mon", 3, 6, 6, 1),
    mkEx("Incline DB Press", "mon", 3, 8, 8, 2), mkEx("Weighted Dips", "mon", 3, 8, 8, 3),
    mkEx("Cable Lateral Raise", "mon", 4, 12, 12, 4), mkEx("Overhead Cable Tricep Extension", "mon", 3, 10, 10, 5),

    mkEx("Barbell Deadlift", "tue", 4, 5, 5, 0), mkEx("Weighted Pull-up", "tue", 4, 6, 6, 1),
    mkEx("Barbell Row", "tue", 3, 8, 8, 2), mkEx("Chest-Supported Row", "tue", 3, 10, 10, 3),
    mkEx("Face Pull", "tue", 3, 15, 15, 4), mkEx("Barbell Curl", "tue", 3, 8, 8, 5),

    mkEx("Barbell Back Squat", "wed", 5, 5, 5, 0), mkEx("Romanian Deadlift", "wed", 3, 8, 8, 1),
    mkEx("Hack Squat", "wed", 3, 10, 10, 2), mkEx("Seated Leg Curl", "wed", 3, 12, 12, 3),
    mkEx("Standing Calf Raise", "wed", 4, 10, 10, 4), mkEx("Hanging Leg Raise", "wed", 3, 1, 99, 5, { amrap: true }),

    mkEx("Incline Barbell Bench Press", "thu", 4, 8, 8, 0), mkEx("Seated DB Shoulder Press", "thu", 3, 10, 10, 1),
    mkEx("Cable Fly", "thu", 3, 12, 12, 2), mkEx("Weighted Dips", "thu", 3, 10, 10, 3),
    mkEx("Cable Lateral Raise", "thu", 4, 15, 15, 4), mkEx("Cable Tricep Pushdown", "thu", 3, 15, 15, 5),

    mkEx("Lat Pulldown", "sat", 4, 10, 10, 0), mkEx("Seated Cable Row", "sat", 4, 10, 10, 1),
    mkEx("Single-Arm DB Row", "sat", 3, 12, 12, 2), mkEx("Straight-Arm Cable Pullover", "sat", 3, 12, 12, 3),
    mkEx("Rear Delt Cable Fly", "sat", 4, 15, 15, 4), mkEx("Incline DB Curl", "sat", 3, 12, 12, 5),
    mkEx("Hammer Curl", "sat", 3, 12, 12, 6),

    mkEx("Front Squat", "sun", 4, 8, 8, 0), mkEx("Bulgarian Split Squat", "sun", 3, 10, 10, 1),
    mkEx("Leg Press", "sun", 3, 12, 12, 2), mkEx("Leg Extension", "sun", 3, 15, 15, 3),
    mkEx("Lying Leg Curl", "sun", 3, 15, 15, 4), mkEx("Seated Calf Raise", "sun", 4, 15, 15, 5),
    mkEx("Ab Wheel Rollout", "sun", 3, 12, 12, 6),
  ];
  return d;
}

console.log("═══ ตารางจริงของผู้ใช้: ชื่อท่าต้องจับคู่คลังได้ครบ ═══");
{
  const d = realProgram();
  const miss = d.exercises.filter((e) => !findTemplate(e.name));
  ok("ทุกท่าจับคู่คลังได้", miss.length === 0, miss.map((e) => e.name).join(", "));

  const a = analyzeProgram(d);
  console.log(`  คะแนน ${a.execution}/${a.ceiling} · ฝึก 6 วัน พักศุกร์ · consecutive=${a.consecutive}`);
  ok("ตาราง PPL x2 ที่ถูกหลักไม่ถูกลงโทษเรื่องฝึกติดกัน", a.execution >= 80, `ได้ ${a.execution}`);
  ok("ทุกกลุ่มกล้ามเนื้อไม่ขาด", a.stats.filter((s) => s.status === "missing").length === 0);
}

console.log("\n═══ ฟีเจอร์ 3: น้ำหนักบาร์ ═══");
{
  const d = realProgram();
  ok("เป้าน้อยกว่าบาร์ = บาร์เปล่า ไม่ใช่เลขติดลบ", plateCalc(15, 20).barOnly === true && plateCalc(15, 20).leftover === 0);
  ok("60 กก. บาร์ 20 = แผ่น 20 ข้างละแผ่น", plateCalc(60, 20).list.join("+") === "20", plateCalc(60, 20).list.join("+"));

  const bench = d.exercises.find((e) => e.name === "Barbell Bench Press");
  ok("บาร์ค่ากลาง 20 กก.", barKgFor(d, bench) === 20);
  bench.barKg = 15;
  ok("ตั้งบาร์รายท่าได้ (ทับค่ากลาง)", barKgFor(d, bench) === 15);
  // ค่าเริ่มต้นคือไม่นับบาร์ (บันทึกแค่แผ่น) — ฟีเจอร์บาร์รายท่าใช้เมื่อเปิดโหมดนับบาร์เท่านั้น
  ok("ไม่นับบาร์ = ข้อความไม่พูดถึงบาร์", !/บาร์/.test(plateText(d, bench, 55) ?? ""), plateText(d, bench, 55));
  d.settings.countBarWeight = true;
  ok("เปิดนับบาร์แล้วคำนวณจากบาร์ของท่านั้น", plateText(d, bench, 55) === "บาร์ 15 + (20)×2", plateText(d, bench, 55));

  const cable = d.exercises.find((e) => e.name === "Cable Fly");
  ok("ท่าเคเบิลไม่คิดเรื่องแผ่น", usesPlates(d, cable) === false && plateText(d, cable, 30) === null);
}

console.log("\n═══ ฟีเจอร์ 4: ตั้งน้ำหนักเริ่มต้นจาก 1RM ═══");
{
  ok("Epley: 100 กก. x 5 ครั้ง ≈ 117", Math.round(epley1RM(100, 5)) === 117, String(epley1RM(100, 5)));
  ok("1 ครั้ง = 1RM ตรงตัว", epley1RM(80, 1) === 80);

  const d = realProgram();
  const oneRM = estimate1RMs({ bench: { weight: 70, reps: 5 }, squat: { weight: 90, reps: 5 }, deadlift: { weight: 110, reps: 5 }, ohp: { weight: 45, reps: 5 } });
  ok("ประเมิน 1RM ครบ 4 ท่า", Object.keys(oneRM).length === 4, JSON.stringify(oneRM));

  const seeds = seedTargets(d, oneRM);
  ok("ประเมินเป้าให้หลายท่า", seeds.length >= 8, `ได้ ${seeds.length} ท่า`);
  const sq = seeds.find((s) => s.name === "Barbell Back Squat");
  ok("สควอทได้เป้าใกล้เคียงที่กรอก (90x5 -> เป้า 5 ครั้ง ≈ 90)", sq && Math.abs(sq.weight - 90) <= 5, JSON.stringify(sq));
  const fs = seeds.find((s) => s.name === "Front Squat");
  ok("ฟรอนต์สควอทเบากว่าแบ็คสควอท", fs && sq && fs.weight < sq.weight, `${fs?.weight} vs ${sq?.weight}`);

  // ค่าประมาณต้องไม่ปนกับประวัติจริง
  const before = JSON.stringify(d.history);
  for (const s of seeds) d.exercises.find((e) => e.id === s.exId).seededTarget = s.weight;
  ok("ค่าประมาณไม่เขียนลง history", JSON.stringify(d.history) === before);
  const withSeed = d.exercises.find((e) => e.seededTarget);
  const t = suggestTarget(d, withSeed);
  ok("suggestTarget ใช้ค่าประมาณและบอกชัดว่าเป็นค่าประมาณ",
     t.weight === withSeed.seededTarget && /ประมาณ/.test(t.msg), JSON.stringify(t));
}

console.log("\n═══ ฟีเจอร์ 5: น้ำหนักตัว + โภชนาการ ═══");
{
  const d = realProgram();
  d.bodyweight = [{ date: daysAgo(2), kg: 61.5 }, { date: daysAgo(1), kg: 61.8 }, { date: daysAgo(0), kg: 61.6 }];
  ok("ข้อมูล 3 วัน -> ห้ามสรุปแนวโน้ม", weightAdvice(d).tone === "wait", weightAdvice(d).msg);
  ok("รู้ว่ายังไม่พอ", weightTrend(d).enough === false);

  // 14 วัน: สัปดาห์ก่อน 61.0 -> สัปดาห์นี้ 61.35 = +0.35 อยู่ในเป้า 0.25-0.4
  d.bodyweight = [];
  for (let i = 13; i >= 7; i--) d.bodyweight.push({ date: daysAgo(i), kg: 61.0 });
  for (let i = 6; i >= 0; i--) d.bodyweight.push({ date: daysAgo(i), kg: 61.35 });
  ok(`ข้อมูล 14 วัน -> สรุปได้`, weightTrend(d).enough === true);
  ok("อัตราขึ้นอยู่ในเป้า -> ตอบ ok", weightAdvice(d).tone === "ok", weightAdvice(d).msg);

  for (let i = 6; i >= 0; i--) d.bodyweight[7 + (6 - i)] = { date: daysAgo(i), kg: 62.5 };
  ok("ขึ้นเร็วเกิน -> เตือนให้ลดแคล", weightAdvice(d).tone === "fast", weightAdvice(d).msg);

  d.nutritionLog = [{ date: daysAgo(2), hit: true }, { date: daysAgo(1), hit: true }, { date: daysAgo(0), hit: true }];
  ok("สตรีคการกิน 3 วัน", nutritionStreak(d) === 3, String(nutritionStreak(d)));
  d.nutritionLog[1].hit = false;
  ok("กินไม่ถึงเป้า 1 วัน = สตรีคขาด", nutritionStreak(d) === 1, String(nutritionStreak(d)));
}

console.log("\n═══ ฟีเจอร์ 6: การนอน ═══");
{
  const d = realProgram();
  ok("ไม่มีข้อมูล -> ไม่สรุปว่าฟื้นตัวไม่ทัน", sleepSummary(d).underRecovered === false);

  d.sleepLog = [];
  for (let i = 4; i >= 0; i--) d.sleepLog.push({ date: daysAgo(i), hours: 6.0 });
  const s = sleepSummary(d);
  ok("นอน 6 ชม. ติดกัน 5 วัน = ฟื้นตัวไม่ทัน", s.underRecovered === true, JSON.stringify(s));

  const a = analyzeProgram(d);
  const recs = buildRecommendations(d, a);
  ok("นอนไม่พอ -> ไม่เสนอเพิ่มท่า/เพิ่มเซต",
     !recs.some((r) => r.kind === "add" || r.kind === "increaseSets"), recs.map((r) => r.kind).join(","));
  ok("บอกว่าคอขวดอยู่ที่การนอน", a.blockedInsights.some((b) => /นอน/.test(b.issue)),
     a.blockedInsights.map((b) => b.issue).join(" | "));

  d.sleepLog = d.sleepLog.map((x) => ({ ...x, hours: 8 }));
  ok("นอนพอแล้ว -> กลับมาเสนอได้ตามปกติ", sleepSummary(d).underRecovered === false);
}

console.log("\n═══ ฟีเจอร์ 7: ลำดับท่าที่เสนอ ═══");
{
  // ถอดโหมด "เสนอเฉพาะท่า tier S" ออกแล้ว — หลายมัดไม่มีท่า tier S เลยเพราะต้องใช้ isolation
  // โหมดนั้นจึงต้องมีข้อยกเว้นเต็มไปหมดจนสับสน · เหลือแค่เรียง S ขึ้นก่อนซึ่งได้ผลดีกว่า
  const all = candidatesFor("chest");
  ok("เสนอท่าอกได้หลายตัวเลือก", all.length > 3, `ได้ ${all.length} ท่า`);
  ok("ท่าแรกที่เสนอเป็น tier S", tierOf(all[0].name) === "S", `${all[0].name} = ${tierOf(all[0].name)}`);

  // ไหล่ข้างไม่มีท่า tier S เลย (ต้องใช้ isolation) — ต้องยังเสนอท่าให้ได้
  const side = candidatesFor("side_delts");
  ok("กล้ามเนื้อที่ไม่มีท่า tier S ยังได้ท่าเสนอ", side.length > 0, `ได้ ${side.length} ท่า`);
}

console.log("\n═══ ฟีเจอร์ 8: ความสม่ำเสมอ ═══");
{
  const d = realProgram();
  // ตั้งไว้ 6 วัน/สัปดาห์ x 3 สัปดาห์ = 18 ครั้ง แต่ทำจริง 12 ครั้ง (67%)
  let n = 0;
  for (let i = 0; i < 20 && n < 12; i++) {
    if (i % 5 === 0) continue;
    const ex = d.exercises[n % d.exercises.length];
    (d.history[ex.id] ??= []).push({ date: daysAgo(i), sets: [{ weight: 50, reps: 8 }] });
    n++;
  }
  const adh = adherence(d);
  ok("คำนวณความสม่ำเสมอได้", adh.planned === 18 && adh.done === 12, JSON.stringify(adh));
  ok("ต่ำกว่า 75% -> ตั้งธง low", adh.low === true, `${adh.pct}%`);

  const a = analyzeProgram(d);
  buildRecommendations(d, a);
  ok("บอกเป็นข้อสังเกต ไม่ลดวันให้เอง", a.blockedInsights.some((b) => /สัปดาห์ล่าสุดทำได้/.test(b.issue)),
     a.blockedInsights.map((b) => b.issue).join(" | "));
  ok("ไม่มีคำแนะนำชนิดที่รื้อตาราง",
     !buildRecommendations(d, analyzeProgram(d)).some((r) => ["addDay", "restDay", "splitDay", "reorder"].includes(r.kind)));
}

console.log("\n═══ migration: ฟิลด์ใหม่ทั้งหมดต้องไม่ทำข้อมูลเก่าพัง ═══");
{
  const old = normalizeData({
    dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
    exercises: [{ id: "x1", name: "Bench Press", day: "mon", type: "weight", sets: 4, rmin: 8, rmax: 10, order: 0 }],
    history: { x1: [{ date: "2026-07-01", sets: [{ weight: 60, reps: 8 }] }] },
    settings: { autoRest: true, restDefault: 90, barWeight: 20 },
  });
  ok("ข้อมูลเก่าผ่าน normalize", old !== null && old.history.x1[0].sets[0].weight === 60);
  ok("ฟิลด์ใหม่เป็น undefined ไม่บังคับสร้าง",
     old.sleepLog === undefined && old.nutritionLog === undefined && old.dayWindows === undefined && old.dayFirstCommitment === undefined);
  ok("เซตเก่าที่ไม่มี timestamp ยังอ่านได้", old.history.x1[0].sets[0].at === undefined);

  const junk = normalizeData({
    dayLabels: {}, exercises: [], history: {}, settings: {},
    sleepLog: [{ date: "2026-07-01", hours: 7 }, "PWNED", { date: 123, hours: "x" }],
    nutritionLog: "PWNED",
    dayFirstCommitment: { mon: "08:00", tue: 999 },
    profile: { nutrition: { kcal: "PWNED", protein: 130 } },
  });
  ok("sleepLog ทิ้งแถวเสีย เก็บแถวดี", junk.sleepLog.length === 1 && junk.sleepLog[0].hours === 7, JSON.stringify(junk.sleepLog));
  ok("nutritionLog ชนิดผิด -> undefined", junk.nutritionLog === undefined);
  ok("dayFirstCommitment ทิ้งค่าที่ไม่ใช่สตริง", junk.dayFirstCommitment.mon === "08:00" && junk.dayFirstCommitment.tue === undefined);
  ok("เป้าโภชนาการ shape ผิด -> ทิ้ง", junk.profile.nutrition === undefined);
}

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
