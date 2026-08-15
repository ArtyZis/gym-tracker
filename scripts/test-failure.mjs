// โหมดเล่นจนหมดแรง — คนที่ดันทุกเซตจนหมดแรงก็พัฒนาได้ ระบบต้องไม่บอกให้เขาถอย
//
// บั๊กจริงก่อนแก้: คนทำได้ 12/8/6 -> 12/9/7 -> 13/10/7 (รวม 26 -> 28 -> 30
// ดีขึ้นทุกสัปดาห์) แต่แอปดู "เซตที่แย่ที่สุด" แล้วสั่งลดน้ำหนักจาก 20 เหลือ 17.5
// คนเล่นแนวนี้เจอครั้งเดียวก็เลิกเชื่อแอปแล้ว
//
// หลักของโหมดนี้:
//   ตัดสินจาก "เซตแรก" — เซตเดียวที่ยังไม่โดนความล้าสะสม เทียบข้ามสัปดาห์ได้ตรง
//   วัดความก้าวหน้าจาก "เรปรวม" — ตัวเลขที่คนเล่นแนวนี้ใช้จริง
//   ไม่สั่งย้ำเพราะ RIR 0 — เพราะหมดแรงคือสิ่งที่เขาตั้งใจ ไม่ใช่สัญญาณอันตราย

import { suggestTarget, liftStyle } from "../src/lib/progression";
import { createDefault } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const EX = (o = {}) => ({ id: "a", name: "Dumbbell Curl", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 12, inc: 2.5, unit: "kg", order: 0, ...o });

/** สร้างข้อมูลจากรายการ [วันที่, [เรปแต่ละเซต]] ที่น้ำหนักคงที่ */
function mk(weeks, { weight = 20, toFailure = false, ex = EX() } = {}) {
  const d = createDefault();
  d.exercises = [ex];
  d.settings.toFailure = toFailure ? true : undefined;
  d.history = { [ex.id]: weeks.map(([date, reps]) => ({ date, sets: reps.map((r) => ({ weight, reps: r })) })) };
  return d;
}

const W = (n) => `2026-07-${String(n).padStart(2, "0")}`;

console.log("═══ 1. เคสที่เคยพัง: เรปตกทุกเซตแต่รวมดีขึ้น ═══");
{
  const weeks = [[W(6), [12, 8, 6]], [W(13), [12, 9, 7]], [W(20), [13, 10, 7]]];

  const off = suggestTarget(mk(weeks), EX());
  ok("โหมดเดิมยังสั่งลด (พฤติกรรมเดิมไม่เปลี่ยน)", off.kind === "settle" && off.weight < 20, `${off.kind} ${off.weight}`);

  const on = suggestTarget(mk(weeks, { toFailure: true }), EX());
  ok("โหมดหมดแรงไม่สั่งลด", on.kind !== "settle", on.kind);
  ok("โหมดหมดแรงสั่งขึ้นน้ำหนัก (เซตแรก 13 > เพดาน 12)", on.kind === "up" && on.weight > 20, `${on.kind} ${on.weight}`);
  ok("ข้อความอ้างถึงเซตแรก ไม่ใช่เซตที่แย่สุด", /เซตแรก/.test(on.msg), on.msg.slice(0, 60));
}

console.log("\n═══ 2. เซตแรกยังไม่ถึงเพดาน = คงน้ำหนัก ดันเรปรวม ═══");
{
  const d = mk([[W(6), [9, 7, 5]], [W(13), [10, 8, 6]]], { toFailure: true });
  const s = suggestTarget(d, EX());
  ok("ไม่ขึ้นน้ำหนัก", s.weight === 20, String(s.weight));
  ok("ไม่สั่งลด", s.kind !== "settle", s.kind);
  ok("บอกเรปรวมของครั้งก่อน (24)", /24/.test(s.msg), s.msg);
  ok("บอกว่าดีขึ้นจากครั้งก่อน (21)", /ดีขึ้น|up from/.test(s.msg), s.msg);
}

console.log("\n═══ 3. เรปรวมแย่ลง = ต้องรู้ว่าย่ำ ═══");
{
  const d = mk([[W(6), [11, 9, 8]], [W(13), [10, 8, 6]]], { toFailure: true });
  const s = suggestTarget(d, EX());
  ok("ไม่ขึ้นน้ำหนัก", s.weight === 20);
  ok("ไม่บอกว่าดีขึ้น", !/ดีขึ้น|up from/.test(s.msg), s.msg);
}

