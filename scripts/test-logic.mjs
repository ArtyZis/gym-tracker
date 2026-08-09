// ทดสอบ logic (รันด้วย node --experimental-strip-types)
import { forecastPR } from "../src/lib/forecast.ts";
import { parseProgram } from "../src/lib/programParser.ts";
import { suggestRest } from "../src/lib/progression.ts";
import {
  applyProgram,
  archiveOne,
  createDefault,
  createEmpty,
  effectiveExercisesForDay,
  clearSwap,
  setSwap,
  addExtra,
  removeExtra,
  extraIdFor,
  normalizeData,
  JS_DAYS,
  DAYS,
} from "../src/lib/store.ts";
import { analyzeProgram, buildRecommendations, applyRecommendation } from "../src/lib/analyzer.ts";

let failures = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failures++;
    console.log("FAIL", label, "got", JSON.stringify(got), "want", JSON.stringify(want));
  } else {
    console.log("ok  ", label, "->", JSON.stringify(got));
  }
};

// --- forecast: ยกเพิ่ม 2.5kg ทุกสัปดาห์ 5 เซสชัน ---
const ex = { id: "x", name: "Squat", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 8, inc: 2.5 };
const mkDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
};
const hist = [28, 21, 14, 7, 0].map((off, i) => ({
  date: mkDate(off),
  sets: [{ weight: 50 + i * 2.5, reps: 8 }],
}));
const data = { exercises: [ex], history: { x: hist }, bodyweight: [], bodyScans: [], dayLabels: {}, settings: {} };
const fc = forecastPR(data, ex);
console.log("forecast:", JSON.stringify(fc));
if (!fc || Math.abs(fc.slopePerWeek - 2.5) > 0.01 || fc.in2w !== 65 || fc.in4w !== 70) {
  failures++;
  console.log("FAIL forecast: want slope 2.5, in2w 65, in4w 70");
} else {
  console.log("ok   forecast linear +2.5/wk -> 65 / 70");
}

// forecast ข้อมูลไม่พอ
const fewData = { ...data, history: { x: hist.slice(0, 3) } };
check("forecast <4 sessions", forecastPR(fewData, ex), null);

// --- program parser ---
const prog = parseProgram(`จันทร์ - Push
Bench Press 4x6-8
Incline DB Press 3 x 10 100kg
Lateral Raise 3x15
Plank 3x45s
Pull-up 4xAMRAP

พุธ - Legs
Squat 5x5`);
const summary = prog.exercises.map((e) => `${e.name}|${e.day}|${e.type}|${e.sets}|${e.rmin}-${e.rmax}${e.amrap ? "|amrap" : ""}`);
check("parse: bench range", summary[0], "Bench Press|mon|weight|4|6-8");
check("parse: with weight", summary[1], "Incline DB Press|mon|weight|3|10-10");
check("parse: isolation bodyweight-less -> weight", summary[2], "Lateral Raise|mon|weight|3|15-15");
check("parse: plank time", summary[3], "Plank|mon|time|3|45-45");
check("parse: pullup amrap", summary[4], "Pull-up|mon|bodyweight|4|1-999|amrap");
check("parse: second day squat", summary[5], "Squat|wed|weight|5|5-5");
check("parse: exercise count", prog.exercises.length, 6);
check("parse: day label mon", prog.dayLabels.mon, "Push");
check("parse: bench not machine", prog.exercises[0].machine, undefined);

// machine detection
const progM = parseProgram(`Lat Pulldown 3x10
Leg Press 4x12
Cable Row 3x12
Bench Press 4x8`);
check("machine: lat pulldown", progM.exercises[0].machine, true);
check("machine: lat pulldown inc 5", progM.exercises[0].inc, 5);
check("machine: leg press", progM.exercises[1].machine, true);
check("machine: cable row", progM.exercises[2].machine, true);
check("machine: bench not machine", progM.exercises[3].machine, undefined);

// รูปแบบไทยล้วน + bullet + × unicode
const prog2 = parseProgram(`• สควอท 4×8
- เบนช์ 3 เซต 10 ครั้ง`);
check("parse thai: squat ×", prog2.exercises[0]?.sets + "x" + prog2.exercises[0]?.rmax, "4x8");
check("parse thai: bench เซต ครั้ง", prog2.exercises[1]?.sets + "x" + prog2.exercises[1]?.rmax, "3x10");

