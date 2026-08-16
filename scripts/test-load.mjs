// ปริมาณงานจริงต่อสัปดาห์ + จังหวะสัปดาห์เบา
//
// เคสจริงที่ทำให้ต้องมี: ผู้ใช้ไต่ 23 -> 89 -> 128 เซต/สัปดาห์ ใน 3 สัปดาห์
// โดยไม่มีอะไรในแอปบอกเลย รู้ตัวอีกทีตอนไม่อยากไปยิมแล้ว
//
// ⚠️ ตัวนี้ต้องไม่กลายเป็นตัวดุคนที่ตั้งใจฝึกหนัก — ปริมาณสูงแบบคงที่ต้องอ่านว่า "ปกติ"
// ไม่ใช่ "อันตราย" เตือนเฉพาะตอนไต่เร็วผิดปกติ หรือดันติดกันนานจนควรแทรกสัปดาห์เบา

import { BUILD_WEEKS_BEFORE_DELOAD, SPIKE_RATIO, loadStatus, weekStart, weeklyLoad } from "../src/lib/load";
import { createDefault } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

/** สร้างข้อมูลจากจำนวนเซตต่อสัปดาห์ที่ต้องการ — สัปดาห์แรกอยู่ไกลสุดในอดีต */
function mk(setsPerWeek, { endMonday = "2026-08-10" } = {}) {
  const d = createDefault();
  d.exercises = [{ id: "a", name: "Bench", day: "mon", type: "weight", sets: 4, rmin: 8, rmax: 8, inc: 2.5, unit: "kg", order: 0 }];
  d.history = { a: [] };
  const [y, m, day] = endMonday.split("-").map(Number);
  for (let i = 0; i < setsPerWeek.length; i++) {
    const weeksBack = setsPerWeek.length - 1 - i;
    const mon = new Date(y, m - 1, day - weeksBack * 7);
    const n = setsPerWeek[i];
    if (n === 0) continue;
    // กระจายลง 4 วันในสัปดาห์นั้น
    for (let k = 0; k < n; k++) {
      const dt = new Date(mon);
      dt.setDate(mon.getDate() + (k % 4));
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      let ses = d.history.a.find((s) => s.date === date);
      if (!ses) { ses = { date, sets: [] }; d.history.a.push(ses); }
      ses.sets.push({ weight: 50, reps: 8 });
    }
  }
  d.history.a.sort((x, z) => x.date.localeCompare(z.date));
  return d;
}

// วันจันทร์ถัดจากสัปดาห์สุดท้าย = "วันนี้" เพื่อให้ทุกสัปดาห์ในชุดถือว่าจบแล้ว
const dayAfter = (endMonday, plusDays = 7) => {
  const [y, m, d] = endMonday.split("-").map(Number);
  return new Date(y, m - 1, d + plusDays);
};

console.log("═══ 1. หาวันจันทร์ของสัปดาห์ถูกไหม (เวลาท้องถิ่นล้วน) ═══");
{
  ok("จันทร์ -> ตัวเอง", weekStart("2026-08-10") === "2026-08-10");
  ok("พุธ -> จันทร์ก่อนหน้า", weekStart("2026-08-12") === "2026-08-10");
  ok("อาทิตย์ -> จันทร์ของสัปดาห์เดียวกัน (ไม่ใช่วันถัดไป)", weekStart("2026-08-16") === "2026-08-10", weekStart("2026-08-16"));
  ok("เสาร์ -> จันทร์เดียวกัน", weekStart("2026-08-15") === "2026-08-10");
  ok("ข้ามเดือนได้", weekStart("2026-09-01") === "2026-08-31", weekStart("2026-09-01"));
  ok("ข้ามปีได้", weekStart("2026-01-01") === "2025-12-29", weekStart("2026-01-01"));
}

console.log("\n═══ 2. นับงานรายสัปดาห์ ═══");
{
  const d = mk([10, 20, 30]);
  const w = weeklyLoad(d);
  ok("ได้ 3 สัปดาห์", w.length === 3, String(w.length));
  ok("เรียงจากเก่าไปใหม่", w[0].start < w[1].start && w[1].start < w[2].start);
  ok("นับเซตถูก", w.map((x) => x.sets).join(",") === "10,20,30", w.map((x) => x.sets).join(","));
  ok("นับน้ำหนักรวมถูก (30 เซต × 50kg × 8)", w[2].volume === 30 * 400, String(w[2].volume));
  ok("นับวันที่ฝึกไม่ซ้ำ", w[2].days === 4, String(w[2].days));
  ok("จำกัดจำนวนสัปดาห์ได้", weeklyLoad(mk([5, 5, 5, 5, 5, 5]), 3).length === 3);
}
{
  // สัปดาห์ที่ไม่ได้ฝึกเลยต้องถูกข้าม ไม่ใช่นับเป็น 0
  const w = weeklyLoad(mk([20, 0, 20]));
  ok("สัปดาห์ที่ไม่ได้ฝึกถูกข้าม ไม่มีแท่ง 0", w.length === 2 && w.every((x) => x.sets === 20), JSON.stringify(w.map((x) => x.sets)));
}

