// เทสต์ระบบสองภาษา — เน้นสิ่งที่พังแล้วเจ็บ ไม่ใช่เช็คคำแปลทีละคำ
//
// สามข้อที่สำคัญที่สุด:
//   1. ผู้ใช้เดิมที่ไม่มี settings.lang ต้องเห็นไทยเหมือนเดิมทุกประการ (กฎเหล็กข้อ 1)
//   2. โหมดอังกฤษต้องไม่มีไทยหลุดออกมาในข้อความที่ผู้ใช้เห็น
//   3. ค้นหาด้วยคำไทยต้องยังเจอแม้ตั้ง UI เป็นอังกฤษ — คนไทยที่สลับภาษายังพิมพ์ "อก" ค้นอยู่
//
// รันผ่าน esbuild เหมือนเทสต์อื่น:
//   .\node_modules\.bin\esbuild.cmd scripts/test-lang.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { getLang, setLang, t, plural, setsText, daysText, secText, locale } from "../src/lib/i18n";
import { MUSCLE_KEYS, muscleName, equipName, patternName, injuryName, experienceName } from "../src/lib/muscles";
import { DAYS, dayName, dayShort, createDefault, createEmpty, repTargetText } from "../src/lib/store";
import { EXERCISE_DB, searchExercises, tipOf, subName } from "../src/lib/exerciseDB";
import { RANKS, rankName } from "../src/lib/rank";
import { analyzeProgram, buildRecommendations, exerciseFromTemplate } from "../src/lib/analyzer";
import { suggestTarget, restReason, liftName } from "../src/lib/progression";

let pass = 0;
let fail = 0;
const THAI = /[฀-฾เ-๿]/; // ไม่รวม ฿ ที่เป็นสัญลักษณ์เงิน

function ok(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log("  ✅ " + name);
  } else {
    fail++;
    console.log("  ❌ " + name + (extra ? " — " + extra : ""));
  }
}

function noThai(name, value) {
  const bad = typeof value === "string" && THAI.test(value);
  ok(name, !bad, bad ? `เจอไทย: "${value}"` : "");
}

// ══════════ 1. ค่าเริ่มต้นและความเข้ากันได้กับข้อมูลเก่า ══════════
console.log("\n═══ 1. ข้อมูลเก่าต้องไม่เปลี่ยน ═══");

setLang("th");
ok("ค่าเริ่มต้นคือไทย", getLang() === "th");

const fresh = createDefault();
ok("ข้อมูลใหม่ไม่ตั้ง lang (undefined = ไทย)", fresh.settings.lang === undefined);

// "เริ่มใหม่หมด" ต้องไม่รีเซ็ตภาษาที่ผู้ใช้เลือกไว้ — createEmpty คืน Partial ที่ไม่มี settings
// แล้ว Object.assign ทับของเดิม settings จึงรอด ถ้าวันหนึ่งมีใครใส่ settings เข้าไป
// ผู้ใช้อังกฤษที่กดล้างข้อมูลจะเจอแอปกลับเป็นไทยเฉยๆ โดยไม่รู้ว่าทำไม
ok("createEmpty ไม่แตะ settings", createEmpty().settings === undefined);
const wiped = Object.assign(createDefault(), { settings: { ...createDefault().settings, lang: "en" } });
Object.assign(wiped, createEmpty());
ok("ล้างข้อมูลแล้วภาษายังอยู่", wiped.settings.lang === "en");

// จำลองข้อมูลผู้ใช้เก่าที่บันทึกไว้ก่อนมีฟีเจอร์นี้ — ไม่มีคีย์ lang เลย
const legacy = createDefault();
delete legacy.settings.lang;
setLang(legacy.settings.lang ?? "th");
ok("อ่านข้อมูลเก่าแล้วยังเป็นไทย", getLang() === "th");
ok("ชื่อวันยังเป็นไทย", dayName("mon") === "จันทร์");
ok("ชื่อกล้ามเนื้อยังเป็นไทย", muscleName("chest") === "อก");
ok("locale ยังเป็น th-TH", locale() === "th-TH");

// ══════════ 2. สลับภาษาแล้วเปลี่ยนจริง ══════════
console.log("\n═══ 2. สลับเป็นอังกฤษ ═══");

