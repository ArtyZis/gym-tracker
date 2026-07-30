// ฟีเจอร์ 1: ช่องเวลาฝึกรายวัน — ระบบต้องรู้ว่าวันไหนมีเวลาแค่ไหน
// และต้องไม่เปลี่ยนพฤติกรรมเดิมเลยสำหรับวันที่ไม่ได้ตั้งช่องเวลา
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-timewindow.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { analyzeProgram, buildRecommendations, checkFilters, estimateMinutes } from "../src/lib/analyzer.ts";
import { findTemplate } from "../src/lib/exerciseDB.ts";
import { getDayTimeCap, getTimeCap, parseHHMM, windowMinutes } from "../src/lib/profile.ts";
import { createDefault, createEmpty, exercisesForDay, normalizeData, uid } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`); }
};
const mkEx = (name, day, sets, rmin, rmax, order) => ({
  id: uid() + Math.random(), name, day, type: "weight", sets, rmin, rmax, inc: 2.5, unit: "kg", order,
});

console.log("═══ แปลงเวลา ═══");
ok("parseHHMM 12:30 = 750 นาที", parseHHMM("12:30") === 750, String(parseHHMM("12:30")));
ok("parseHHMM รูปแบบผิดคืน null", parseHHMM("25:00") === null && parseHHMM("abc") === null);

{
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [];
  d.dayWindows = { thu: { start: "11:30", end: "12:45" } };
  // 75 นาที - buffer 10 = 65 นาทีที่ยกได้จริง
  ok("ช่วง 11:30–12:45 หัก buffer แล้วได้ 65 นาที", windowMinutes(d, "thu") === 65, String(windowMinutes(d, "thu")));
  ok("วันที่ตั้งช่องเวลา ใช้เวลาของวันนั้น", getDayTimeCap(d, "thu") === 65, String(getDayTimeCap(d, "thu")));
  ok("วันที่ไม่ได้ตั้ง ใช้ค่ากลางเดิม", getDayTimeCap(d, "mon") === getTimeCap(d), `${getDayTimeCap(d, "mon")} vs ${getTimeCap(d)}`);

  d.dayWindows = { fri: { start: "22:00", end: "00:30" } };
  ok("ข้ามเที่ยงคืนได้ (22:00–00:30 = 150-10 = 140)", windowMinutes(d, "fri") === 140, String(windowMinutes(d, "fri")));
}

console.log("\n═══ เคส 1: วันที่มีเวลา 75 นาที + ท่าเต็มแล้ว -> ต้องบล็อก ═══");
{
  const d = Object.assign(createDefault(), createEmpty());
  d.dayWindows = { thu: { start: "11:30", end: "12:45" } }; // ยกได้จริง 65 นาที
  d.exercises = [
    mkEx("Incline Barbell Press", "thu", 4, 8, 10, 0),
    mkEx("Overhead Press (DB)", "thu", 3, 10, 12, 1),
    mkEx("Cable Fly", "thu", 3, 12, 15, 2),
    mkEx("Dip", "thu", 3, 10, 12, 3),
    mkEx("Cable Lateral Raise", "thu", 4, 15, 20, 4),
    mkEx("Tricep Pushdown", "thu", 3, 15, 20, 5),
    mkEx("Rope Pushdown", "thu", 3, 15, 20, 6), // ท่าที่ 7 ดันให้เกิน 65 นาทีจริง
  ];
  const used = estimateMinutes(exercisesForDay(d, "thu"));
  console.log(`  วันพฤหัสใช้เวลาราว ${used} นาที · มีเวลายกจริง ${windowMinutes(d, "thu")} นาที`);

  const v = checkFilters(d, findTemplate("Lateral Raise"), "thu", 3);
  ok("checkFilters บล็อกด้วยเหตุผลเรื่องเวลา", !v.ok && /เวลา/.test(v.reason ?? ""), JSON.stringify(v));

  const a = analyzeProgram(d);
  const thu = a.dayLoads.find((x) => x.day === "thu");
  ok("analyzeProgram รู้ว่าวันพฤหัสเกินเวลา", thu?.overTime === true, JSON.stringify(thu));

  const recs = buildRecommendations(d, a);
  ok("ไม่เสนอเพิ่มท่า/เพิ่มเซตในวันที่เต็มแล้ว",
     !recs.some((r) => r.day === "thu" && (r.kind === "add" || r.kind === "increaseSets")),
     recs.map((r) => `${r.kind}@${r.day}`).join(", "));
}

console.log("\n═══ เคส 2: ไม่ตั้งช่องเวลา -> ผลต้องเหมือนเดิมทุกประการ (regression) ═══");
{
  const build = () => {
    const d = Object.assign(createDefault(), createEmpty());
    d.exercises = [
      mkEx("Barbell Bench Press", "mon", 4, 6, 10, 0),
      mkEx("Barbell Row", "mon", 4, 6, 10, 1),
      mkEx("Barbell Squat", "wed", 4, 6, 10, 0),
      mkEx("Romanian Deadlift", "wed", 3, 8, 12, 1),
    ];
    return d;
  };
  const noWin = analyzeProgram(build());
  const withEmptyWin = (() => { const d = build(); d.dayWindows = undefined; return analyzeProgram(d); })();
  ok("คะแนนเท่าเดิม", noWin.execution === withEmptyWin.execution, `${noWin.execution} vs ${withEmptyWin.execution}`);
  ok("เพดานเท่าเดิม", noWin.ceiling === withEmptyWin.ceiling, `${noWin.ceiling} vs ${withEmptyWin.ceiling}`);
  ok("ไม่มีวันไหนถูกมองว่าเกินเวลา", noWin.dayLoads.every((x) => !x.overTime));
}

console.log("\n═══ เคส 3: migration — ข้อมูลเก่าที่ไม่มี dayWindows ต้องไม่พัง ═══");
{
  const old = normalizeData({
    dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
    exercises: [{ id: "x1", name: "Bench Press", day: "mon", type: "weight", sets: 4, rmin: 8, rmax: 10, order: 0 }],
    history: { x1: [{ date: "2026-07-01", sets: [{ weight: 60, reps: 8 }] }] },
    settings: { autoRest: true, restDefault: 90, barWeight: 20 },
  });
  ok("ข้อมูลเก่าผ่าน normalize ได้", old !== null);
  ok("ประวัติเดิมยังอยู่ครบ", old.history.x1?.[0]?.sets[0]?.weight === 60);
  ok("dayWindows เป็น undefined (ไม่บังคับสร้าง)", old.dayWindows === undefined);

  const junk = normalizeData({
    dayLabels: {}, exercises: [], history: {}, settings: {},
    dayWindows: { mon: { start: "bad" }, tue: "PWNED", wed: { start: "10:00", end: "11:30" } },
  });
  ok("dayWindows ที่ shape ผิดถูกทิ้ง แต่ตัวที่ถูกต้องยังอยู่",
     junk.dayWindows.mon === undefined && junk.dayWindows.tue === undefined && junk.dayWindows.wed?.end === "11:30",
     JSON.stringify(junk.dayWindows));
}

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
