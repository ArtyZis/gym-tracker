// ข้อมูลผู้ใช้เก่าต้องอ่านได้ครบ ไม่หายแม้แต่เซตเดียว — กฎเหล็กข้อ 1
//
// ทุกฟีเจอร์ที่เพิ่มมาทีหลังใส่ฟิลด์ใหม่เข้า Data/Exercise/Settings ถ้าตัวอ่านข้อมูล
// เผลอทิ้งของที่ไม่รู้จัก หรือ default ผิดทาง ประวัติการฝึกที่สะสมมาเป็นปีหายถาวร
// (ไม่มี backend ไม่มี backup — หายคือหายจริง)
//
// เทสต์นี้ใช้ก้อนข้อมูลที่เหมือนของผู้ใช้จริงในเวอร์ชันเก่าๆ แล้วยืนยันว่า:
//   1. ทุกเซตที่เคยติ๊กยังอยู่ครบ
//   2. ฟิลด์ที่ไม่มีในเวอร์ชันนั้นได้ default ที่แปลว่า "พฤติกรรมเดิม"
//   3. ตัวเลขที่ผู้ใช้เห็น (สถิติ/สตรีค/แรงค์) ไม่เปลี่ยนไปจากเดิม

import { normalizeData, createDefault, DAYS, exercisesForDay, repTargetText, todayStr } from "../src/lib/store";
import { bestLifts, computeRank } from "../src/lib/rank";
import { computeStreak } from "../src/lib/streak";
import { analyzeProgram, buildRecommendations } from "../src/lib/analyzer";
import { suggestTarget, stepFor, countsBar, minPlate } from "../src/lib/progression";
import { getLang } from "../src/lib/i18n";

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name + (extra ? " — " + extra : "")); }
};

const countSets = (d) => Object.values(d.history || {}).reduce((a, ss) => a + ss.reduce((b, s) => b + s.sets.filter(Boolean).length, 0), 0);

// ══════════ ก้อนข้อมูล "รุ่นเก่ามาก" — ก่อนมีรอบ/ชดเชย/แผ่น/ภาษา/RIR ══════════
const ANCIENT = {
  dayLabels: { mon: "อก", tue: "หลัง", wed: "", thu: "ขา", fri: "", sat: "", sun: "" },
  exercises: [
    { id: "a1", name: "Barbell Bench Press", day: "mon", type: "weight", sets: 4, rmin: 5, rmax: 8, inc: 2.5, unit: "kg", order: 0 },
    { id: "a2", name: "Dumbbell Fly", day: "mon", type: "weight", sets: 3, rmin: 10, rmax: 15, inc: 2, unit: "kg", order: 1 },
    { id: "b1", name: "Barbell Row", day: "tue", type: "weight", sets: 4, rmin: 6, rmax: 10, inc: 2.5, unit: "kg", order: 0 },
    { id: "c1", name: "Barbell Squat", day: "thu", type: "weight", sets: 5, rmin: 5, rmax: 5, inc: 5, unit: "kg", order: 0 },
    { id: "c2", name: "Plank", day: "thu", type: "time", sets: 3, rmin: 30, rmax: 60, order: 1 },
    { id: "c3", name: "Pull-up", day: "tue", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, order: 1 },
  ],
  history: {
    a1: [
      { date: "2026-05-04", sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 7 }, { weight: 60, reps: 6 }, { weight: 60, reps: 6 }] },
      { date: "2026-05-11", sets: [{ weight: 62.5, reps: 8 }, { weight: 62.5, reps: 7 }, { weight: 62.5, reps: 7 }, { weight: 62.5, reps: 6 }] },
    ],
    a2: [{ date: "2026-05-04", sets: [{ weight: 12, reps: 15 }, { weight: 12, reps: 14 }, { weight: 12, reps: 12 }] }],
    b1: [{ date: "2026-05-05", sets: [{ weight: 70, reps: 10 }, { weight: 70, reps: 9 }, { weight: 70, reps: 8 }, { weight: 70, reps: 8 }] }],
    c1: [{ date: "2026-05-07", sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 4 }] }],
    c2: [{ date: "2026-05-07", sets: [{ duration: 45 }, { duration: 45 }, { duration: 40 }] }],
    c3: [{ date: "2026-05-05", sets: [{ reps: 12 }, { reps: 10 }, { reps: 8 }] }],
  },
  bodyweight: [{ date: "2026-05-01", kg: 68 }, { date: "2026-05-15", kg: 68.6 }],
  bodyScans: [{ date: "2026-05-01", weightKg: 68, fatPct: 17.2, muscleKg: 30.1 }],
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
};

const EXPECTED_SETS = 4 + 4 + 3 + 4 + 5 + 3 + 3; // = 26