console.log("\n═══ 3. ไต่เร็วเกิน ═══");
{
  const end = "2026-08-10";
  const now = dayAfter(end);
  const s = loadStatus(mk([89, 128], { endMonday: end }), now);
  ok("89 -> 128 (+44%) = เตือนว่าไต่เร็ว", s.kind === "spike", s.kind);
  ok("บอกตัวเลขทั้งสองฝั่ง", s.kind === "spike" && s.prev === 89 && s.sets === 128);
  ok("คิด % ถูก", s.kind === "spike" && s.pct === 44, s.kind === "spike" ? String(s.pct) : "");
}
{
  const now = dayAfter("2026-08-10");
  ok("+15% = ไม่เตือน ถือว่าไต่ปกติ", loadStatus(mk([100, 115], { endMonday: "2026-08-10" }), now).kind === "building");
  ok(`ที่เกณฑ์พอดี (×${SPIKE_RATIO}) = เตือน`, loadStatus(mk([100, 130], { endMonday: "2026-08-10" }), now).kind === "spike");
  ok("ต่ำกว่าเกณฑ์นิดเดียว = ไม่เตือน", loadStatus(mk([100, 129], { endMonday: "2026-08-10" }), now).kind === "building");
}

console.log("\n═══ 4. ปริมาณสูงแบบคงที่ = ปกติ ไม่ใช่อันตราย (สำคัญที่สุด) ═══");
{
  // คนที่ตั้งใจดัน 128 เซตทุกสัปดาห์ ต้องไม่โดนดุว่าฝึกหนักเกิน
  const now = dayAfter("2026-08-10");
  const s = loadStatus(mk([128, 128], { endMonday: "2026-08-10" }), now);
  ok("128 เซตคงที่ 2 สัปดาห์ = ทรงตัว ไม่เตือน", s.kind === "steady", s.kind);
  ok("ไม่มีคำว่าเตือนไต่เร็ว", s.kind !== "spike");
}
{
  const now = dayAfter("2026-08-10");
  const s = loadStatus(mk([140, 120], { endMonday: "2026-08-10" }), now);
  ok("ลดลงเอง = ทรงตัว ไม่เตือนอะไร", s.kind === "steady", s.kind);
}

console.log("\n═══ 5. ถึงเวลาแทรกสัปดาห์เบา ═══");
{
  const now = dayAfter("2026-08-10");
  const s = loadStatus(mk([100, 105, 110, 115], { endMonday: "2026-08-10" }), now);
  ok(`ดันขึ้นติดกัน ${BUILD_WEEKS_BEFORE_DELOAD} สัปดาห์ = เสนอสัปดาห์เบา`, s.kind === "deloadDue", s.kind);
  ok("บอกจำนวนสัปดาห์ที่ดันมา", s.kind === "deloadDue" && s.weeks >= 4, s.kind === "deloadDue" ? String(s.weeks) : "");
  ok("เสนอเลขที่เบาลงจริง", s.kind === "deloadDue" && s.suggest < s.sets && s.suggest > 0, s.kind === "deloadDue" ? `${s.suggest} จาก ${s.sets}` : "");
}
{
  // มีสัปดาห์เบาคั่นแล้ว ต้องนับใหม่ ไม่ใช่เตือนซ้ำ
  const now = dayAfter("2026-08-10");
  const s = loadStatus(mk([100, 105, 60, 105, 110], { endMonday: "2026-08-10" }), now);
  ok("เคยแทรกสัปดาห์เบาแล้ว = ไม่เตือนซ้ำ", s.kind !== "deloadDue", s.kind);
}
{
  // ดันแค่ 3 สัปดาห์ ยังไม่ถึงเกณฑ์
  const now = dayAfter("2026-08-10");
  ok("ดัน 3 สัปดาห์ ยังไม่เสนอ", loadStatus(mk([100, 105, 110], { endMonday: "2026-08-10" }), now).kind !== "deloadDue");
}

console.log("\n═══ 6. ข้อมูลน้อย / สัปดาห์ที่ยังไม่จบ ═══");
{
  ok("ไม่มีประวัติเลย = ไม่สรุปอะไร", loadStatus(createDefault()).kind === "none");
  ok("มีสัปดาห์เดียว = ไม่สรุป (ไม่มีอะไรให้เทียบ)", loadStatus(mk([50], { endMonday: "2026-08-10" }), dayAfter("2026-08-10")).kind === "none");

  // สัปดาห์ปัจจุบันต้องไม่ถูกเอามาเทียบ ไม่งั้นวันพุธจะเห็นแค่ครึ่งเดียวแล้วสรุปว่าตก
  const d = mk([100, 100, 20], { endMonday: "2026-08-10" });
  const midWeek = new Date(2026, 7, 12); // พุธของสัปดาห์ 10 ส.ค. — สัปดาห์ล่าสุดยังไม่จบ
  const s = loadStatus(d, midWeek);
  ok("สัปดาห์ที่ยังไม่จบไม่ถูกเอามาตัดสิน", s.kind === "steady" && s.sets === 100, `${s.kind} ${s.sets ?? ""}`);
}

console.log("\n═══ 7. ไม่ทำแอปล้มกับข้อมูลพิกล ═══");
{
  const d = createDefault();
  d.history = { a: [{ date: "2026-08-10", sets: [null, null] }] }; // เซตว่างทั้งหมด
  ok("เซสชันที่ไม่มีเซตจริง = ข้าม", weeklyLoad(d).length === 0);

  const d2 = createDefault();
  d2.history = { a: [{ date: "2026-08-10", sets: [{ reps: 10 }] }] }; // ท่า bodyweight ไม่มีน้ำหนัก
  const w = weeklyLoad(d2);
  ok("ท่าไม่มีน้ำหนัก = นับเซตได้ น้ำหนักรวมเป็น 0", w.length === 1 && w[0].sets === 1 && w[0].volume === 0);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
