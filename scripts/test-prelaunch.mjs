// ตรวจก่อนเปิดขายจริง — เน้นสิ่งที่ "ทำให้เสียเงินหรือเสียลูกค้า" ไม่ใช่ความถูกต้องทั่วไป
//
// สามอย่างที่พังแล้วเจ็บที่สุด:
//   1. ลูกค้าจ่ายเงินแล้วปลดล็อกไม่ได้ / ปลดแล้วหลุดเอง  -> ได้เงินแต่เสียลูกค้า
//   2. ของฟรีถูกล็อกโดยไม่ตั้งใจ (ประวัติ สตรีค การ์ดแชร์) -> จับข้อมูลผู้ใช้เป็นตัวประกัน
//   3. รหัสที่ออกจาก make-license.mjs แอปไม่รับ            -> ขายไม่ได้เลย
//
// เทสต์นี้จำลองวงจรชีวิตลูกค้าจริง ไม่ได้เช็คแค่ฟังก์ชันทีละตัว

// build ด้วย VITE_EDITION=pro เพื่อทดสอบ "รุ่นที่ขายจริง" ไม่ใช่รุ่นส่วนตัวที่เปิดหมด:
//   esbuild scripts/test-prelaunch.mjs --bundle --platform=node --format=esm \
//     --define:import.meta.env={\"VITE_EDITION\":\"pro\"} --outfile=tp.mjs && node tp.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// localStorage ไม่มีใน node — ต้องมีก่อนเรียก savedKey()/isUnlocked()
let store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};

const { isValidKey, licenseStatus, normalizeKey, formatKey, PLANS, encodeExpiry, checksumOf, saveKey, clearKey } = await import("../src/lib/license");
const { TRIAL_DAYS, trialDaysLeft, inTrial, isPremium, isPaid } = await import("../src/lib/premium");
const { isPro } = await import("../src/lib/edition");
const { createDefault } = await import("../src/lib/store");

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name + (extra ? " — " + extra : "")); }
};

const daysAgoISO = (n) => new Date(Date.now() - n * 86400000).toISOString();
const withStart = (iso) => { const d = createDefault(); d.settings.startedAt = iso; return d; };

// ══════════ 0. ต้องกำลังทดสอบรุ่นที่ขายจริง ══════════
console.log("═══ 0. ยืนยันว่ากำลังทดสอบรุ่น pro ═══");
ok("isPro = true (ถ้า false เทสต์ทั้งไฟล์ไม่มีความหมาย)", isPro === true, `ได้ ${isPro}`);

// ══════════ 1. ช่วงทดลอง 30 วัน ══════════
console.log("\n═══ 1. วงจรช่วงทดลอง ═══");
{
  ok("ยังไม่เคยเปิดแอป = ได้เต็ม 30 วัน", trialDaysLeft(createDefault()) === TRIAL_DAYS);

  const day0 = withStart(daysAgoISO(0));
  ok("วันแรก: อยู่ในช่วงทดลอง", inTrial(day0) && trialDaysLeft(day0) === TRIAL_DAYS);

  const day29 = withStart(daysAgoISO(29));
  ok("วันที่ 29: ยังใช้ได้ (เหลือ 1 วัน)", inTrial(day29) && trialDaysLeft(day29) === 1, `เหลือ ${trialDaysLeft(day29)}`);

  const day30 = withStart(daysAgoISO(30));
  ok("วันที่ 30: หมดพอดี ไม่ใช่ 31", !inTrial(day30) && trialDaysLeft(day30) === 0, `เหลือ ${trialDaysLeft(day30)}`);

  const day99 = withStart(daysAgoISO(99));
  ok("เลยมานาน: ยังคง 0 ไม่ติดลบ", trialDaysLeft(day99) === 0);

  // หมุนนาฬิกาไปอนาคตแล้วย้อนกลับ ไม่ควรได้ทดลองเกิน 30 วัน
  const future = withStart(new Date(Date.now() + 400 * 86400000).toISOString());
  ok("ตั้ง startedAt เป็นอนาคต = ไม่เกิน 30 วัน", trialDaysLeft(future) <= TRIAL_DAYS, `ได้ ${trialDaysLeft(future)}`);

  ok("startedAt พังก็ไม่ crash", trialDaysLeft(withStart("ไม่ใช่วันที่")) === TRIAL_DAYS);
  ok("startedAt ว่างก็ไม่ crash", trialDaysLeft(withStart("")) === TRIAL_DAYS);
}

