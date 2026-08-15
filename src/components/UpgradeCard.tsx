import { useState } from "react";
import { useApp } from "../AppContext";
import { PLANS, clearKey, formatKey, licenseStatus, saveKey, savedKey } from "../lib/license";
import { buyChannel } from "../lib/contact";
import { TRIAL_DAYS, isPaid, trialDaysLeft } from "../lib/premium";
import { daysText, t } from "../lib/i18n";
import { Kicker } from "./ui";

// ฟีเจอร์ที่ต้องจ่าย — ข้อความเดียวกันใช้ทั้งตอนทดลอง (โชว์ว่ากำลังใช้อยู่)
// และตอนหมดอายุ (โชว์ว่าเสียอะไรไป) เพราะความเสียดายขายของได้ดีกว่าความอยากได้
//
// เป็นฟังก์ชันเพราะต้องอ่านภาษา ณ ตอน render ไม่ใช่ตอนโหลดโมดูล
const perks = () =>
  [
    [
      "🎯",
      t("บอกน้ำหนักครั้งหน้า", "Your next weight"),
      t(
        "ดูจากที่ทำได้ครั้งก่อน แล้วบอกว่าวันนี้ขึ้นน้ำหนักหรือดันเรปต่อ",
        "Reads what you did last time and tells you whether to add weight or chase reps",
      ),
    ],
    [
      "📊",
      t("วิเคราะห์โปรแกรม", "Program analysis"),
      t("ให้คะแนนความสมดุลกล้ามเนื้อ + บอกว่าต้องแก้ตรงไหน กดทำตามได้เลย", "Scores your muscle balance and tells you what to fix — one tap to apply"),
    ],
    ["🔥", t("warm-up อัตโนมัติ", "Automatic warm-ups"), t("คำนวณเซตอุ่นเครื่องให้ตามน้ำหนักจริงของวันนั้น", "Builds warm-up sets from the real weight you're lifting that day")],
    ["📈", t("พยากรณ์ PR", "PR forecast"), t("อีก 2-4 สัปดาห์จะยกได้เท่าไหร่ จากแนวโน้มของคุณเอง", "What you'll be lifting in 2-4 weeks, from your own trend")],
  ] as const;