setLang("en");
ok("getLang เปลี่ยนเป็น en", getLang() === "en");
ok("t() คืนอังกฤษ", t("ไทย", "English") === "English");
ok("locale เป็น en-GB", locale() === "en-GB");
ok("ชื่อวันเป็นอังกฤษ", dayName("mon") === "Monday");
ok("ชื่อวันย่อเป็นอังกฤษ", dayShort("mon") === "Mon");

setLang("th");
ok("สลับกลับมาไทยได้", t("ไทย", "English") === "ไทย" && dayName("mon") === "จันทร์");

// ══════════ 3. ตารางอ้างอิงต้องมีคู่อังกฤษครบ ══════════
console.log("\n═══ 3. ตารางอ้างอิงครบทุกคีย์ ═══");

setLang("en");
const missingMuscle = MUSCLE_KEYS.filter((m) => !muscleName(m) || THAI.test(muscleName(m)));
ok("กล้ามเนื้อครบ 13 มัด ไม่มีไทยหลุด", missingMuscle.length === 0, missingMuscle.join(","));

const missingDay = DAYS.filter((d) => THAI.test(dayName(d)) || THAI.test(dayShort(d)));
ok("ชื่อวันครบ 7 วัน", missingDay.length === 0, missingDay.join(","));

const missingRank = RANKS.filter((r) => THAI.test(rankName(r)));
ok("ชื่อแรงค์ครบ 6 ระดับ", missingRank.length === 0, missingRank.join(","));

noThai("equipName(barbell)", equipName("barbell"));
noThai("patternName(squat)", patternName("squat"));
noThai("injuryName(knee)", injuryName("knee"));
noThai("experienceName(beginner)", experienceName("beginner"));
noThai("liftName(bench)", liftName("bench"));

// ══════════ 4. คลังท่า ══════════
console.log("\n═══ 4. คลังท่า ═══");

const noTipEn = EXERCISE_DB.filter((x) => !x.tipEn);
ok(`ทุกท่ามี tipEn (${EXERCISE_DB.length} ท่า)`, noTipEn.length === 0, noTipEn.slice(0, 3).map((x) => x.name).join(", "));

setLang("en");
const thaiTip = EXERCISE_DB.filter((x) => THAI.test(tipOf(x)));
ok("โหมดอังกฤษไม่มี tip ไทยหลุด", thaiTip.length === 0, thaiTip.slice(0, 3).map((x) => x.name).join(", "));
ok("โหมดอังกฤษซ่อนชื่อไทยใต้ชื่อท่า", subName(EXERCISE_DB[0]) === "");

setLang("th");
ok("โหมดไทยยังโชว์ชื่อไทย", subName(EXERCISE_DB[0]) === EXERCISE_DB[0].th);
ok("โหมดไทย tip เป็นไทย", THAI.test(tipOf(EXERCISE_DB[0])));

// ตัวค้นหาต้องไม่ขึ้นกับภาษา — ข้อนี้สำคัญ ถ้าพังคนไทยที่สลับภาษาจะค้นไม่เจอ
for (const lang of ["th", "en"]) {
  setLang(lang);
  ok(`[${lang}] ค้น "อก" เจอท่าอก`, searchExercises("อก", 5).length > 0);
  ok(`[${lang}] ค้น "chest" เจอท่าอก`, searchExercises("chest", 5).length > 0);
  ok(`[${lang}] ค้น "หลัง" เจอท่าหลัง`, searchExercises("หลัง", 5).length > 0);
  ok(`[${lang}] ค้น "squat" เจอสควอท`, searchExercises("squat", 5).some((x) => /squat/i.test(x.name)));
  ok(`[${lang}] ค้น "บาร์เบล" เจอท่าบาร์เบล`, searchExercises("บาร์เบล", 5).length > 0);
}

// ══════════ 5. ข้อความจากตรรกะ ══════════
console.log("\n═══ 5. ตัววิเคราะห์และตัวแนะนำน้ำหนัก ═══");