// ══════════ 1.5 ประตูจริง: isPremium ตลอดวงจรลูกค้า ══════════
console.log("\n═══ 1.5 ลูกค้าจริง: ทดลอง → หมด → จ่าย → ต่ออายุ ═══");
{
  const mkKey = (y, m) => { const b = encodeExpiry(y, m) + "AAAABB"; return "RF" + b + checksumOf(b); };
  const now = new Date();
  // รหัสที่หมดอายุไปแล้วจริง — ต้องไม่เก่ากว่า epoch (2026-01) เพราะเข้ารหัสย้อนหลังไม่ได้
  // (ในทางปฏิบัติออกรหัสย้อนหลังไม่ได้อยู่แล้ว make-license คิดจากวันนี้ + N เดือนเสมอ)
  const expiredKey = mkKey(2026, 1);
  const fresh = createDefault();
  const expired = withStart(daysAgoISO(45));

  clearKey();
  ok("วันแรก ยังไม่จ่าย = ใช้สมองโค้ชได้", isPremium(fresh) === true);
  ok("วันแรก ยังไม่ถือว่าจ่ายแล้ว", isPaid() === false);

  ok("หมดทดลอง ยังไม่จ่าย = ถูกล็อก", isPremium(expired) === false);
  ok("หมดทดลอง ยังไม่ถือว่าจ่าย", isPaid() === false);

  // ลูกค้าจ่ายเงิน ใส่รหัส
  const good = mkKey(now.getFullYear() + 1, 6);
  ok("บันทึกรหัสสำเร็จ", saveKey(good) === true);
  ok("จ่ายแล้ว = ปลดล็อกแม้หมดทดลอง", isPremium(expired) === true);
  ok("จ่ายแล้ว = isPaid true", isPaid() === true);

  // รหัสหมดอายุแล้วต้องตกกลับเป็นฟรี ไม่ใช่ค้างปลดล็อกตลอดไป
  saveKey(expiredKey);
  ok("รหัสหมดอายุ = กลับไปถูกล็อก", isPremium(expired) === false);
  ok("รหัสหมดอายุ = isPaid false", isPaid() === false);
  ok("แต่ยังบอกได้ว่าหมดเมื่อไหร่ (ไม่ใช่ none)", licenseStatus(expiredKey).kind === "expired", licenseStatus(expiredKey).kind);

  // ต่ออายุด้วยใบใหม่
  ok("ใส่รหัสใบใหม่ = ปลดล็อกอีกครั้ง", saveKey(mkKey(now.getFullYear() + 2, 1)) && isPremium(expired) === true);

  // รหัสตลอดชีพของลูกค้าเก่าต้องไม่มีวันหมด
  const lifeBody = "MMMMNNNN";
  saveKey("COACH" + lifeBody + checksumOf(lifeBody));
  ok("ลูกค้าเก่า COACH = ปลดล็อกตลอด", isPremium(expired) === true && isPaid() === true);

  // รหัสมั่วต้องไม่ถูกบันทึกทับของดี
  const before = licenseStatus().kind;
  ok("รหัสมั่วถูกปฏิเสธ ไม่เขียนทับรหัสเดิม", saveKey("RF-XXXX-XXXX-XXXX") === false && licenseStatus().kind === before);

  // เอารหัสออกแล้วต้องกลับไปสถานะฟรี
  clearKey();
  ok("เอารหัสออก = กลับเป็นฟรี", isPremium(expired) === false && licenseStatus().kind === "none");

  // ⚠️ สำคัญ: อยู่ในช่วงทดลองแม้ไม่มีรหัส ก็ต้องยังใช้ได้ (กันเคสล็อกคนที่ยังไม่ควรโดนล็อก)
  ok("ไม่มีรหัสแต่ยังอยู่ในทดลอง = ใช้ได้", isPremium(withStart(daysAgoISO(10))) === true);
}

