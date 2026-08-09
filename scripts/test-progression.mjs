// การแนะนำน้ำหนักครั้งหน้า — ตรรกะที่ผิดแล้วผู้ใช้ฝึกผิดตามไปทั้งสัปดาห์
//
// เคสหลักที่ต้องผ่าน (เคสจริงของผู้ใช้):
//   leg extension เซตแรก 20x12 แล้วลดเหลือ 10x15 สองเซต
//   ของเดิมบอก "คงน้ำหนัก 20 แล้วดันให้ถึง 15" ซึ่งเพิ่งพิสูจน์ไปเองว่าทำไม่ได้
//   ที่ถูกคือเสนอน้ำหนักกลางที่น่าจะทำครบได้ทั้งชุด
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-progression.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { liftStyle, suggestTarget } from "../src/lib/progression.ts";
import { createDefault, createEmpty } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };
const eq = (n, got, want) => ok(n, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

const dk = (b) => { const d = new Date(); d.setDate(d.getDate() - b); return d.toISOString().slice(0, 10); };

function mk(ex, sets, daysAgo = 7) {
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  d.history = { [ex.id]: [{ date: dk(daysAgo), sets }] };
  return d;
}
const EX = (over = {}) => ({ id: "e", name: "Leg Extension", day: "mon", type: "weight", sets: 3, rmin: 12, rmax: 15, unit: "kg", inc: 2.5, order: 0, ...over });

console.log("═══ 1. เคสจริง: เซตแรกหนักไป แล้วลดน้ำหนักเซตหลัง ═══");
{
  const ex = EX();
  const t = suggestTarget(mk(ex, [{ weight: 20, reps: 12 }, { weight: 10, reps: 15 }, { weight: 10, reps: 15 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg · ${t.msg}`);
  eq("รู้ว่ากำลังหาน้ำหนักที่ใช่", t.kind, "settle");
  ok("เสนอน้ำหนักกลาง ไม่ใช่ค้างที่ 20", t.weight > 10 && t.weight < 20, `ได้ ${t.weight}`);
  eq("ปัดลงหมุด 2.5 ได้ 15", t.weight, 15);
  ok("บอกด้วยว่าให้ทำครบทั้ง 3 เซต", /ทั้ง 3 เซต/.test(t.msg), t.msg);
}
{
  // ลดน้ำหนักแต่เซตแรกทำครบเป้าแล้ว = ไม่ใช่เคสหาน้ำหนัก แค่หมดแรงท้าย
  const ex = EX();
  const t = suggestTarget(mk(ex, [{ weight: 20, reps: 15 }, { weight: 20, reps: 15 }, { weight: 15, reps: 15 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  ok("เซตแรกครบเป้าแล้วไม่ถือว่าต้องหาน้ำหนักใหม่", t.kind !== "settle", t.kind);
}

console.log("\n═══ 2. ครบทุกเซต = ขึ้นน้ำหนัก ═══");
{
  const ex = EX();
  const t = suggestTarget(mk(ex, [{ weight: 15, reps: 15 }, { weight: 15, reps: 15 }, { weight: 15, reps: 15 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("ขึ้นน้ำหนัก", t.kind, "up");
  eq("ขึ้นทีละ inc", t.weight, 17.5);
}
{
  // ครบเป้าแต่เหลือแรงเยอะ -> ขึ้นได้เลยไม่ต้องลังเล
  const ex = EX({ name: "Cable Lateral Raise" });
  const t = suggestTarget(mk(ex, [{ weight: 10, reps: 15 }, { weight: 10, reps: 15 }, { weight: 10, reps: 15, rir: 4 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("เหลือแรงเยอะ = ขึ้นเลยแม้เป็นท่าเดี่ยว", t.kind, "up");
  ok("บอกด้วยว่าเหลือแรงเท่าไหร่", /เหลือแรง 4/.test(t.msg), t.msg);
}

console.log("\n═══ 3. ท่าเดี่ยว/เคเบิลต้องไม่รีบขึ้นน้ำหนัก ═══");
{
  const st = liftStyle(EX({ name: "Cable Lateral Raise" }));
  ok("รู้ว่าเป็นท่าเดี่ยวแบบเคเบิล", st.holdRounds > 1, JSON.stringify(st));
  ok("มีคำแนะนำเรื่องคุมฟอร์ม", /คุมฟอร์ม/.test(st.note || ""), st.note);
}
{
  // ครบเป้าแต่เหลือแรงแค่ 1 -> ท่าเดี่ยวย้ำอีกรอบก่อน
  const ex = EX({ name: "Cable Lateral Raise" });
  const t = suggestTarget(mk(ex, [{ weight: 10, reps: 15 }, { weight: 10, reps: 15 }, { weight: 10, reps: 15, rir: 1 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg · ${t.msg}`);
  eq("ยังไม่ขึ้น ย้ำน้ำหนักเดิมก่อน", t.kind, "hold");
  eq("คงน้ำหนักเดิม", t.weight, 10);
}
{
  // ท่ารวมหนัก ครบเป้าเหลือแรง 1 -> ขึ้นได้เลย ไม่ต้องย้ำ
  const ex = EX({ name: "Barbell Squat", rmin: 5, rmax: 8, sets: 3, inc: 5 });
  const t = suggestTarget(mk(ex, [{ weight: 100, reps: 8 }, { weight: 100, reps: 8 }, { weight: 100, reps: 8, rir: 1 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("ท่ารวมขึ้นได้เลย", t.kind, "up");
  eq("ขึ้นตาม inc ของท่านั้น", t.weight, 105);
}

console.log("\n═══ 4. หนักเกินจนหลุดช่วงล่าง = ต้องลด (หลังให้โอกาสแล้ว) ═══");
{
  // พลาดที่น้ำหนักเดิมสองรอบติด -> ถึงเวลาลดจริง
  const ex = EX();
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  const heavy = [{ weight: 25, reps: 8 }, { weight: 25, reps: 7 }, { weight: 25, reps: 6 }];
  d.history = { e: [{ date: dk(14), sets: heavy }, { date: dk(7), sets: heavy }] };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg · ${t.msg.slice(0, 60)}`);
  eq("ลดน้ำหนัก", t.kind, "settle");
  eq("ลดลงหนึ่งสเต็ป", t.weight, 22.5);
}
{
  // อยู่ในช่วงเป้าแต่ยังไม่ถึงเพดาน = คงน้ำหนักดันเรป
  const ex = EX();
  const t = suggestTarget(mk(ex, [{ weight: 15, reps: 13 }, { weight: 15, reps: 13 }, { weight: 15, reps: 12 }]), ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("คงน้ำหนัก", t.kind, "hold");
  eq("น้ำหนักเดิม", t.weight, 15);
}

console.log("\n═══ 5. ห้ามวนไปกลับระหว่างสองน้ำหนัก ═══");
{
  // ครบที่ 15 -> ขึ้น 17.5 -> ไม่ไหว -> ถอย 15 -> ครบ -> ต้องไม่กระโดดกลับ 17.5 ทันที
  const ex = EX();
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  d.history = { e: [
    { date: dk(21), sets: [{ weight: 15, reps: 15 }, { weight: 15, reps: 15 }, { weight: 15, reps: 15 }] },
    { date: dk(14), sets: [{ weight: 17.5, reps: 14 }, { weight: 17.5, reps: 12 }, { weight: 17.5, reps: 10 }] },
    { date: dk(7), sets: [{ weight: 15, reps: 15 }, { weight: 15, reps: 15 }, { weight: 15, reps: 15, rir: 1 }] },
  ] };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg · ${t.msg.slice(0, 70)}`);
  eq("ไม่กระโดดกลับไป 17.5 ที่เพิ่งพลาด", t.weight, 15);
  ok("บอกเหตุผลว่าเคยลองแล้วไม่ผ่าน", /เคยลอง 17.5/.test(t.msg), t.msg);
}
{
  // แต่ถ้าย่ำครบเป้ามา 3 รอบแล้ว ต้องได้ลองใหม่ ไม่ใช่ล็อกตลอดกาล
  const ex = EX();
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  const full = (w) => ({ weight: w, reps: 15 });
  d.history = { e: [
    { date: dk(28), sets: [{ weight: 17.5, reps: 14 }, { weight: 17.5, reps: 11 }, { weight: 17.5, reps: 10 }] },
    { date: dk(21), sets: [full(15), full(15), full(15)] },
    { date: dk(14), sets: [full(15), full(15), full(15)] },
    { date: dk(7), sets: [full(15), full(15), full(15)] },
  ] };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("ย่ำครบ 3 รอบแล้วได้ลองขึ้นใหม่", t.kind, "up");
  eq("ขึ้นไป 17.5", t.weight, 17.5);
}

console.log("\n═══ 6. หลุดเป้าครั้งแรกยังไม่ลด · ค้างนานต้องมีทางออก ═══");
{
  const ex = EX();
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  d.history = { e: [{ date: dk(7), sets: [{ weight: 20, reps: 11 }, { weight: 20, reps: 10 }, { weight: 20, reps: 9 }] }] };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("พลาดรอบแรกยังไม่ลด ให้ลองอีกที", t.kind, "hold");
  eq("คงน้ำหนักเดิม", t.weight, 20);
}
{
  // ค้างในช่วงเป้าแต่ไม่ถึงเพดาน 4 รอบ -> ต้องเสนอ deload และคืนน้ำหนักที่ลดแล้วจริง
  const ex = EX();
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  const mid = { weight: 17.5, reps: 13 };
  d.history = { e: [28, 21, 14, 7].map((b) => ({ date: dk(b), sets: [mid, mid, mid] })) };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg · ${t.msg.slice(0, 60)}`);
  eq("เสนอถอยเพื่อไต่ใหม่", t.kind, "settle");
  eq("คืนน้ำหนักที่ลดแล้ว ไม่ใช่ค่าเดิม", t.weight, 15);
  ok("ข้อความตรงกับน้ำหนักที่คืน", t.msg.includes("15 kg"), t.msg);
}

console.log("\n═══ 7. ก้าวกระโดดเยอะเกินต้องเสนอเพิ่มเรปแทน ═══");
{
  // 7.5 -> 10 คือ +33% · เพิ่งพลาดที่ 10 มา -> ต้องไม่ดันขึ้นซ้ำแม้เหลือแรงเยอะ
  const ex = EX({ name: "Cable Lateral Raise" });
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  d.history = { e: [
    { date: dk(14), sets: [{ weight: 10, reps: 13 }, { weight: 10, reps: 11 }, { weight: 10, reps: 9 }] },
    { date: dk(7), sets: [{ weight: 7.5, reps: 15 }, { weight: 7.5, reps: 15 }, { weight: 7.5, reps: 15, rir: 4 }] },
  ] };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg · ${t.msg.slice(0, 80)}`);
  eq("ไม่ดันขึ้นทั้งที่เหลือแรงเยอะ", t.weight, 7.5);
  ok("บอกว่ากระโดดกี่ %", /กระโดด 33%/.test(t.msg), t.msg);
  ok("เสนอทางอื่นแทนการขึ้นน้ำหนัก", /เกิน 15 ครั้ง|เพิ่มอีกเซต/.test(t.msg), t.msg);
}

console.log("\n═══ 8. ข้อมูลเก่าที่ไม่มี RIR ต้องยังทำงานเหมือนเดิม ═══");
{
  const ex = EX();
  const t = suggestTarget(mk(ex, [{ weight: 15, reps: 15 }, { weight: 15, reps: 15 }, { weight: 15, reps: 15 }]), ex);
  ok("ไม่มี RIR ก็ยังแนะนำได้", t.weight !== null && !/undefined|NaN/.test(t.msg), t.msg);
}
{
  const ex = EX();
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [ex];
  d.history = {};
  const t = suggestTarget(d, ex);
  eq("ไม่เคยเล่นมาก่อน = เซสชันแรก", t.kind, "start");
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