// ตารางที่จงใจให้มีปัญหา จะได้มีคำแนะนำและ issue ออกมาให้ตรวจ
function messyProgram() {
  const d = createDefault();
  d.exercises = [];
  const add = (name, day, order) => {
    const tpl = EXERCISE_DB.find((x) => x.name === name);
    if (tpl) d.exercises.push(exerciseFromTemplate(tpl, day, order, "ex" + d.exercises.length));
  };
  add("Barbell Bench Press", "mon", 0);
  add("Incline DB Press", "mon", 1);
  add("Dumbbell Fly", "mon", 2);
  add("Cable Fly", "mon", 3);
  add("Barbell Squat", "wed", 0);
  add("Leg Press", "wed", 1);
  return d;
}

setLang("en");
const messy = messyProgram();
const analysis = analyzeProgram(messy);
const recs = buildRecommendations(messy, analysis);

noThai("headline", analysis.headline);
ok("มี issue ให้ตรวจ", analysis.issues.length > 0);
const thaiIssues = analysis.issues.filter((s) => THAI.test(s));
ok("issues ทุกข้อเป็นอังกฤษ", thaiIssues.length === 0, thaiIssues[0] ?? "");

ok("มีคำแนะนำให้ตรวจ", recs.length > 0);
const thaiRecs = recs.filter((r) => THAI.test(r.title) || THAI.test(r.detail) || THAI.test(r.reason));
ok("คำแนะนำทุกข้อเป็นอังกฤษ", thaiRecs.length === 0, thaiRecs[0] ? thaiRecs[0].title + " / " + thaiRecs[0].detail : "");

const thaiBlocked = analysis.blockedInsights.filter((b) => THAI.test(b.issue) || THAI.test(b.whyCannotFix) || THAI.test(b.realSolution));
ok("จุดที่ตรวจพบเป็นอังกฤษ", thaiBlocked.length === 0, thaiBlocked[0]?.issue ?? "");

// ตัวบอกน้ำหนักครั้งหน้า — เดินผ่านทุกกิ่งที่เป็นไปได้
const ex = messy.exercises[0];
noThai("suggestTarget เซสชันแรก", suggestTarget(messy, ex).msg);

const withHistory = structuredClone(messy);
withHistory.history[ex.id] = [
  { date: "2026-08-01", sets: [{ weight: 60, reps: ex.rmax }, { weight: 60, reps: ex.rmax }, { weight: 60, reps: ex.rmax }, { weight: 60, reps: ex.rmax }] },
];
noThai("suggestTarget ครบทุกเซต", suggestTarget(withHistory, ex).msg);

const failed = structuredClone(messy);
failed.history[ex.id] = [
  { date: "2026-08-01", sets: [{ weight: 80, reps: 3 }, { weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 60, reps: 8 }] },
];
noThai("suggestTarget ลดน้ำหนักกลางท่า", suggestTarget(failed, ex).msg);

const short = structuredClone(messy);
short.history[ex.id] = [{ date: "2026-08-01", sets: [{ weight: 60, reps: 2 }, { weight: 60, reps: 2 }] }];
noThai("suggestTarget ไม่ถึงช่วงเป้า", suggestTarget(short, ex).msg);

noThai("restReason", restReason(ex));
noThai("repTargetText", repTargetText(ex));

// ══════════ 6. หน่วยนับ ══════════
console.log("\n═══ 6. หน่วยนับและพหูพจน์ ═══");

setLang("en");
ok("1 set (เอกพจน์)", setsText(1) === "1 set", setsText(1));
ok("3 sets (พหูพจน์)", setsText(3) === "3 sets", setsText(3));
ok("1 day / 2 days", daysText(1) === "1 day" && daysText(2) === "2 days");
ok("วินาทีเขียนติดกัน", secText(90) === "90s", secText(90));
ok("plural ใช้รูปพหูพจน์เองได้", plural(2, "ครั้ง", "time") === "times");

setLang("th");
ok("ไทยไม่มีพหูพจน์", setsText(1) === "1 เซต" && setsText(3) === "3 เซต");
ok("วินาทีไทยมีเว้นวรรค", secText(90) === "90 วิ", secText(90));

// เผื่อไฟล์อื่นรันต่อ — คืนค่าเริ่มต้นไว้เสมอ
setLang("th");

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