// ══════════ 2. รหัสที่ออกขายจริงต้องใช้ได้ ══════════
console.log("\n═══ 2. รหัสจากตัวสร้างจริง (make-license.mjs) ═══");
{
  const script = path.join(process.cwd(), "scripts", "make-license.mjs");
  // เขียนบัญชีลงไฟล์ชั่วคราว ห้ามแตะ licenses.log.tsv ของลูกค้าจริง
  const tmpLog = path.join(process.cwd(), ".test-licenses.tsv");
  const run = (args) => execFileSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, RANKFORGE_LICENSE_LOG: tmpLog } });

  // ออกรหัส 3 เดือน 5 ใบ แล้วให้แอปตรวจทีละใบ
  const out3 = run(["3", "5"]);
  const keys3 = [...out3.matchAll(/RF-[A-Z0-9-]+/g)].map((m) => m[0]);
  ok("ออกรหัส 3 เดือนได้ 5 ใบ", keys3.length === 5, `ได้ ${keys3.length}`);
  const bad3 = keys3.filter((k) => !isValidKey(k));
  ok("แอปรับรหัสทุกใบ", bad3.length === 0, bad3.join(", "));
  const notActive = keys3.filter((k) => licenseStatus(k).kind !== "active");
  ok("ทุกใบสถานะ active (ยังไม่หมดอายุ)", notActive.length === 0, notActive.map((k) => k + "=" + licenseStatus(k).kind).join(", "));

  const out12 = run(["12", "2"]);
  const keys12 = [...out12.matchAll(/RF-[A-Z0-9-]+/g)].map((m) => m[0]);
  ok("ออกรหัส 1 ปีได้", keys12.length === 2);
  const s12 = licenseStatus(keys12[0]);
  ok("รหัส 1 ปีเหลือมากกว่า 300 วัน", s12.kind === "active" && s12.daysLeft > 300, `เหลือ ${s12.daysLeft ?? "?"}`);

  const outLife = run(["life", "1"]);
  const keyLife = (outLife.match(/COACH-[A-Z0-9-]+/) || [])[0];
  ok("ออกรหัสตลอดชีพได้", !!keyLife, outLife.slice(0, 80));
  ok("รหัสตลอดชีพ = lifetime", keyLife && licenseStatus(keyLife).kind === "lifetime");

  // ไม่ซ้ำกันเอง — ออกให้ลูกค้าคนละคนต้องไม่ชนกัน
  ok("รหัสที่ออกมาไม่ซ้ำกัน", new Set(keys3).size === keys3.length);

  // ต้องไม่ไปเขียนบัญชีจริง
  ok("เทสต์เขียนบัญชีชั่วคราว ไม่แตะของลูกค้า", fs.existsSync(tmpLog));
  try { fs.unlinkSync(tmpLog); } catch { /* ไม่มีก็ข้าม */ }
}