export default function UpgradeCard() {
  const { data, toast } = useApp();
  const [input, setInput] = useState("");
  const [paid, setPaid] = useState(isPaid());
  const [lic, setLic] = useState(licenseStatus());
  const left = trialDaysLeft(data);

  function apply() {
    if (!input.trim()) {
      toast(t("ใส่รหัสก่อน", "Enter a key first"));
      return;
    }
    if (!saveKey(input)) {
      toast(t("รหัสไม่ถูกต้อง — ตรวจตัวอักษรอีกครั้ง", "That key isn't valid — check the characters again"));
      return;
    }
    const s = licenseStatus();
    // รหัสถูกยกเลิก — ต้องบอกให้ชัดว่าไม่ใช่พิมพ์ผิด และให้ทางไปต่อ
    // (คนที่โดนอาจเป็นลูกค้าตัวจริงที่รหัสถูกเพื่อนเอาไปปล่อย เขาไม่รู้เรื่องด้วย)
    if (s.kind === "revoked") {
      toast(t("รหัสนี้ถูกยกเลิกแล้ว — ทักมาขอรหัสใหม่ได้", "This key was revoked — message us for a new one"), false);
      setLic(s);
      return;
    }
    // รหัสที่ถูกต้องแต่หมดอายุแล้ว ต้องไม่ปลดล็อก และต้องบอกเหตุผลตรงๆ
    // ไม่งั้นลูกค้าเห็น "รหัสไม่ถูกต้อง" แล้วคิดว่าพิมพ์ผิด วนแก้อยู่นั่น
    if (s.kind === "expired") {
      toast(t(`รหัสนี้หมดอายุไปแล้วเมื่อสิ้นเดือน ${s.until}`, `This key expired at the end of ${s.until}`), false);
      setLic(s);
      return;
    }
    setLic(s);
    setPaid(true);
    setInput("");
    toast(
      s.kind === "active"
        ? t(`ปลดล็อกแล้ว ใช้ได้ถึงสิ้นเดือน ${s.until} 🎉`, `Unlocked — good through the end of ${s.until} 🎉`)
        : t("ปลดล็อกถาวรแล้ว ขอบคุณครับ 🎉", "Unlocked for good. Thank you 🎉"),
      true,
    );
  }

  if (paid)
    return (
      <div className="glass p-4 mb-3">
        <Kicker
          right={
            <span className="font-mono2 text-[9.5px]" style={{ color: "var(--good)" }}>
              {lic.kind === "active" ? t(`เหลือ ${lic.daysLeft} วัน ✓`, `${daysText(lic.daysLeft)} left ✓`) : t("ปลดล็อกถาวร ✓", "Lifetime ✓")}
            </span>
          }
        >
          {t("เวอร์ชันเต็ม", "Full version")}
        </Kicker>
        <p className="text-[12.5px] -mt-1" style={{ color: "var(--mut)" }}>
          {lic.kind === "active"
            ? t(
                `ใช้ได้ทุกฟีเจอร์ถึงสิ้นเดือน ${lic.until} — ต่ออายุด้วยรหัสใบใหม่ได้ตลอด`,
                `Everything unlocked through the end of ${lic.until} — renew any time with a new key`,
              )
            : t("ใช้ได้ทุกฟีเจอร์ ไม่มีวันหมดอายุ", "Everything unlocked, no expiry")}
        </p>
        <div className="glass-inset font-mono2 text-[12px] px-3 py-2.5 mt-2.5" style={{ color: "var(--mut)" }}>
          {formatKey(savedKey() ?? "")}
        </div>
        <button
          className="btn-gh w-full !py-2 !text-[11.5px] mt-2"
          onClick={() => {
            if (!confirm(t("เอารหัสออกจากเครื่องนี้? (ประวัติการฝึกยังอยู่ครบ)", "Remove the key from this device? Your training history stays."))) return;
            clearKey();
            setPaid(false);
            setLic({ kind: "none" });
            toast(t("เอารหัสออกแล้ว", "Key removed"));
          }}
        >
          {t("เอารหัสออกจากเครื่องนี้", "Remove key from this device")}
        </button>
      </div>
    );

  const trialing = left > 0;
  const channel = buyChannel();

  return (
    <div
      className="glass p-4 mb-3"
      style={{ borderColor: trialing ? "var(--acc-24)" : "rgba(255,193,94,.35)" }}
    >
      <Kicker
        right={
          <span className="font-mono2 text-[9.5px]" style={{ color: trialing ? "var(--acc)" : "var(--warn)" }}>
            {trialing ? t(`เหลือ ${left} วัน`, `${daysText(left)} left`) : t("หมดช่วงทดลอง", "Trial over")}
          </span>
        }
      >
        {trialing ? t("กำลังทดลองใช้ฟรี", "Free trial") : t("ปลดล็อกเวอร์ชันเต็ม", "Unlock the full version")}
      </Kicker>

      <p className="text-[12.5px] -mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
        {trialing
          ? t(
              `ทดลอง ${TRIAL_DAYS} วัน ตอนนี้ใช้ได้ครบทุกอย่าง — หลังหมดช่วงทดลองยังบันทึกฝึกและดูประวัติได้ฟรีตลอด แต่ 4 อย่างนี้จะถูกล็อก`,
              `A ${TRIAL_DAYS}-day trial with everything open. When it ends, logging and history stay free forever — these four get locked.`,
            )
          : t(
              "บันทึกฝึก ประวัติ สตรีค แรงค์ และการ์ดแชร์ ยังใช้ฟรีเหมือนเดิม — สมัครเพื่อเปิด 4 อย่างนี้กลับมา",
              "Logging, history, streaks, rank, and share cards stay free — buy a key to get these four back.",
            )}
      </p>

      <div className="flex flex-col gap-2 mt-3">
        {perks().map(([icon, title, desc]) => (
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
        {/* แพ็กเกจ — เรียงให้ตัวคุ้มกว่าอยู่ขวาและเน้นสี คนเทียบราคาต่อเดือนเองไม่เป็น
            ต้องคำนวณให้เห็นเลยว่าอันไหนคุ้มกว่า ไม่งั้นทุกคนเลือกอันถูกที่สุดโดยอัตโนมัติ */}
        <div className="flex gap-2 mb-2.5">
          {PLANS.map((p, i) => {
            const best = i === PLANS.length - 1;
            return (
              <div
                key={p.months}
                className="flex-1 px-3 py-2.5 text-center"
                style={{
                  background: best ? "var(--acc-08)" : "rgba(10,20,31,.5)",
                  border: `1px solid ${best ? "color-mix(in srgb, var(--acc) 42%, transparent)" : "var(--edge)"}`,
                  clipPath: "var(--cut-path-sm)",
                }}
              >
                <div className="font-mono2 text-[9px] uppercase tracking-[.16em]" style={{ color: "var(--mut)" }}>
                  {p.label()}
                </div>
                <div className="font-disp font-bold text-[24px] leading-none mt-1" style={{ color: best ? "var(--acc)" : "var(--ink)" }}>
                  {p.price}฿
                </div>
                {p.note && (
                  <div className="text-[10px] mt-1 leading-snug" style={{ color: best ? "var(--acc)" : "var(--dim)" }}>
                    {p.note()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* ปุ่มที่กดแล้วเปิดแชตให้เลย — จำไอดี เปิดแอป ค้นหา พิมพ์เอง คือสี่ขั้นที่คนหลุด
            ทั้งที่ตัดสินใจซื้อแล้ว · ไม่มีช่องทางตั้งไว้ = ไม่โชว์ปุ่มหลอก */}
        {channel.kind !== "none" ? (
          <a className="btn-cy w-full !py-2.5 !text-[12.5px] mb-2 text-center block" href={channel.href} target="_blank" rel="noopener noreferrer">
            {channel.action} →
          </a>
        ) : null}

        <p className="text-[11.5px] leading-relaxed mb-2.5" style={{ color: "var(--mut)" }}>
          {channel.kind !== "none"
            ? t(`หรือติดต่อที่ ${channel.display} เอง`, `Or reach us at ${channel.display}`)
            : t("ทักมาขอรหัสได้จากช่องทางที่ประกาศไว้", "Message us on the channel we've listed to get a key")}{" "}
          {t("— หมดอายุแล้วต่อได้ด้วยรหัสใบใหม่ ประวัติการฝึกไม่หายไปไหน", "— when it expires, a new key renews it. Your training history is never touched.")}
        </p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="RF-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            spellCheck={false}
            className="flex-1 min-w-0 px-3.5 py-2.5 text-[13px]"
          />
          <button className="btn-cy !py-2.5 !px-4 !text-[12.5px] shrink-0" onClick={apply}>
            {t("ใช้รหัส", "Apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
