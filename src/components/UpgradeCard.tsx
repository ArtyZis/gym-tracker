import { useState } from "react";
import { useApp } from "../AppContext";
import { BUY_CONTACT, PRICE_THB, clearKey, formatKey, saveKey, savedKey } from "../lib/license";
import { TRIAL_DAYS, isPaid, trialDaysLeft } from "../lib/premium";
import { Kicker } from "./ui";

// ฟีเจอร์ที่ต้องจ่าย — ข้อความเดียวกันใช้ทั้งตอนทดลอง (โชว์ว่ากำลังใช้อยู่)
// และตอนหมดอายุ (โชว์ว่าเสียอะไรไป) เพราะความเสียดายขายของได้ดีกว่าความอยากได้
const PERKS = [
  ["🎯", "บอกน้ำหนักครั้งหน้า", "ดูจากที่ทำได้ครั้งก่อน แล้วบอกว่าวันนี้ขึ้นน้ำหนักหรือดันเรปต่อ"],
  ["📊", "วิเคราะห์โปรแกรม", "ให้คะแนนความสมดุลกล้ามเนื้อ + บอกว่าต้องแก้ตรงไหน กดทำตามได้เลย"],
  ["🔥", "warm-up อัตโนมัติ", "คำนวณเซตอุ่นเครื่องให้ตามน้ำหนักจริงของวันนั้น"],
  ["📈", "พยากรณ์ PR", "อีก 2-4 สัปดาห์จะยกได้เท่าไหร่ จากแนวโน้มของคุณเอง"],
] as const;

export default function UpgradeCard() {
  const { data, toast } = useApp();
  const [input, setInput] = useState("");
  const [paid, setPaid] = useState(isPaid());
  const left = trialDaysLeft(data);

  function apply() {
    if (!input.trim()) {
      toast("ใส่รหัสก่อน");
      return;
    }
    if (!saveKey(input)) {
      toast("รหัสไม่ถูกต้อง — ตรวจตัวอักษรอีกครั้ง");
      return;
    }
    setPaid(true);
    setInput("");
    toast("ปลดล็อกถาวรแล้ว ขอบคุณครับ 🎉", true);
  }

  if (paid)
    return (
      <div className="glass p-4 mb-3">
        <Kicker right={<span className="font-mono2 text-[9.5px]" style={{ color: "var(--good)" }}>ปลดล็อกถาวร ✓</span>}>
          เวอร์ชันเต็ม
        </Kicker>
        <p className="text-[12.5px] -mt-1" style={{ color: "var(--mut)" }}>
          ใช้ได้ทุกฟีเจอร์ ไม่มีวันหมดอายุ ไม่มีรายเดือน
        </p>
        <div className="glass-inset font-mono2 text-[12px] px-3 py-2.5 mt-2.5" style={{ color: "var(--mut)" }}>
          {formatKey(savedKey() ?? "")}
        </div>
        <button
          className="btn-gh w-full !py-2 !text-[11.5px] mt-2"
          onClick={() => {
            if (!confirm("เอารหัสออกจากเครื่องนี้? (ประวัติการฝึกยังอยู่ครบ)")) return;
            clearKey();
            setPaid(false);
            toast("เอารหัสออกแล้ว");
          }}
        >
          เอารหัสออกจากเครื่องนี้
        </button>
      </div>
    );

  const trialing = left > 0;

  return (
    <div
      className="glass p-4 mb-3"
      style={{ borderColor: trialing ? "var(--acc-24)" : "rgba(255,193,94,.35)" }}
    >
      <Kicker
        right={
          <span className="font-mono2 text-[9.5px]" style={{ color: trialing ? "var(--acc)" : "var(--warn)" }}>
            {trialing ? `เหลือ ${left} วัน` : "หมดช่วงทดลอง"}
          </span>
        }
      >
        {trialing ? "กำลังทดลองใช้ฟรี" : "ปลดล็อกเวอร์ชันเต็ม"}
      </Kicker>

      <p className="text-[12.5px] -mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
        {trialing
          ? `ทดลอง ${TRIAL_DAYS} วัน ตอนนี้ใช้ได้ครบทุกอย่าง — หลังหมดช่วงทดลองยังบันทึกฝึกและดูประวัติได้ฟรีตลอด แต่ 4 อย่างนี้จะถูกล็อก`
          : "บันทึกฝึกและประวัติทั้งหมดยังใช้ฟรีเหมือนเดิม — จ่ายครั้งเดียวเพื่อเปิด 4 อย่างนี้กลับมา"}
      </p>

      <div className="flex flex-col gap-2 mt-3">
        {PERKS.map(([icon, title, desc]) => (
          <div key={title} className="glass-inset flex items-start gap-2.5 px-3 py-2.5">
            <span className="text-[14px] leading-none mt-[2px]">{icon}</span>
            <span className="min-w-0">
              <b className="block text-[12.5px] font-semibold" style={{ color: "var(--ink)" }}>
                {title}
              </b>
              <span className="block text-[11px] leading-snug mt-[2px]" style={{ color: "var(--mut)" }}>
                {desc}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="hairline mt-3.5 pt-3">
        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="font-disp font-bold text-[26px] leading-none" style={{ color: "var(--acc)" }}>
            {PRICE_THB}฿
          </span>
          <span className="text-[11.5px]" style={{ color: "var(--mut)" }}>
            จ่ายครั้งเดียว ใช้ถาวร · ไม่มีรายเดือน
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed mb-2.5" style={{ color: "var(--mut)" }}>
          {BUY_CONTACT ? `ทักมาที่ ${BUY_CONTACT} เพื่อรับรหัส` : "ทักมาขอรหัสได้จากช่องทางที่ประกาศไว้"}
        </p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="COACH-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            spellCheck={false}
            className="flex-1 min-w-0 px-3.5 py-2.5 text-[13px]"
          />
          <button className="btn-cy !py-2.5 !px-4 !text-[12.5px] shrink-0" onClick={apply}>
            ใช้รหัส
          </button>
        </div>
      </div>
    </div>
  );
}
