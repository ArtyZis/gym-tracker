// คำแนะนำต้อง "ทำแล้วเห็นผล" — ไม่งั้นผู้ใช้กดตามแล้วคะแนนเท่าเดิม แล้วเลิกเชื่อแอป
//
// เคสจริงที่ทำให้ต้องแก้: ผู้ใช้ตั้งระดับ "ขั้นสูง" (เกณฑ์น่องขั้นต่ำ 10 เซต) มีน่อง 8 เซต
// จากท่าน่อง 2 ท่า ท่าละ 4 เซต · เพดานต่อท่าคือ 5 เซต เพิ่มได้ท่าละ 1 เท่านั้น
// แอปเสนอ "เพิ่ม Standing Calf Raise 4->5" ซึ่งได้น่อง 9 เซต ยังไม่พ้นเกณฑ์ -> คะแนนเท่าเดิม
// ผู้ใช้กดแล้วเห็น 98 เหมือนเดิม เลยคิดว่าแอปโกหก

import { analyzeProgram, applyRecommendation, buildRecommendations, MAX_SETS_PER_EX } from "../src/lib/analyzer";
import { createDefault } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const ex = (id, name, day, sets) => ({ id, name, day, type: "weight", sets, rmin: 8, rmax: 12, inc: 2.5, unit: "kg", order: 0 });

/** ตารางที่สมดุลพอควร + น่องน้อยเกินเกณฑ์ของระดับที่ตั้งไว้ */
function withCalves(standing, seated, experience = "advanced") {
  const d = createDefault();
  d.profile = { experience };
  d.constraints = { maxSetsPerSession: 24 };
  d.exercises = [
    ex("bp", "Barbell Bench Press", "mon", 4),
    ex("ohp", "Overhead Press (DB)", "mon", 4),
    ex("dip", "Weighted Dips", "mon", 4),
    ex("fly", "Cable Fly", "mon", 4),
    ex("row", "Seated Cable Row", "tue", 4),
    ex("lat", "Lat Pulldown", "tue", 4),
    ex("curl", "Barbell Curl", "tue", 4),
    ex("face", "Face Pull", "tue", 4),
    ex("sq", "Barbell Back Squat", "wed", 4),
    ex("rdl", "Romanian Deadlift", "wed", 4),
    ex("lp", "Leg Press", "wed", 4),
    ex("scr", "Standing Calf Raise", "wed", standing),
    ex("sc2", "Seated Calf Raise", "fri", seated),
    ex("ext", "Leg Extension", "fri", 4),
    ex("lc", "Lying Leg Curl", "fri", 4),
  ];
  return d;
}

console.log("═══ 1. คำแนะนำที่ทำแล้วคะแนนไม่ขยับ ต้องไม่โผล่เป็นปุ่มให้กด ═══");
{
  // น่อง 8 เซต เกณฑ์ 10 · เพิ่มได้ท่าละ 1 (เพดาน 5) เพิ่มท่าเดียวไม่พ้นเกณฑ์
  const d = withCalves(4, 4);
  const a = analyzeProgram(d);
  const recs = buildRecommendations(d, a);
  const calf = a.stats.find((x) => x.muscle === "calves");
  ok("น่องต่ำกว่าเกณฑ์จริง (ตั้งฉากให้ถูก)", calf.status === "low", `${calf.sets} เซต ${calf.status}`);

  const useless = recs.filter((r) => r.gain <= 0);
  ok("ไม่มีคำแนะนำที่ได้ 0 คะแนนโผล่เลย", useless.length === 0, useless.map((r) => `${r.title}(gain ${r.gain})`).join(", "));

  // ต้องบอกความจริงแทน ไม่ใช่เงียบไปเฉยๆ
  const insight = a.blockedInsights.find((b) => /น่อง/.test(b.issue));
  ok("มีข้อสังเกตบอกว่าติดตรงไหนแทน", Boolean(insight), JSON.stringify(a.blockedInsights.map((b) => b.issue)));
  ok("บอกว่าต้องเพิ่มอีกกี่เซต", Boolean(insight && /เพิ่มอีก 2 เซต/.test(insight.whyCannotFix)), insight?.whyCannotFix?.slice(0, 90));
  ok("บอกว่าเพิ่มท่าเดียวไม่พอ", Boolean(insight && /ท่าเดียว/.test(insight.whyCannotFix)));
  ok("ไม่ตำหนิผู้ใช้ — บอกว่าปล่อยไว้ก็ได้", Boolean(insight && /ปล่อยไว้ก็ได้/.test(insight.realSolution)));
}