console.log("═══ 1. ข้อมูลรุ่นเก่ามาก — ต้องไม่หายแม้แต่เซตเดียว ═══");
let d;
{
  d = normalizeData(JSON.parse(JSON.stringify(ANCIENT)));
  ok("อ่านได้ไม่ crash", !!d);
  ok(`เซตครบ ${EXPECTED_SETS} เซต`, countSets(d) === EXPECTED_SETS, `ได้ ${countSets(d)}`);
  ok("ท่าครบ 6 ท่า", d.exercises.length === 6, `ได้ ${d.exercises.length}`);
  ok("ชื่อวันที่ตั้งไว้ยังอยู่", d.dayLabels.mon === "อก" && d.dayLabels.thu === "ขา");
  ok("น้ำหนักตัวครบ 2 จุด", d.bodyweight.length === 2);
  ok("ผลสแกนยังอยู่", d.bodyScans.length === 1 && d.bodyScans[0].fatPct === 17.2);
  ok("ท่าจับเวลาเก็บ duration ไว้ครบ", d.history.c2[0].sets.filter(Boolean).length === 3);
  ok("ท่าน้ำหนักตัว amrap ยังอยู่", d.exercises.find((e) => e.id === "c3")?.amrap === true);
}

console.log("\n═══ 2. ฟิลด์ใหม่ต้อง default = พฤติกรรมเดิม ═══");
{
  ok("ไม่มี lang = ไทย", d.settings.lang === undefined && getLang() === "th");
  ok("ไม่มี countBarWeight = ไม่นับบาร์ (พฤติกรรมเดิม)", countsBar(d) === false);
  ok("ไม่มี minPlateKg = 1.25 ตามมาตรฐาน", minPlate(d) === 1.25);
  ok("ไม่มี smartRest = เปิด (undefined ไม่ใช่ false)", d.settings.smartRest !== false);
  ok("ไม่มี soundEnabled = เปิด", d.settings.soundEnabled !== false);
  ok("ไม่มี showCoachNotes = แสดง", d.settings.showCoachNotes !== false);
  ok("ไม่มี loop = โหมดสัปดาห์เหมือนเดิม", d.loop === undefined);
  ok("ไม่มี makeup = ไม่มีวันชดเชยค้าง", d.makeup === undefined || Object.keys(d.makeup).length === 0);
  ok("ไม่มี accent = ใช้ธีมเริ่มต้น", d.settings.accent === undefined);
  // ค่าที่ผู้ใช้เคยตั้งต้องไม่ถูกทับ
  ok("barWeight ที่เคยตั้งไว้ยังเป็น 20", d.settings.barWeight === 20);
  ok("restDefault ที่เคยตั้งไว้ยังเป็น 90", d.settings.restDefault === 90);
}

console.log("\n═══ 3. ตัวเลขที่ผู้ใช้เห็นต้องไม่เพี้ยน ═══");
{
  const lifts = bestLifts(d);
  const bench = lifts.find((l) => l.name === "Barbell Bench Press");
  const squat = lifts.find((l) => l.name === "Barbell Squat");
  ok("สถิติเบนช์ = 62.5 × 8", bench?.weight === 62.5 && bench?.reps === 8, JSON.stringify(bench));
  ok("สถิติสควอท = 100 × 5", squat?.weight === 100 && squat?.reps === 5, JSON.stringify(squat));
  ok("ท่าน้ำหนักตัวไม่โผล่ในสถิติน้ำหนัก", !lifts.some((l) => l.name === "Pull-up"));

  const rank = computeRank(d);
  ok("คิดแรงค์ได้ (มีเบนช์+สควอท+น้ำหนักตัว)", rank.rank !== null, JSON.stringify(rank.rank));
  ok("ใช้น้ำหนักตัวล่าสุด 68.6", rank.bodyweight === 68.6, String(rank.bodyweight));

  ok("สตรีคคำนวณได้ไม่ crash", typeof computeStreak(d).current === "number");

  const a = analyzeProgram(d);
  ok("วิเคราะห์ได้คะแนน 0-100", a.execution >= 0 && a.execution <= 100, String(a.execution));
  ok("สร้างคำแนะนำได้ไม่ crash", Array.isArray(buildRecommendations(d, a)));
}

console.log("\n═══ 4. ตัวบอกน้ำหนักครั้งหน้าต้องอ่านประวัติเก่าได้ ═══");
{
  const bench = d.exercises.find((e) => e.id === "a1");
  const s = suggestTarget(d, bench);
  ok("มีข้อความแนะนำ ไม่ใช่ 'เซสชันแรก'", !!s.msg && s.kind !== "start", `${s.kind}: ${s.msg}`);
  ok("เสนอน้ำหนักเป็นตัวเลข", typeof s.weight === "number" && s.weight > 0, String(s.weight));

  // ท่าที่ inc เดิมเป็น 2 (ไม่ใช่ค่ามาตรฐาน) ต้องไม่ถูกบังคับเปลี่ยน
  const fly = d.exercises.find((e) => e.id === "a2");
  ok("ท่าดัมเบลใช้ inc เดิม ไม่โดนบังคับเป็นสเต็ปบาร์เบล", stepFor(d, fly) === 2, String(stepFor(d, fly)));

  // ท่าบาร์เบลใช้สเต็ปตามแผ่นที่ยิมมี (default 1.25 -> 2.5)
  ok("ท่าบาร์เบลได้สเต็ปตามแผ่น", stepFor(d, bench) === 2.5, String(stepFor(d, bench)));

  ok("repTargetText ท่าจับเวลาอ่านออก", /30|60/.test(repTargetText(d.exercises.find((e) => e.id === "c2"))));
}

