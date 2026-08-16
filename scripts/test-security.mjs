// ตรวจว่าข้อมูลนอกระบบที่จงใจทำพัง เข้ามาแล้วไม่ทำให้แอป crash / ค้าง / ตัวเลขเพี้ยน
//
// ทางเข้าของข้อมูลนอกระบบมี 2 ทาง:
//   1. localStorage — เสียเอง หรือถูกแก้ด้วย DevTools
//   2. โค้ดย้ายข้อมูล (decodeTransfer) — คนอื่นส่ง payload มาให้เราวางโดยตรง
// ทางที่ 2 คือทางที่คนอื่นโจมตีเราได้จริง จึงต้องทนทุก shape
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-security.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { normalizeData, decodeTransfer, createDefault, exercisesForDay, effectiveExercisesForDay, DAYS } from "../src/lib/store.ts";
import { analyzeProgram, buildRecommendations } from "../src/lib/analyzer.ts";
import { computeStreak } from "../src/lib/streak.ts";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`); }
};
const base = () => JSON.parse(JSON.stringify(createDefault()));

// รันทุกฟังก์ชันที่กินข้อมูลผู้ใช้ — ถ้า payload ไหนทำ crash จะโผล่ที่นี่
function exercise(d) {
  for (const day of DAYS) { exercisesForDay(d, day); effectiveExercisesForDay(d, day); }
  const a = analyzeProgram(d);
  buildRecommendations(d, a);
  computeStreak(d);
  return a;
}
const survives = (payload) => {
  try {
    const d = normalizeData(payload);
    if (d) exercise(d);
    return true;
  } catch { return false; }
};

console.log("═══ 1. payload ที่เคยทำแอป crash ═══");
ok("exercises เป็น array ของ null", survives((() => { const d = base(); d.exercises = [null, undefined, 0]; return d; })()));
ok("swaps เป็นสตริง", survives((() => { const d = base(); d.swaps = "PWNED"; return d; })()));
ok("swaps.map เป็น array", survives((() => { const d = base(); d.swaps = { date: "2026-01-01", map: [] }; return d; })()));
ok("history เป็น array ของค่าที่ไม่ใช่เซสชัน", survives((() => { const d = base(); d.history = { a: [1, "x", null] }; return d; })()));
ok("dayLabels ค่าเป็น object", survives((() => { const d = base(); d.dayLabels = { mon: { evil: 1 } }; return d; })()));
ok("ฟิลด์สำคัญหายหมด", survives({ exercises: [] }));

console.log("\n═══ 2. กันค่าที่ทำให้เบราว์เซอร์ค้าง (DoS) ═══");
{
  const d = normalizeData((() => { const x = base(); x.exercises = [{ id: "a", name: "X", day: "mon", type: "weight", sets: 1e9, rmin: 1, rmax: 2 }]; return x; })());
  ok("sets ยักษ์ถูกจำกัด (ไม่เรนเดอร์จุดพันล้านจุด)", d.exercises[0].sets <= 50, `ได้ ${d.exercises[0].sets}`);
}
{
  const many = Array.from({ length: 5000 }, (_, i) => ({ id: "e" + i, name: "X", day: "mon", type: "weight", sets: 3, rmin: 1, rmax: 2 }));
  const d = normalizeData(Object.assign(base(), { exercises: many }));
  ok("จำนวนท่าถูกจำกัด", d.exercises.length <= 500, `ได้ ${d.exercises.length}`);
}
{
  const d = normalizeData((() => { const x = base(); x.exercises = [{ id: "a", name: "X".repeat(50000), day: "mon", type: "weight", sets: 3, rmin: 1, rmax: 2 }]; return x; })());
  ok("ชื่อท่ายาวเกินถูกตัด", d.exercises[0].name.length <= 200, `ยาว ${d.exercises[0].name.length}`);
}

console.log("\n═══ 3. กันตัวเลขเพี้ยนจาก type confusion ═══");
{
  const d = normalizeData((() => { const x = base(); x.exercises = [{ id: "a", name: "X", day: "mon", type: "weight", sets: "9", rmin: "1", rmax: "2" }]; return x; })());
  const a = analyzeProgram(d);
  ok("sets ที่เป็นสตริงไม่ทำให้บวกแบบต่อสตริง", typeof a.dayLoads[0]?.sets === "number" && !String(a.dayLoads[0].sets).includes("0"), `ได้ ${a.dayLoads[0]?.sets}`);
}
{
  const d = normalizeData((() => { const x = base(); x.bodyweight = [{ date: "2026-01-01", kg: "อ้วน" }, { date: "2026-01-02", kg: 60 }]; return x; })());
  ok("น้ำหนักตัวที่ไม่ใช่ตัวเลขถูกทิ้ง แต่ของถูกต้องรอด", d.bodyweight.length === 1 && d.bodyweight[0].kg === 60);
}

console.log("\n═══ 4. โค้ดย้ายข้อมูลจากคนอื่น ═══");
ok("โค้ดขยะ = ปฏิเสธ ไม่ crash", (await decodeTransfer("!!!ไม่ใช่base64!!!")) === null);
ok("โค้ดว่าง = ปฏิเสธ", (await decodeTransfer("")) === null);
ok("โค้ดยาวเกินขนาด = ปฏิเสธก่อนถอด", (await decodeTransfer("A".repeat(6_000_000))) === null);
{
  const evil = btoa(unescape(encodeURIComponent(JSON.stringify({ exercises: "PWNED" }))));
  ok("exercises ไม่ใช่ array = ปฏิเสธทั้งก้อน", (await decodeTransfer(evil)) === null);
}
{
  const evil = btoa(unescape(encodeURIComponent(JSON.stringify({ exercises: [null], settings: {}, dayLabels: { mon: {} } }))));
  const d = await decodeTransfer(evil);
  ok("payload พังบางส่วน = ซ่อมแล้วใช้ได้ ไม่ crash", d !== null && d.exercises.length === 0 && typeof d.dayLabels.mon === "string");
}

console.log("\n═══ 5. prototype pollution ═══");
{
  normalizeData(JSON.parse('{"exercises":[],"settings":{},"__proto__":{"polluted":"yes"}}'));
  ok("ไม่ทำให้ Object.prototype โดนแก้", {}.polluted === undefined);
  normalizeData(Object.assign(base(), { history: JSON.parse('{"__proto__":[{"date":"x","sets":[]}]}') }));
  ok("คีย์ __proto__ ใน history ถูกข้าม", {}.polluted === undefined && !Object.prototype.hasOwnProperty.call({}, "date"));
}

console.log("\n═══ 6. ข้อมูลที่ถูกต้องต้องไม่เสียหาย ═══");
{
  const good = base();
  good.exercises = [
    { id: "a", name: "Barbell Bench Press", day: "mon", type: "weight", sets: 4, rmin: 5, rmax: 8, inc: 2.5, unit: "kg", order: 0 },
    { id: "b", name: "Plank", day: "mon", type: "time", sets: 3, rmin: 30, rmax: 45, order: 1 },
  ];
  good.history = { a: [{ date: "2026-07-01", sets: [{ weight: 60, reps: 5, at: 1751328000000 }, null] }] };
  good.dayLabels.mon = "Push Day";
  good.bodyweight = [{ date: "2026-07-01", kg: 61.6 }];
  const d = normalizeData(JSON.parse(JSON.stringify(good)));
  ok("ท่าครบ", d.exercises.length === 2);
  ok("ค่าในท่าไม่ถูกแก้", d.exercises[0].sets === 4 && d.exercises[0].rmax === 8 && d.exercises[0].inc === 2.5);
  ok("ชื่อวันคงเดิม", d.dayLabels.mon === "Push Day");
  ok("ประวัติคงเดิม (รวมเซตที่ยังไม่ติ๊ก)", d.history.a[0].sets.length === 2 && d.history.a[0].sets[0].weight === 60 && d.history.a[0].sets[1] === null);
  ok("timestamp ของเซตคงเดิม", d.history.a[0].sets[0].at === 1751328000000);
  ok("น้ำหนักตัวคงเดิม", d.bodyweight[0].kg === 61.6);
}

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
