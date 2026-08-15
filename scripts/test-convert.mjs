// เส้นทางที่ทำให้คนกลายเป็นลูกค้า — จุดที่รั่วแล้วเสียเงินจริง
//
// สามเรื่องที่เทสต์นี้กัน:
//   1. นาฬิกาทดลองต้องเริ่มตอนบันทึกเซตแรก ไม่ใช่ตอนเปิดแอป
//      (เปิดดูแล้วปิดไปสามสัปดาห์ กลับมาเหลือ 9 วัน = หมดก่อนได้ลองจริง)
//   2. ปุ่มซื้อต้องพาไปถึงจริงทุกแบบของช่องทาง และห้ามโชว์ปุ่มหลอกตอนยังไม่ตั้งค่า
//   3. ของที่สัญญาว่าฟรีต้องไม่โดนล็อกตาม (ซ้ำกับ test-prelaunch โดยตั้งใจ
//      เพราะรอบนี้แตะ premium.ts ตรงๆ)

import { TRIAL_DAYS, isPaid, isPremium, startTrialIfNeeded, trialDaysLeft } from "../src/lib/premium";
import { buyChannel, hasBuyChannel } from "../src/lib/contact";
import { createDefault } from "../src/lib/store";
import { isPro } from "../src/lib/edition";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

console.log("═══ 1. นาฬิกาทดลองเริ่มตอนบันทึกเซตแรก ไม่ใช่ตอนเปิดแอป ═══");
{
  const d = createDefault();
  ok("แอปใหม่เอี่ยม: ยังไม่เริ่มนับ", d.settings.startedAt === undefined);
  ok("ยังไม่เริ่มนับ = ยังได้ครบ 30 วัน", trialDaysLeft(d) === TRIAL_DAYS, String(trialDaysLeft(d)));

  // จำลอง: โหลดมาดู ปิดไป กลับมาอีก 60 วันถัดมาแล้วเพิ่งเริ่มเล่น
  startTrialIfNeeded(d);
  ok("บันทึกเซตแรกแล้ว = เริ่มนับ", typeof d.settings.startedAt === "string");
  ok("เริ่มนับวันนี้ = ยังเหลือ 30 วันเต็ม", trialDaysLeft(d) === TRIAL_DAYS, String(trialDaysLeft(d)));

  // เรียกซ้ำต้องไม่รีเซ็ตนาฬิกา ไม่งั้นติ๊กเซตทุกวัน = ทดลองไม่มีวันหมด
  const first = d.settings.startedAt;
  d.settings.startedAt = daysAgo(20);
  startTrialIfNeeded(d);
  ok("ติ๊กเซตวันต่อๆ ไปไม่รีเซ็ตนาฬิกา", d.settings.startedAt !== first && trialDaysLeft(d) === 10, String(trialDaysLeft(d)));
}

console.log("\n═══ 2. นับวันถูกตลอดช่วง ═══");
{
  const at = (n) => { const d = createDefault(); d.settings.startedAt = daysAgo(n); return d; };
  ok("วันที่ 0 = เหลือ 30", trialDaysLeft(at(0)) === 30, String(trialDaysLeft(at(0))));
  ok("วันที่ 29 = เหลือ 1", trialDaysLeft(at(29)) === 1, String(trialDaysLeft(at(29))));
  ok("วันที่ 30 = เหลือ 0 (หมดแล้ว)", trialDaysLeft(at(30)) === 0, String(trialDaysLeft(at(30))));
  ok("วันที่ 300 = ยังเป็น 0 ไม่ติดลบ", trialDaysLeft(at(300)) === 0, String(trialDaysLeft(at(300))));
  ok("หมุนนาฬิกาย้อนหลังไม่ได้ทดลองเพิ่ม", trialDaysLeft(at(-90)) <= TRIAL_DAYS, String(trialDaysLeft(at(-90))));
}

console.log("\n═══ 3. ปุ่มซื้อต้องพาไปถึงจริง ═══");
{
  const line = buyChannel("artyz_z");
  ok("ไลน์ไอดีส่วนตัว -> ลิงก์เปิดแชต", line.kind === "line" && line.href === "https://line.me/ti/p/~artyz_z", line.href);

  const oa = buyChannel("@rankforge");
  ok("บัญชีทางการ (@) ใช้คนละ URL", oa.kind === "line" && oa.href === "https://line.me/R/ti/p/%40rankforge", oa.href);

  const url = buyChannel("https://facebook.com/rankforge");
  ok("ลิงก์ -> ใช้ตรงๆ", url.kind === "url" && url.href === "https://facebook.com/rankforge");
  ok("ลิงก์: ตัด https:// ออกตอนแสดงผล", url.display === "facebook.com/rankforge", url.display);

  const tel = buyChannel("0812345678");
  ok("เบอร์โทร -> tel:", tel.kind === "phone" && tel.href === "tel:0812345678", tel.href);

  ok("ยังไม่ตั้งค่า = ไม่มีปุ่ม (ห้ามโชว์ปุ่มที่กดแล้วไม่ไปไหน)", buyChannel("").kind === "none");
  ok("เว้นวรรคล้วนก็นับว่าไม่มี", buyChannel("   ").kind === "none");
  ok("hasBuyChannel ตรงกัน", hasBuyChannel("artyz_z") === true && hasBuyChannel("") === false);

  // ทุกช่องทางที่มีปุ่มต้องมี href และข้อความปุ่มเสมอ ไม่งั้นได้ปุ่มเปล่า
  for (const raw of ["artyz_z", "@rankforge", "https://x.com/a", "0812345678"]) {
    const c = buyChannel(raw);
    ok(`"${raw}" มี href + ข้อความปุ่มครบ`, Boolean(c.href && c.action && c.display));
  }
}

console.log("\n═══ 4. สิทธิ์ตลอดวงจร (build เป็นรุ่นขาย ไม่งั้นเทสต์ไม่มีความหมาย) ═══");
{
  ok("กำลังเทสต์รุ่นขายจริง", isPro === true, "ลืม --define VITE_EDITION=pro");

  const fresh = createDefault();
  ok("ยังไม่บันทึกอะไร = ใช้ได้ครบ (ยังไม่เริ่มนับด้วยซ้ำ)", isPremium(fresh) === true);

  const mid = createDefault();
  mid.settings.startedAt = daysAgo(10);
  ok("อยู่ระหว่างทดลอง = ใช้ได้ครบ", isPremium(mid) === true);
  ok("แต่ยังไม่นับว่าจ่ายเงิน", isPaid() === false);

  const expired = createDefault();
  expired.settings.startedAt = daysAgo(400);
  ok("หมดทดลองแล้วจริง", trialDaysLeft(expired) === 0);
  ok("หมดแล้ว = ล็อกฟีเจอร์สมองโค้ช", isPremium(expired) === false);

  // จุดที่พลาดแล้วเสียหายที่สุด: เผลอให้ trial ต่ออายุตัวเองเพราะติ๊กเซตใหม่
  startTrialIfNeeded(expired);
  ok("ติ๊กเซตหลังหมดอายุไม่ต่อทดลองให้ฟรี", isPremium(expired) === false);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