console.log("\n═══ 5. ข้อมูลที่เสียบางส่วนต้องไม่ลากของดีหายไปด้วย ═══");
{
  const broken = JSON.parse(JSON.stringify(ANCIENT));
  broken.exercises.push(null, { id: "zz" }, { name: "ไม่มี id" });
  broken.history.ghost = [{ date: "2026-05-01", sets: [{ weight: "มั่ว" }, null, { weight: 50, reps: 5 }] }];
  broken.bodyweight.push({ date: "x" }, null);
  broken.settings.restDefault = "ไม่ใช่ตัวเลข";

  const g = normalizeData(broken);
  ok("ท่าดีทั้ง 6 ยังอยู่ครบ", g.exercises.filter((e) => ANCIENT.exercises.some((o) => o.id === e.id)).length === 6, String(g.exercises.length));
  ok("ประวัติของท่าดีไม่หาย", countSets({ history: Object.fromEntries(Object.entries(g.history).filter(([k]) => k !== "ghost")) }) === EXPECTED_SETS);
  ok("น้ำหนักตัวที่ดียังอยู่", g.bodyweight.filter((b) => typeof b.kg === "number").length >= 2);
  ok("restDefault พังแล้วได้ค่าที่ใช้ได้", typeof g.settings.restDefault === "number" && g.settings.restDefault > 0, String(g.settings.restDefault));
  ok("ยังคิดสถิติได้", bestLifts(g).length >= 2);
}

console.log("\n═══ 6. ข้อมูลว่าง / ผิดชนิดทั้งก้อน ต้องปฏิเสธแล้วตกกลับเป็นค่าเริ่มต้น ═══");
{
  // สัญญาของ normalizeData: ใช้ไม่ได้ = คืน null แล้วให้ App ตกกลับไป createDefault()
  // (App.tsx เขียน `store.load() ?? createDefault()`) — สำคัญตรงที่ต้อง "ปฏิเสธ"
  // ไม่ใช่คืนก้อนครึ่งๆ กลางๆ ที่ทำให้หน้าจอพังทีหลังโดยไม่รู้สาเหตุ
  const REJECT = [
    ["null", null],
    ["array", []],
    ["string", "ข้อความ"],
    ["ตัวเลข", 42],
    ["object ว่าง", {}],
    ["exercises เป็น string", { exercises: "ไม่ใช่ array", history: {} }],
  ];
  for (const [name, payload] of REJECT) {
    let got, threw = null;
    try { got = normalizeData(payload); } catch (e) { threw = e.message; }
    ok(`${name}: ปฏิเสธด้วย null ไม่ใช่ throw`, threw === null && got === null, threw ?? `ได้ ${JSON.stringify(got)?.slice(0, 40)}`);
  }

  // แล้วเส้นทางจริงของแอปต้องได้ข้อมูลที่ใช้งานได้เสมอ
  for (const [name, payload] of REJECT) {
    let survived = true;
    try {
      const g = normalizeData(payload) ?? createDefault();
      analyzeProgram(g);
      computeStreak(g);
      bestLifts(g);
      DAYS.forEach((day) => exercisesForDay(g, day));
    } catch (e) {
      survived = false;
      ok(`${name}: เส้นทางจริงของแอปไม่ crash`, false, e.message);
    }
    if (survived) ok(`${name}: เส้นทางจริงของแอปไม่ crash`, true);
  }

  // ก้อนที่ "ยังพอใช้ได้" ต้องผ่าน ไม่ใช่โดนปฏิเสธทิ้งทั้งก้อน (ไม่งั้นข้อมูลผู้ใช้หาย)
  const thin = normalizeData({ exercises: [], history: [] });
  ok("exercises เป็น array ว่าง = รับไว้ ไม่ทิ้ง", thin !== null);
  const partial = normalizeData({ exercises: ANCIENT.exercises, history: ANCIENT.history });
  ok("มี exercises+history แต่ไม่มี settings = รับไว้ครบ", partial !== null && countSets(partial) === EXPECTED_SETS, String(partial && countSets(partial)));
}

console.log("\n═══ 7. วันที่ในประวัติต้องเทียบกับ todayStr ได้ ═══");
{
  ok("todayStr เป็นรูปแบบเดียวกับที่เก็บในประวัติ", /^\d{4}-\d{2}-\d{2}$/.test(todayStr()));
  const t = todayStr();
  ok("เทียบสตริงกับวันเก่าได้ (เก่ากว่าจริง)", "2026-05-04" < t, `${t}`);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