// --- suggestRest ---
const mkEx = (o) => ({ id: "x", name: "X", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 8, ...o });
check("rest: heavy compound squat 5x5", suggestRest(mkEx({ name: "Barbell Squat", rmin: 5, rmax: 5 })), 180);
check("rest: compound 6-8", suggestRest(mkEx({ name: "Bench Press", rmin: 6, rmax: 8 })), 165);
check("rest: isolation 12-15", suggestRest(mkEx({ name: "Lateral Raise", rmin: 12, rmax: 15 })), 75);
check("rest: time plank", suggestRest(mkEx({ name: "Plank", type: "time", rmin: 30, rmax: 45 })), 60);
check("rest: manual override wins", suggestRest(mkEx({ name: "Bench Press", restSec: 42 })), 42);

// --- history archive + applyProgram: สลับโปรแกรมแล้วประวัติไม่หาย ---
const d = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: [{ id: "old1", name: "Bench Press", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 8, order: 0 }],
  history: { old1: [{ date: "2026-07-01", sets: [{ weight: 60, reps: 8 }] }] },
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
// แทนที่ด้วยโปรแกรมใหม่ที่มี Bench Press (ชื่อเดิม) + ท่าใหม่
applyProgram(d, [
  { name: "Bench Press", day: "mon", type: "weight", sets: 4, rmin: 5, rmax: 5 },
  { name: "Squat", day: "wed", type: "weight", sets: 5, rmin: 5, rmax: 5 },
]);
const benchNew = d.exercises.find((e) => e.name === "Bench Press");
check("archive: bench history preserved after replace", d.history[benchNew.id]?.[0]?.sets[0]?.weight, 60);
check("archive: new squat has no history", d.history[d.exercises.find((e) => e.name === "Squat").id], undefined);
check("archive: bench in archive by name", d.historyArchive["bench press"]?.[0]?.sets[0]?.weight, 60);

// แทนที่อีกครั้งด้วยโปรแกรมที่ไม่มี Bench -> ประวัติยังอยู่ใน archive
applyProgram(d, [{ name: "Deadlift", day: "mon", type: "weight", sets: 3, rmin: 5, rmax: 5 }]);
check("archive: bench still in archive after 2nd replace", d.historyArchive["bench press"]?.[0]?.sets[0]?.weight, 60);
// นำ Bench กลับมา -> ประวัติกลับมา
applyProgram(d, [{ name: "Bench Press", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 8 }]);
check("archive: bench history restored when re-added", d.history[d.exercises.find((e) => e.name === "Bench Press").id]?.[0]?.sets[0]?.weight, 60);

// archiveOne: ลบท่าแล้วประวัติยังอยู่ใน archive
const d2 = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: [{ id: "e1", name: "Row", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 8, order: 0 }],
  history: { e1: [{ date: "2026-07-02", sets: [{ weight: 40, reps: 8 }] }] },
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
archiveOne(d2, d2.exercises[0]);
check("archiveOne: row saved to archive", d2.historyArchive["row"]?.[0]?.sets[0]?.weight, 40);

// --- empty reset ---
const emptied = normalizeData(createDefault());
Object.assign(emptied, createEmpty());
check("empty: no exercises", emptied.exercises.length, 0);
check("empty: history cleared", Object.keys(emptied.history).length, 0);
check("empty: archive cleared", Object.keys(emptied.historyArchive).length, 0);

// --- คำแนะนำต้องไม่ทำให้ตารางแย่ลง และต้องไม่ไปรื้อวันฝึกที่ผู้ใช้เลือกไว้ ---
//
// เดิมเทสนี้บังคับว่า "กดตามคำแนะนำต้องได้ 100 คะแนน" — เลิกใช้เกณฑ์นั้นแล้ว
// เพราะการไล่คะแนนให้เต็มต้องรื้อตาราง (ย้ายวัน/เพิ่มวัน) ซึ่งระบบไม่รู้ว่าผู้ใช้ว่างวันไหนจริง
// ตารางที่ผู้ใช้จัดเองมักดีอยู่แล้ว คำแนะนำที่รื้อให้จึงทำให้แย่กว่าเดิม
function driveToMax(seed) {
  let prog = seed;
  let iter = 0;
  const trace = [];
  const startScore = analyzeProgram(prog).score;
  const dayOf = (p) => DAYS.filter((day) => p.exercises.some((e) => e.day === day)).join(",");
  const startDays = dayOf(prog);
  while (iter < 60) {
    const a = analyzeProgram(prog);
    const recs = buildRecommendations(prog, a);
    trace.push({ score: a.score, recs: recs.length, top: recs[0]?.kind });
    if (!recs.length) break;
    applyRecommendation(prog, recs[0]);
    iter++;
  }
  return { score: analyzeProgram(prog).score, startScore, startDays, endDays: dayOf(prog), iter, trace, prog };
}