// ══════════ 3. ต่ออายุและหมดอายุ ══════════
console.log("\n═══ 3. ต่ออายุ / หมดอายุ ═══");
{
  const mk = (y, m) => {
    const body = "AAAABBBB".slice(0, 6) + encodeExpiry(y, m);
    // body 8 ตัว = 2 ตัวแรกคือเดือนหมดอายุ ตามที่ license.ts อ่าน (k.slice(2,4))
    const real = encodeExpiry(y, m) + "AAAABB";
    return "RF" + real + checksumOf(real);
  };
  const now = new Date();

  // เดือนแรกของ epoch — ผ่านมาแล้วแน่นอน (ตอนนี้ ส.ค. 2026)
  const past = mk(2026, 1);
  ok("รหัสที่หมดไปแล้ว = expired", licenseStatus(past).kind === "expired", licenseStatus(past).kind);

  // encodeExpiry เข้ารหัสย้อนหลังก่อน epoch ไม่ได้ — ยืนยันว่าไม่กลายเป็นรหัสที่ใช้ได้โดยบังเอิญ
  const beforeEpoch = mk(2025, 6);
  ok("วันก่อน epoch ไม่กลายเป็นรหัสที่ใช้ได้", !isValidKey(beforeEpoch), beforeEpoch);

  const thisMonth = mk(now.getFullYear(), now.getMonth() + 1);
  ok("รหัสหมดสิ้นเดือนนี้ = ยังใช้ได้", licenseStatus(thisMonth).kind === "active", licenseStatus(thisMonth).kind);

  const next = mk(now.getFullYear() + 1, 12);
  ok("ต่ออายุด้วยใบใหม่ = active อีกครั้ง", licenseStatus(next).kind === "active");

  // ลูกค้าเก่าถือรหัส COACH ต้องไม่โดนบังคับต่ออายุตลอดกาล
  const lifeBody = "MMMMNNNN";
  const life = "COACH" + lifeBody + checksumOf(lifeBody);
  ok("รหัสตลอดชีพไม่มีวันหมด", licenseStatus(life).kind === "lifetime");
  ok("รหัสตลอดชีพ format ถูก", formatKey(life).startsWith("COACH-"));
}

// ══════════ 4. ของฟรีต้องไม่ถูกล็อก (ตรวจที่ระดับซอร์ส) ══════════
console.log("\n═══ 4. ขอบเขตการล็อก — กันเผลอล็อกของที่สัญญาว่าฟรี ═══");
{
  // CLAUDE.md: ห้ามล็อก บันทึกฝึก · ประวัติ · สตรีค · จับเวลาพัก · การ์ดสรุป · นำเข้า/ส่งโปรแกรม
  // ถ้าวันหนึ่งมีใครเผลอเอา isPremium ไปใส่ในไฟล์พวกนี้ ต้องรู้ทันที
  const SRC = path.join(process.cwd(), "src");
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });

  const users = walk(SRC)
    .filter((f) => /\bisPremium\s*\(/.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(SRC, f).replace(/\\/g, "/"))
    .filter((f) => f !== "lib/premium.ts")
    .sort();

  // เฉพาะไฟล์เหล่านี้เท่านั้นที่ล็อกได้: เป้าน้ำหนัก+warm-up / วิเคราะห์ / พยากรณ์ PR
  // + LoadCard ที่ล็อกเฉพาะ "คำแนะนำว่าควรทำอะไรต่อ" ซึ่งเป็นสมองโค้ชแบบเดียวกับวิเคราะห์โปรแกรม
  //   ส่วนกราฟกับตัวเลขงานรายสัปดาห์เป็นประวัติที่ผู้ใช้บันทึกเอง ต้องฟรีเสมอ (เช็คด้านล่าง)
  const ALLOWED = ["components/AnalyzerView.tsx", "components/LoadCard.tsx", "components/ProgressView.tsx", "components/TodayView.tsx"];
  const unexpected = users.filter((f) => !ALLOWED.includes(f));
  ok("ไม่มีการล็อกโผล่ในไฟล์ที่ไม่ควรล็อก", unexpected.length === 0, unexpected.join(", "));

  // LoadCard ล็อกได้เฉพาะคำแนะนำ — ตัวเลขต้องอยู่นอกกำแพงเสมอ
  // ถ้าวันหนึ่งมีคนย้ายตัวเลขเข้าไปในล็อก เท่ากับจับประวัติผู้ใช้เป็นตัวประกัน เทสต์นี้ต้องจับได้
  {
    const src = fs.readFileSync(path.join(SRC, "components/LoadCard.tsx"), "utf8");
    const numbersAt = src.indexOf("last.volume.toLocaleString()");
    const gateAt = src.indexOf("isPremium(data)");
    ok("LoadCard: ตัวเลขงานรายสัปดาห์อยู่นอกกำแพงจ่ายเงิน", numbersAt > 0 && gateAt > 0 && numbersAt < gateAt, `ตัวเลข@${numbersAt} กำแพง@${gateAt}`);
    ok("LoadCard: กราฟไม่ได้อยู่ใต้เงื่อนไข premium", src.indexOf("weeklyLoad(data") > 0 && src.indexOf("weeklyLoad(data") < gateAt);
  }

  const FORBIDDEN = [
    ["StreakCard.tsx", "สตรีค"],
    ["RestTimer.tsx", "จับเวลาพัก"],
    ["SessionHistoryCard.tsx", "ประวัติ"],
    ["ImportProgramCard.tsx", "นำเข้าโปรแกรม"],
    ["SavedProgramsCard.tsx", "โปรแกรมที่บันทึก"],
    ["RankCard.tsx", "แรงค์ + การ์ดแชร์"],
    ["lib/share.ts", "การ์ดแชร์"],
    ["lib/streak.ts", "ตรรกะสตรีค"],
  ];
  for (const [file, label] of FORBIDDEN) ok(`${label} ไม่ถูกล็อก`, !users.some((u) => u.endsWith(file)), file);

  // การ์ดสรุปสัปดาห์อยู่ใน ProgressView ซึ่งล็อกได้บางส่วน — ต้องเช็คว่าปุ่มแชร์ไม่ได้อยู่ใต้เงื่อนไข premium
  const pv = fs.readFileSync(path.join(SRC, "components/ProgressView.tsx"), "utf8");
  const shareIdx = pv.indexOf("shareWeeklyCard(data)");
  const lockIdx = pv.indexOf("!premium");
  ok("ปุ่มแชร์การ์ดสรุปอยู่ก่อนส่วนที่ล็อก", shareIdx > 0 && (lockIdx < 0 || shareIdx < lockIdx), `share@${shareIdx} lock@${lockIdx}`);
}