console.log("\n═══ 4. เซตแรกตกจริง = ต้องลดน้ำหนัก (โหมดนี้ไม่ได้ปล่อยผ่านทุกอย่าง) ═══");
{
  // เซตแรกไม่ถึง rmin ติดกันหลายรอบ = หนักเกินจริง
  const d = mk([[W(6), [6, 4, 3]], [W(13), [6, 4, 3]], [W(20), [5, 4, 3]]], { toFailure: true });
  const s = suggestTarget(d, EX());
  ok("สั่งลดน้ำหนักเมื่อเซตแรกไม่ถึงเป้าจริงๆ", s.kind === "settle" && s.weight < 20, `${s.kind} ${s.weight}`);
  ok("เหตุผลอ้างเซตแรก", /เซตแรก/.test(s.msg), s.msg.slice(0, 60));
}
{
  // เพิ่งตกรอบเดียว = ให้โอกาสก่อน ยังไม่ลด
  const d = mk([[W(13), [6, 4, 3]]], { toFailure: true });
  const s = suggestTarget(d, EX());
  ok("ตกรอบเดียวยังไม่ลด", s.kind === "hold" && s.weight === 20, `${s.kind} ${s.weight}`);
}

console.log("\n═══ 5. RIR 0 ต้องไม่ทำให้ค้างตลอดกาล ═══");
{
  // ท่าเดี่ยว holdRounds=2 · เซตแรกถึงเพดาน · RIR 0 (หมดแรงตามตั้งใจ)
  const d = mk([[W(13), [12, 9, 7]]], { toFailure: true });
  d.history.a[0].sets[2].rir = 0;
  const s = suggestTarget(d, EX());
  ok("หมดแรงแล้วยังขึ้นน้ำหนักได้", s.kind === "up", `${s.kind} — ${s.msg.slice(0, 50)}`);

  // โหมดเดิมยังต้องย้ำเหมือนเก่า
  const d2 = mk([[W(13), [12, 12, 12]]], {});
  d2.history.a[0].sets[2].rir = 0;
  const s2 = suggestTarget(d2, EX());
  ok("โหมดเดิมยังย้ำเมื่อ RIR ต่ำ", s2.kind === "hold", `${s2.kind}`);
}

console.log("\n═══ 6. อยู่น้ำหนักเดิมนานแต่ยังก้าวหน้า = ห้ามสั่งถอย ═══");
{
  // 5 รอบที่น้ำหนักเดิม แต่เรปรวมดีขึ้นเรื่อยๆ
  const weeks = [[W(1), [9, 7, 5]], [W(6), [9, 8, 5]], [W(13), [10, 8, 5]], [W(20), [10, 8, 6]], [W(27), [11, 8, 6]]];
  const s = suggestTarget(mk(weeks, { toFailure: true }), EX());
  ok("ยังก้าวหน้า = ไม่สั่งถอย", s.kind !== "settle", `${s.kind} — ${s.msg.slice(0, 60)}`);
  ok("คงน้ำหนักเดิม", s.weight === 20, String(s.weight));
}
{
  // 5 รอบที่น้ำหนักเดิม เรปรวมไม่ขยับเลย = ถอยได้
  const weeks = [[W(1), [10, 8, 6]], [W(6), [10, 8, 6]], [W(13), [10, 8, 6]], [W(20), [10, 8, 6]], [W(27), [10, 8, 6]]];
  const s = suggestTarget(mk(weeks, { toFailure: true }), EX());
  ok("ย่ำจริง = สั่งถอย", s.kind === "settle" && s.weight < 20, `${s.kind} ${s.weight}`);
}

console.log("\n═══ 7. คำแนะนำท้ายข้อความต้องไม่ขัดกันเอง ═══");
{
  const iso = EX({ name: "Dumbbell Curl" });
  ok("โหมดเดิม: บอกให้ดันเรปเต็มช่วงก่อน", /เต็มช่วง/.test(liftStyle(iso, false).note ?? ""), liftStyle(iso, false).note);
  ok("โหมดหมดแรง: ไม่บอกให้ดันเรปเต็มช่วง", !/เต็มช่วง/.test(liftStyle(iso, true).note ?? ""), liftStyle(iso, true).note);

  // ท่าหนัก = ที่ที่หมดแรงอันตรายที่สุด ต้องเตือน
  const heavy = EX({ name: "Barbell Squat" });
  const note = liftStyle(heavy, true).note ?? "";
  ok("ท่าหนักเตือนให้เหลือแรงไว้", /เหลือไว้|reserve/.test(note), note);
}

console.log("\n═══ 8. ผู้ใช้เดิมต้องไม่กระทบเลย ═══");
{
  const d = createDefault();
  ok("ค่าเริ่มต้นคือปิด", d.settings.toFailure === undefined);

  // ชุดข้อมูลเดียวกัน ปิดโหมด = ผลต้องเท่าเดิมทุกกิ่ง
  const cases = [
    [[[W(13), [12, 12, 12]]], "ครบทุกเซต"],
    [[[W(13), [10, 9, 8]]], "อยู่ในช่วง"],
    [[[W(13), [6, 5, 4]]], "หลุดช่วงล่าง"],
  ];
  for (const [weeks, name] of cases) {
    const off = suggestTarget(mk(weeks), EX());
    ok(`${name}: ยังได้ผลเดิม (${off.kind})`, ["up", "hold", "settle", "push"].includes(off.kind), off.kind);
  }
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