// ต้องเป็นตารางที่ "ผู้ใช้จัดไว้แล้ว" ไม่ใช่ createDefault ซึ่งตอนนี้ว่างเปล่า
// (ตารางว่างย่อมต้องเพิ่มวันฝึกจากศูนย์อยู่แล้ว วัดข้อนี้กับมันจึงไม่ได้ความหมาย)
const userProgram = normalizeData({
  dayLabels: { mon: "ดัน", tue: "", wed: "ดึง", thu: "", fri: "ขา", sat: "", sun: "" },
  exercises: [
    { id: "u1", name: "Barbell Bench Press", day: "mon", type: "weight", sets: 4, rmin: 6, rmax: 8, order: 0 },
    { id: "u2", name: "Overhead Press", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 10, order: 1 },
    { id: "u3", name: "Lat Pulldown", day: "wed", type: "weight", sets: 4, rmin: 8, rmax: 12, order: 2 },
    { id: "u4", name: "Seated Cable Row", day: "wed", type: "weight", sets: 3, rmin: 10, rmax: 12, order: 3 },
    { id: "u5", name: "Barbell Squat", day: "fri", type: "weight", sets: 4, rmin: 6, rmax: 8, order: 4 },
    { id: "u6", name: "Romanian Deadlift", day: "fri", type: "weight", sets: 3, rmin: 8, rmax: 10, order: 5 },
  ],
  history: {},
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
const fromDefault = driveToMax(userProgram);
check("recs: ตารางที่ผู้ใช้จัดเอง ไม่ทำให้คะแนนแย่ลง", fromDefault.score >= fromDefault.startScore, true);
check("recs: ตารางที่ผู้ใช้จัดเอง ไม่ย้าย/เพิ่มวันฝึกให้เอง", fromDefault.endDays, fromDefault.startDays);

// โปรแกรมแย่ๆ: มีแต่อกวันเดียว 10 เซต ฝึกวันเดียว
const bad = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: [{ id: "x1", name: "Bench Press", day: "mon", type: "weight", sets: 4, rmin: 8, rmax: 10, order: 0 }],
  history: {},
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
const fromBad = driveToMax(bad);
check("recs: โปรแกรมแย่ๆ คะแนนดีขึ้นจากเดิม", fromBad.score > fromBad.startScore, true);
check("recs: โปรแกรมแย่ๆ ก็ยังไม่ย้าย/เพิ่มวันฝึกให้เอง", fromBad.endDays, fromBad.startDays);

// โปรแกรมฝึก 6 วันติด (consecutive penalty) -> ต้องแนะนำแทรกวันพักจน 100
const consec = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: ["mon", "tue", "wed", "thu", "fri", "sat"].map((day, i) => ({
    id: "e" + i, name: "Squat", day, type: "weight", sets: 3, rmin: 6, rmax: 8, order: 0,
  })),
  history: {},
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
const consecBefore = analyzeProgram(consec).consecutive;
check("consecutive: 6 days detected", consecBefore, 6);

// --- เซตต่อท่าอยู่ในช่วง 3-5 หลังทำตามคำแนะนำทั้งหมด ---
const setsRange = (prog) => {
  const arr = prog.exercises.map((e) => e.sets);
  return { min: Math.min(...arr), max: Math.max(...arr) };
};
const defRange = setsRange(fromDefault.prog);
check("sets: no exercise above 5 after recs", defRange.max <= 5, true);
const badRange = setsRange(fromBad.prog);
check("sets: bad program max <= 5", badRange.max <= 5, true);
check("sets: bad program min >= 3", badRange.min >= 3, true);

// volume 24 เซต/สัปดาห์ ต้องไม่ถูกหักคะแนน (โซนที่ยอมรับได้)
const vol24 = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: [
    { id: "c1", name: "Cable Fly", day: "mon", type: "weight", sets: 4, rmin: 10, rmax: 12, order: 0 },
    { id: "c2", name: "Incline DB Press", day: "mon", type: "weight", sets: 4, rmin: 8, rmax: 10, order: 1 },
    { id: "c3", name: "Bench Press", day: "thu", type: "weight", sets: 4, rmin: 6, rmax: 8, order: 0 },
  ],
  history: {},
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
const chest24 = analyzeProgram(vol24).stats.find((s) => s.muscle === "chest");
check("volume: 12 chest sets = good", chest24.status, "good");

// --- สลับท่าชั่วคราวเฉพาะวันนี้ ---
const todayKey = JS_DAYS[new Date().getDay()];
const swapData = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: [{ id: "p1", name: "Push-up", day: todayKey, type: "bodyweight", sets: 3, rmin: 8, rmax: 12, order: 0 }],
  history: {},
  historyArchive: { "bench press": [{ date: "2026-07-01", sets: [{ weight: 60, reps: 8 }] }] },
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
setSwap(swapData, "p1", { name: "Bench Press", type: "weight", sets: 3, rmin: 6, rmax: 8, unit: "kg", inc: 2.5 });
const eff = effectiveExercisesForDay(swapData, todayKey);
check("swap: name replaced today", eff[0].name, "Bench Press");
check("swap: separate id", eff[0].id !== "p1", true);
check("swap: origId kept", eff[0].origId, "p1");
check("swap: flagged", eff[0].swapped, true);
check("swap: pulls archived history of swapped-in exercise", swapData.history[eff[0].id]?.[0]?.sets[0]?.weight, 60);

// เคลียร์ swap -> กลับท่าเดิม
clearSwap(swapData, "p1");
check("swap: cleared restores original", effectiveExercisesForDay(swapData, todayKey)[0].name, "Push-up");

// วันเปลี่ยน -> swap หมดอายุเอง
const staleSwap = JSON.parse(JSON.stringify(swapData));
staleSwap.swaps = { date: "2020-01-01", map: { p1: { name: "Bench Press", type: "weight", sets: 3, rmin: 6, rmax: 8 } } };
staleSwap.history[`p1~bench_press`] = [{ date: "2020-01-01", sets: [{ weight: 70, reps: 5 }] }];
const afterDay = normalizeData(staleSwap);
check("swap: expires next day", afterDay.swaps, undefined);
check("swap: old-day log archived", afterDay.historyArchive["bench price"] ? false : afterDay.historyArchive["bench press"].some((s) => s.date === "2020-01-01"), true);

// --- เพิ่มท่าเข้าวันนี้ชั่วคราว (เช่น ดึงท่าขามาเล่นเพิ่ม) ---
const extraData = normalizeData({
  dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  exercises: [
    { id: "c1", name: "Bench Press", day: todayKey, type: "weight", sets: 4, rmin: 6, rmax: 8, order: 0 },
    { id: "l1", name: "Barbell Squat", day: todayKey === "wed" ? "thu" : "wed", type: "weight", sets: 4, rmin: 5, rmax: 5, order: 0 },
  ],
  history: {},
  historyArchive: { "barbell squat": [{ date: "2026-07-10", sets: [{ weight: 100, reps: 5 }] }] },
  settings: { autoRest: true, restDefault: 90, barWeight: 20 },
});
addExtra(extraData, { name: "Barbell Squat", type: "weight", sets: 3, rmin: 5, rmax: 5, unit: "kg", inc: 5 });
const withExtra = effectiveExercisesForDay(extraData, todayKey);
check("extra: added to today", withExtra.length, 2);
check("extra: flagged", withExtra[1].extra, true);
check("extra: separate id", withExtra[1].id, extraIdFor("Barbell Squat"));
check("extra: pulls archived history", extraData.history[extraIdFor("Barbell Squat")]?.[0]?.sets[0]?.weight, 100);
check("extra: not added to other day", effectiveExercisesForDay(extraData, todayKey === "wed" ? "thu" : "wed").length, 1);
check("extra: program untouched", extraData.exercises.length, 2);

// ซ้ำไม่เพิ่มสองรอบ
addExtra(extraData, { name: "Barbell Squat", type: "weight", sets: 3, rmin: 5, rmax: 5 });
check("extra: no duplicate", effectiveExercisesForDay(extraData, todayKey).length, 2);

removeExtra(extraData, "Barbell Squat");
check("extra: removed", effectiveExercisesForDay(extraData, todayKey).length, 1);

// วันเปลี่ยน -> extras หายเอง + log ถูก archive
addExtra(extraData, { name: "Leg Press", type: "weight", sets: 3, rmin: 10, rmax: 12 });
extraData.history[extraIdFor("Leg Press")] = [{ date: "2020-01-01", sets: [{ weight: 120, reps: 10 }] }];
const staleExtra = JSON.parse(JSON.stringify(extraData));
staleExtra.swaps.date = "2020-01-01";
const nextDay = normalizeData(staleExtra);
check("extra: expires next day", nextDay.swaps, undefined);
check("extra: log archived on expiry", nextDay.historyArchive["leg press"]?.[0]?.sets[0]?.weight, 120);

console.log(failures ? `${failures} FAILURES` : "ALL LOGIC TESTS PASS");
process.exit(failures ? 1 : 0);
