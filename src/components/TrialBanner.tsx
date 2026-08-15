// เตือนช่วงทดลองใกล้หมด / หมดแล้ว — ขึ้นในหน้าวันนี้ ที่ที่คนอยู่จริง
//
// เดิมตัวเลข "เหลือกี่วัน" อยู่ใน UpgradeCard ในแท็บจัดการที่เดียว ซึ่งคนไม่มีเหตุให้เข้า
// ผลคือวันที่ 31 ฟีเจอร์หายไปเฉยๆ โดยไม่มีใครเตือนล่วงหน้าสักครั้ง
// คนที่โดนแบบนั้นไม่ได้รู้สึกว่า "หมดทดลองแล้ว" แต่รู้สึกว่า "แอปพัง" แล้วก็ไม่ซื้อ
//
// ขึ้นเฉพาะ 7 วันสุดท้าย ไม่ใช่ทั้ง 30 วัน — เตือนตั้งแต่วันแรกคือโฆษณา ไม่ใช่การเตือน
// และปิดได้ กดปิดแล้วเงียบทั้งวัน (ไม่ใช่ตลอดไป เพราะวันที่เหลือลดลงเรื่อยๆ
// ข้อความวันที่ 1 กับวันที่ 6 คนละน้ำหนักกัน)

import { useState } from "react";
import { useApp } from "../AppContext";
import { isPaid, trialDaysLeft } from "../lib/premium";
import { isPro } from "../lib/edition";
import { daysText, t } from "../lib/i18n";
import { todayStr } from "../lib/store";

const DISMISS_KEY = "gymtracker_trial_banner_dismissed_v1";
const WARN_WITHIN = 7;

const dismissedToday = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === todayStr();
  } catch {
    return false;
  }
};

export default function TrialBanner() {
  const { data, goTab } = useApp();
  const [hidden, setHidden] = useState(dismissedToday);

  // รุ่นส่วนตัวไม่มีช่วงทดลอง · จ่ายแล้วไม่ต้องเตือน
  if (!isPro || isPaid()) return null;

  const left = trialDaysLeft(data);
  // ยังไม่เคยบันทึกเซตแรก = ยังไม่เริ่มนับ ไม่มีอะไรให้เตือน
  const started = Boolean(data.settings.startedAt);
  if (!started) return null;
  if (left > WARN_WITHIN) return null;
  if (hidden && left > 0) return null; // หมดแล้วต้องขึ้นเสมอ ปิดไม่ได้

  const over = left <= 0;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, todayStr());
    } catch {
      /* เขียนไม่ได้ก็แค่ขึ้นอีกรอบหน้า */
    }
    setHidden(true);
  };

  return (
    <div
      className="glass px-3.5 py-3 mb-3 flex items-center gap-3"
      style={{
        borderColor: "color-mix(in srgb, var(--warn) 40%, transparent)",
        background: "linear-gradient(160deg, color-mix(in srgb, var(--warn) 8%, transparent), rgba(6,12,22,.6))",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="font-disp font-bold text-[13px] leading-snug" style={{ color: "var(--ink)" }}>
          {over
            ? t("หมดช่วงทดลองแล้ว", "Your trial has ended")
            : left === 1
              ? t("ทดลองฟรีเหลือวันสุดท้าย", "Last day of your free trial")
              : t(`ทดลองฟรีเหลือ ${left} วัน`, `${daysText(left)} left in your free trial`)}
        </div>
        <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: "var(--mut)" }}>
          {/* บอกให้ชัดว่าอะไรไม่หาย ก่อนบอกว่าอะไรหาย — คนกลัวข้อมูลหายมากกว่ากลัวฟีเจอร์หาย */}
          {over
            ? t(
                "บันทึกฝึก ประวัติ สตรีค การ์ดแชร์ ยังใช้ฟรีตลอด — ที่ล็อกคือตัวบอกน้ำหนักครั้งหน้า วิเคราะห์ตาราง warm-up และพยากรณ์ PR",
                "Logging, history, streaks, and share cards stay free forever — what's locked is next-weight coaching, program analysis, warm-ups, and PR forecasts.",
              )
            : t(
                "หลังจากนั้นบันทึกฝึกและประวัติยังฟรีเหมือนเดิม ที่ล็อกคือตัวบอกน้ำหนักครั้งหน้าและวิเคราะห์ตาราง",
                "After that, logging and history stay free — next-weight coaching and program analysis get locked.",
              )}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button className="btn-cy !py-2 !px-3 !text-[11.5px] whitespace-nowrap" onClick={() => goTab("manage")}>
          {over ? t("ปลดล็อก", "Unlock") : t("ดูราคา", "See pricing")}
        </button>
        {!over && (
          <button className="btn-gh !py-1.5 !px-3 !text-[10.5px] whitespace-nowrap" onClick={dismiss}>
            {t("ปิด", "Dismiss")}
          </button>
        )}
      </div>
    </div>
  );
}