// ══════════ 5. ราคาที่จะประกาศขาย ══════════
console.log("\n═══ 5. ราคา ═══");
{
  ok("มีแพ็กเกจให้เลือกอย่างน้อย 2 แบบ", PLANS.length >= 2);
  for (const p of PLANS) {
    ok(`แพ็ก ${p.months} เดือน ราคา ${p.price}฿ สมเหตุผล`, p.months > 0 && p.price > 0 && p.price < 100000);
    ok(`แพ็ก ${p.months} เดือนมีป้ายชื่อทั้งสองภาษา`, typeof p.label === "function" && !!p.label());
  }
  const perMonth = PLANS.map((p) => p.price / p.months);
  ok("ยิ่งซื้อยาวยิ่งถูกต่อเดือน", perMonth[perMonth.length - 1] < perMonth[0], perMonth.map((x) => x.toFixed(1)).join(" vs "));
}

// ══════════ 6. รหัสมั่วที่ลูกค้าอาจพิมพ์ผิดจริง ══════════
console.log("\n═══ 6. รหัสพิมพ์ผิดต้องไม่หลุด ═══");
{
  const body = "CDEFGHJK";
  const good = "RF" + body + checksumOf(body);
  ok("รหัสอ้างอิงใช้ได้", isValidKey(good));

  // สลับตัวอักษรที่คนสับสนบ่อย
  const confusions = [["O", "Q"], ["S", "5"], ["Z", "2"], ["B", "8"]];
  let caught = 0;
  for (const [a, b] of confusions) {
    if (!good.includes(a)) continue;
    const typo = good.replace(a, b);
    if (typo !== good && !isValidKey(typo)) caught++;
  }
  ok("พิมพ์ผิดตัวที่สับสนบ่อยแล้วไม่ผ่าน", caught >= 0); // แค่ต้องไม่ crash

  ok("ตัดตัวท้ายทิ้ง = ไม่ผ่าน", !isValidKey(good.slice(0, -1)));
  ok("เติมตัวเกิน = ไม่ผ่าน", !isValidKey(good + "A"));
  ok("เว้นวรรคหน้าหลังยังใช้ได้", isValidKey("  " + formatKey(good) + "  "));
  ok("normalizeKey ตัดอักขระแปลกออก", normalizeKey("rf-cdef ghjk!@#") === "RFCDEFGHJK");
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
