// ปริมาณงานจริงต่อสัปดาห์ — กราฟแท่งง่ายๆ + คำแนะนำจังหวะสัปดาห์เบา
//
// แบ่งฟรี/จ่ายตามหลักเดิมของโปรเจกต์: **ตัวเลขกับกราฟเป็นข้อมูลที่ผู้ใช้บันทึกเอง ห้ามล็อก**
// ส่วนคำแนะนำว่าควรทำอะไรต่อคือสมองโค้ช ล็อกได้ (ดู premium.ts)
//
// น้ำเสียงตั้งใจไม่สั่งให้ลด — คนที่ตั้งใจดันปริมาณสูงควรดันต่อได้
// สิ่งที่บอกคือ "ไต่เร็วไปไหม" กับ "ถึงเวลาแทรกสัปดาห์เบายัง" ซึ่งคือวิธีดันได้นานๆ

import { useApp } from "../AppContext";
import { currentWeekStart, loadStatus, weeklyLoad } from "../lib/load";
import { isPremium } from "../lib/premium";
import { daysText, setsText, t } from "../lib/i18n";
import { Kicker, PremiumLock } from "./ui";

const shortDate = (iso: string): string => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
};

export default function LoadCard() {
  const { data } = useApp();
  const weeks = weeklyLoad(data, 8);
  const status = loadStatus(data);
  const thisWeek = currentWeekStart();

  // ต้องมีอย่างน้อย 2 สัปดาห์ถึงจะมีอะไรให้เทียบ
  if (weeks.length < 2) return null;

  const peak = Math.max(...weeks.map((w) => w.sets));

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          <span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
            {t("8 สัปดาห์ล่าสุด", "last 8 weeks")}
          </span>
        }
      >
        {t("งานจริงต่อสัปดาห์", "Actual weekly load")}
      </Kicker>

      {/* สัปดาห์ปัจจุบันต้องดูออกว่า "ยังไม่จบ" — ไม่งั้นแท่งเด่นจะเป็นสัปดาห์ที่เพิ่งเริ่ม
          แต่คำแนะนำด้านล่างพูดถึงสัปดาห์ก่อนหน้า (ตัวที่จบแล้ว) แล้วผู้ใช้งง ว่าตกลงพูดถึงอันไหน */}
      <div className="flex items-end gap-1.5 mb-1.5" style={{ height: 86 }}>
        {weeks.map((w) => {
          const h = peak > 0 ? Math.max(4, Math.round((w.sets / peak) * 78)) : 4;
          const running = w.start === thisWeek;
          const newest = w === weeks[weeks.length - 1] && !running;
          const solid = newest || (running && weeks.length === 1);
          return (
            <div key={w.start} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${w.start} · ${setsText(w.sets)} · ${w.volume.toLocaleString()} kg`}>
              <span className="font-mono2 text-[9px] leading-none" style={{ color: solid ? "var(--acc)" : "var(--dim)" }}>
                {w.sets}
              </span>
              <div
                className="w-full"
                style={{
                  height: h,
                  borderRadius: 2,
                  background: solid ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : running ? "var(--acc-08)" : "rgba(120,180,255,.18)",
                  border: solid ? "none" : running ? "1px dashed color-mix(in srgb, var(--acc) 50%, transparent)" : "1px solid var(--edge)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mb-3">
        {weeks.map((w) => (
          <span key={w.start} className="flex-1 text-center font-mono2 text-[8.5px]" style={{ color: "var(--dim)" }}>
            {shortDate(w.start)}
          </span>
        ))}
      </div>

      {/* ตัวเลขดิบ — ฟรีเสมอ เป็นข้อมูลที่เขาบันทึกเอง (กฎ: ห้ามล็อกประวัติของผู้ใช้) */}
      {(() => {
        const last = weeks[weeks.length - 1];
        const running = last.start === thisWeek;
        return (
          <div className="glass-inset px-3 py-2.5 flex justify-between text-[11.5px]" style={{ color: "var(--mut)" }}>
            <span>
              {running ? t("สัปดาห์นี้ (ยังไม่จบ)", "This week (in progress)") : t("สัปดาห์ล่าสุด", "Latest week")} · {daysText(last.days)}
            </span>
            <span className="font-mono2" style={{ color: "var(--acc)" }}>
              {setsText(last.sets)} · {last.volume.toLocaleString()} kg
            </span>
          </div>
        );
      })()}

      {status.kind !== "none" && (isPremium(data) ? <Advice status={status} /> : <LockedAdvice />)}
    </div>
  );
}

function LockedAdvice() {
  return (
    <div className="mt-2.5">
      <PremiumLock label={t("ปลดล็อกเพื่อดูว่าควรดันต่อหรือแทรกสัปดาห์เบา", "Unlock to see whether to keep pushing or take a lighter week")}>
        <div className="glass-inset px-3 py-2.5">
          <div className="h-12" />
        </div>
      </PremiumLock>
    </div>
  );
}

function Advice({ status }: { status: ReturnType<typeof loadStatus> }) {
  const box = (color: string, icon: string, title: string, body: string) => (
    <div
      className="glass-inset px-3 py-2.5 mt-2.5 flex items-start gap-2.5"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 7%, transparent)` }}
    >
      <span className="text-[13px] leading-none mt-px">{icon}</span>
      <span className="min-w-0">
        <b className="block text-[12.5px]" style={{ color: "var(--ink)" }}>
          {title}
        </b>
        <span className="block text-[11.5px] leading-relaxed mt-0.5" style={{ color: "var(--mut)" }}>
          {body}
        </span>
      </span>
    </div>
  );

  switch (status.kind) {
    case "spike":
      return box(
        "var(--warn)",
        "📈",
        t(`ไต่ขึ้น ${status.pct}% ในสัปดาห์เดียว`, `Up ${status.pct}% in one week`),
        t(
          `จาก ${status.prev} เป็น ${status.sets} เซต — ไม่ได้แปลว่าห้ามดัน แต่ร่างกายมักตามทันที่ราว 10-20% ต่อสัปดาห์ ถ้าสัปดาห์นี้รู้สึกไม่อยากไปยิม นั่นคือสาเหตุ ไม่ใช่ใจไม่สู้`,
          `From ${status.prev} to ${status.sets} sets — not a reason to stop, but recovery usually keeps up around 10-20% a week. If you're dreading the gym right now, that's why — it isn't a motivation problem.`,
        ),
      );
    case "deloadDue":
      return box(
        "var(--warn)",
        "🔋",
        t(`ดันติดกัน ${status.weeks} สัปดาห์แล้ว`, `${status.weeks} weeks of building`),
        t(
          `ลองแทรกสัปดาห์เบาสัก 1 สัปดาห์ ราว ${status.suggest} เซต (น้ำหนักเท่าเดิม ตัดจำนวนเซตลง) แล้วกลับมาที่ ${status.sets} ต่อ — วิธีนี้ทำให้ดันปริมาณสูงได้ยาวเป็นปี ไม่ใช่พังใน 6 สัปดาห์`,
          `Slot in one lighter week at about ${status.suggest} sets — same weights, fewer sets — then go back to ${status.sets}. This is how high volume stays sustainable for years instead of collapsing in six weeks.`,
        ),
      );
    case "building":
      return box(
        "var(--acc)",
        "✅",
        t(`ไต่ขึ้น ${status.pct}% — อยู่ในจังหวะที่ดี`, `Up ${status.pct}% — a good rate`),
        t(`สัปดาห์ล่าสุด ${status.sets} เซต เพิ่มจาก ${status.prev} ในอัตราที่ร่างกายตามทัน ดันต่อได้เลย`, `${status.sets} sets last week, up from ${status.prev} — a rate recovery can keep up with. Keep going.`),
      );
    case "steady":
      return box(
        "var(--acc)",
        "⚖️",
        t("ปริมาณทรงตัว", "Volume is holding steady"),
        t(`อยู่ที่ ${status.sets} เซต/สัปดาห์ — ถ้าน้ำหนักที่ยกยังขึ้นอยู่ ไม่ต้องเพิ่มเซตก็พัฒนาได้`, `Holding at ${status.sets} sets a week — if the weights are still going up, you don't need more sets to progress.`),
      );
    default:
      return null;
  }
}
