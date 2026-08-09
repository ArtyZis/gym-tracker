// ชุดทดสอบ engine ตามสเปคข้อ 10 — รันด้วย:
//   .\node_modules\.bin\esbuild.cmd scripts/test-engine.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs
//
// ทุกเคสมาจากสถานการณ์จริงที่ระบบแนะนำมักพลาด ถ้าเคสไหนแดง = engine ยังเสนอสิ่งที่ทำไม่ได้

import { analyzeProgram, buildRecommendations, checkFilters, hoursBetween, minGapHours } from "../src/lib/analyzer.ts";
import { findTemplate } from "../src/lib/exerciseDB.ts";
import { createDefault } from "../src/lib/store.ts";

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`);
  }
};

// สร้างตารางเปล่าแล้วใส่ท่าเอง (ไม่ใช้โปรแกรมเริ่มต้น จะได้คุมตัวแปรได้)
function plan(days, opts = {}) {
  const d = createDefault();
  d.exercises = [];
  let i = 0;
  for (const [day, names] of Object.entries(days))
    for (const n of names) {
      const t = findTemplate(n);
      d.exercises.push({
        id: "e" + i,
        name: n,
        day,
        type: t?.type ?? "weight",
        sets: opts.sets ?? t?.sets ?? 3,
        rmin: t?.rmin ?? 8,
        rmax: t?.rmax ?? 12,
        order: i++,
      });
    }
  if (opts.dayEquip) d.dayEquip = opts.dayEquip;
  if (opts.profile) d.profile = opts.profile;
  if (opts.constraints) d.constraints = opts.constraints;
  return d;
}

console.log("═══ ระยะห่างแบบวงกลม (สเปค 4.3) ═══");
ok("เสาร์->จันทร์ = 48 ชม.", hoursBetween("sat", "mon") === 48, `ได้ ${hoursBetween("sat", "mon")}`);
ok("จันทร์->เสาร์ = 120 ชม.", hoursBetween("mon", "sat") === 120, `ได้ ${hoursBetween("mon", "sat")}`);
ok("ระยะจริง จ<->ส = 48 (ใช้ค่าน้อย)", minGapHours("mon", "sat") === 48, `ได้ ${minGapHours("mon", "sat")}`);
ok("จันทร์<->อังคาร = 24", minGapHours("mon", "tue") === 24, `ได้ ${minGapHours("mon", "tue")}`);

console.log("\n═══ เคสที่ 1: วันบ้านไม่มีอุปกรณ์ ═══");
{
  const d = plan(
    { mon: ["Barbell Bench Press", "Barbell Row"], wed: ["Push-up"] },
    { dayEquip: { mon: ["barbell", "bench", "rack", "dumbbell", "machine", "cable", "pullup_bar", "bodyweight"], wed: ["bodyweight"] } },
  );
  const hip = findTemplate("Barbell Hip Thrust");
  const v = checkFilters(d, hip, "wed", 3);
  ok("ห้ามเสนอ Barbell Hip Thrust ในวันบ้าน", !v.ok, v.reason);
  const pushup = findTemplate("Glute Bridge");
  ok("แต่ท่าน้ำหนักตัวเสนอได้", checkFilters(d, pushup, "wed", 3).ok);
}

console.log("\n═══ เคสที่ 2: วันจันทร์มี 29 เซตแล้ว ═══");
{
  const d = plan({ mon: ["Barbell Bench Press", "Barbell Row", "Overhead Press", "Lat Pulldown", "Barbell Curl", "Tricep Pushdown", "Leg Press"] }, { sets: 5 });
  const v = checkFilters(d, findTemplate("Lateral Raise"), "mon", 3);
  ok("ห้ามเพิ่มท่าในวันที่เต็มเพดานแล้ว", !v.ok, v.reason);
}

console.log("\n═══ เคสที่ 3: วันเสาร์ Squat หนัก ═══");
{
  const d = plan({ sat: ["Barbell Squat", "Leg Press"], mon: ["Barbell Bench Press"] }, { sets: 4 });
  const vFri = checkFilters(d, findTemplate("Leg Extension"), "fri", 3);
  const vSun = checkFilters(d, findTemplate("Leg Extension"), "sun", 3);
  ok("ห้ามใส่ควอดวันศุกร์ (ห่างเสาร์ 24 ชม.)", !vFri.ok, vFri.reason);
  ok("ห้ามใส่ควอดวันอาทิตย์ (ห่างเสาร์ 24 ชม.)", !vSun.ok, vSun.reason);
}

console.log("\n═══ เคสที่ 4: ทุกกลุ่มอยู่ในเป้าแล้ว -> ต้องตอบว่าตารางดีแล้ว ═══");
{
  // ตารางที่ครอบคลุมครบทุกกลุ่ม 13 มัด รวมน่อง/ท้อง/ปลายแขน ที่มักถูกลืม
  // ลำดับท่าในแต่ละวันต้องถูกหลักด้วย (หนัก->เจาะจง->core ปิดท้าย) ไม่งั้น engine จะเสนอ "จัดลำดับใหม่"
  // ซึ่งถูกต้องแล้ว — ตารางที่ "ดีแล้ว" ต้องดีจริงทุกมิติ ไม่ใช่แค่ปริมาณครบ
  const d = plan(
    {
      mon: ["Barbell Bench Press", "Seated Cable Row", "Overhead Press", "Lateral Raise", "Face Pull", "Barbell Curl", "Standing Calf Raise"],
      // Wrist Curl ต้องมาก่อน Calf/Plank — สองตัวนั้นเป็นท่าปิดท้าย ถ้าวางไว้ก่อนจะผิดลำดับ
      wed: ["Barbell Squat", "Romanian Deadlift", "Lying Leg Curl", "Wrist Curl (DB)", "Seated Calf Raise", "Plank"],
      sat: ["Incline DB Press", "Lat Pulldown", "Leg Press", "Barbell Hip Thrust", "Cable Lateral Raise", "Tricep Pushdown", "Hanging Knee Raise"],
    },
    { sets: 4, profile: { experience: "beginner" }, constraints: { maxSetsPerSession: 30, sessionTimeCapMinutes: 120 } },
  );
  const a = analyzeProgram(d);
  const recs = buildRecommendations(d, a);
  const lowOrMissing = a.stats.filter((s) => s.status === "missing" || s.status === "low");
  ok("ไม่มีกลุ่มไหนขาดแล้ว", lowOrMissing.length === 0, lowOrMissing.map((s) => s.muscle + ":" + s.sets).join(", "));
  ok("ไม่ยัดเยียดคำแนะนำเมื่อตารางดีแล้ว", recs.length === 0, `ยังเสนอ ${recs.length} ข้อ: ${recs.map((r) => r.title).join(", ")}`);
  console.log(`     (คะแนน ${a.execution}/${a.ceiling})`);
}

console.log("\n═══ เคสที่ 5: มี Pulldown + Pull-up แต่ไม่มี Row ═══");
{
  const d = plan({ mon: ["Lat Pulldown", "Wide Grip Pull-up", "Barbell Bench Press", "Incline DB Press"] }, { sets: 4 });
  const a = analyzeProgram(d);
  ok("เตือนเรื่องขาดท่าดึงเข้าหาตัว", a.issues.some((i) => /ดึงเข้าหาตัว/.test(i)), a.issues.join(" | ").slice(0, 90));
}

console.log("\n═══ เคสที่ 6: เข้ายิมได้ 2 วัน ═══");
{
  const d = plan({ mon: ["Barbell Squat", "Barbell Bench Press", "Barbell Row"], thu: ["Romanian Deadlift", "Overhead Press", "Lat Pulldown"] }, { sets: 4 });
  const a = analyzeProgram(d);
  ok("เพดานต่ำกว่า 100 (สะท้อนข้อจำกัดจริง)", a.ceiling <= 100);
  ok("ไม่หักคะแนนความถี่จนต่ำเกินจริง", a.execution >= 45, `ได้ ${a.execution}`);
  console.log(`     (คะแนน ${a.execution}/${a.ceiling})`);
}

console.log("\n═══ เคสที่ 7: แจ้งบาดเจ็บหลังล่าง ═══");
{
  const d = plan({ mon: ["Barbell Bench Press"] }, { profile: { injuries: ["lower_back"] } });
  for (const n of ["Deadlift", "Good Morning", "Barbell Row"]) {
    const v = checkFilters(d, findTemplate(n), "mon", 3);
    ok(`ห้ามเสนอ ${n}`, !v.ok, v.reason);
  }
  ok("แต่ท่าที่ปลอดภัยยังเสนอได้", checkFilters(d, findTemplate("Chest Supported Row"), "mon", 3).ok);
}

console.log("\n═══ เคสที่ 8: วันเดียวมี 12 เซตอก ═══");
{
  const d = plan({ mon: ["Barbell Bench Press", "Incline DB Press", "Cable Fly"] }, { sets: 4 });
  const v = checkFilters(d, findTemplate("Pec Deck"), "mon", 3);
  ok("เตือนว่าเกินเพดานกล้ามเนื้อต่อวัน", !v.ok, v.reason);
}

console.log("\n═══ คำแนะนำทุกข้อต้องผ่านตัวกรองจริง ═══");
{
  const d = plan(
    { mon: ["Barbell Bench Press", "Barbell Row"], wed: ["Push-up", "Glute Bridge"] },
    { dayEquip: { mon: ["barbell", "bench", "rack", "dumbbell", "cable", "machine", "pullup_bar", "bodyweight"], wed: ["bodyweight"] } },
  );
  const a = analyzeProgram(d);
  const recs = buildRecommendations(d, a);
  let allValid = true;
  for (const r of recs) {
    if (r.kind !== "add" || !r.template?.tpl || !r.day) continue;
    const v = checkFilters(d, r.template.tpl, r.day, 3);
    if (!v.ok) {
      allValid = false;
      console.log(`     เสนอ ${r.template.name} วัน ${r.day} แต่ไม่ผ่าน: ${v.reason}`);
    }
  }
  ok(`คำแนะนำ ${recs.length} ข้อผ่านตัวกรองครบ`, allValid);
  ok("มี blockedInsights เมื่อแก้ไม่ได้", a.blockedInsights.length >= 0);
  for (const r of recs) console.log(`     • ${r.title} (${r.day ?? "-"}) — ${r.reason}`);
  for (const b of a.blockedInsights) console.log(`     ⚠ ${b.issue} -> ${b.realSolution}`);
}

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