console.log("\n═══ 2. ทุกคำแนะนำที่โชว์ต้องได้คะแนนเพิ่มจริง ═══");
{
  const cases = [
    ["น่องน้อยมาก", withCalves(3, 3)],
    ["ไม่มีท่าน่องเลย", (() => { const d = withCalves(4, 4); d.exercises = d.exercises.filter((e) => !/calf/i.test(e.name)); return d; })()],
    ["ระดับปานกลาง", withCalves(3, 3, "intermediate")],
    ["ระดับเริ่มต้น", withCalves(3, 3, "beginner")],
  ];
  for (const [name, d] of cases) {
    const a = analyzeProgram(d);
    const recs = buildRecommendations(d, a);
    const bad = recs.filter((r) => r.gain <= 0);
    ok(`${name}: ไม่มีคำแนะนำไร้ผล (${recs.length} ข้อ)`, bad.length === 0, bad.map((r) => r.title).join(", "));
  }
}

console.log("\n═══ 3. กดตามแล้วคะแนนต้องขึ้นจริงตามที่บอก ═══");
{
  const d = withCalves(3, 3);
  const a = analyzeProgram(d);
  const recs = buildRecommendations(d, a);
  for (const r of recs) {
    const copy = JSON.parse(JSON.stringify(d));
    applyRecommendation(copy, r);
    const after = analyzeProgram(copy).score;
    ok(`"${r.title}" บอก +${r.gain} แล้วได้จริง`, after - a.score === r.gain, `บอก +${r.gain} ได้จริง +${after - a.score}`);
  }
}

console.log("\n═══ 4. จำนวนเซตที่เขียนบนการ์ด ต้องตรงกับที่กดแล้วได้จริง ═══");
{
  // ระดับปานกลาง เกณฑ์ 8 · น่อง 3+3=6 · ท่าเดียวเพิ่ม 3->5 ได้ 8 พอดี = ข้ามเกณฑ์ได้ในปุ่มเดียว
  // (ที่ระดับขั้นสูงเกณฑ์ 10 เพิ่มท่าเดียวไม่พอ ระบบจะไปเสนอเพิ่มท่าใหม่แทน จึงไม่มี increaseSets)
  const d = withCalves(3, 3, "intermediate");
  const recs = buildRecommendations(d, analyzeProgram(d));
  const bumps = recs.filter((r) => r.kind === "increaseSets");
  ok("มีคำแนะนำเพิ่มเซตให้ทดสอบ", bumps.length > 0);
  for (const r of bumps) {
    const before = d.exercises.find((e) => e.id === r.exerciseId).sets;
    const copy = JSON.parse(JSON.stringify(d));
    applyRecommendation(copy, r);
    const after = copy.exercises.find((e) => e.id === r.exerciseId).sets;
    ok(`"${r.title}" เพิ่มตรงตามที่เขียน`, after === Math.min(MAX_SETS_PER_EX, before + (r.addSets ?? 1)), `${before} -> ${after} (addSets ${r.addSets})`);
    ok(`"${r.title}" ข้อความตรงกับตัวเลขจริง`, r.detail.includes(String(after)), r.detail);
    ok(`"${r.title}" ไม่ทะลุเพดานต่อท่า`, after <= MAX_SETS_PER_EX, String(after));
  }
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
