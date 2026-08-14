// ตั้งค่าตารางแบบรอบ (loop) — หมุนเวียนเป็นรอบแทนที่จะผูกกับวันในสัปดาห์
//
// เหมาะกับคนทำงานเป็นกะหรือตารางเรียนไม่ซ้ำทุกสัปดาห์ ซึ่ง "วันจันทร์" ไม่ได้แปลว่า
// ต้องเล่นท่าเดิมทุกครั้ง · ตัวอย่างที่ใช้กันจริง: ดัน-ดึง-ขา-พัก วนไปเรื่อยๆ (รอบ 4 วัน)

import { useApp } from "../AppContext";
import { DAYS } from "../lib/store";
import { MAX_LOOP_LEN, anchorFor, cycleLen, isLoop, todaySlot } from "../lib/loop";
import { daysText, t } from "../lib/i18n";
import { Kicker } from "./ui";

// ฟังก์ชันเพราะต้องอ่านภาษา ณ ตอน render ไม่ใช่ตอนโหลดโมดูล
const presets = () => [
  { len: 3, label: daysText(3), desc: t("ดัน · ดึง · ขา", "Push · Pull · Legs") },
  { len: 4, label: daysText(4), desc: t("ดัน · ดึง · ขา · พัก", "Push · Pull · Legs · Rest") },
  { len: 5, label: daysText(5), desc: t("ดัน · ดึง · ขา · บน · ล่าง", "Push · Pull · Legs · Upper · Lower") },
  { len: 6, label: daysText(6), desc: t("ดัน · ดึง · ขา ×2", "Push · Pull · Legs ×2") },
];

export default function LoopCard() {
  const { data, update, toast } = useApp();
  const on = isLoop(data);
  const len = cycleLen(data);
  const cur = on ? DAYS.indexOf(todaySlot(data)) + 1 : 0;

  const setLen = (n: number) =>
    update((d) => {
      // รักษาตำแหน่งในรอบไว้เท่าที่ทำได้ ไม่งั้นเปลี่ยนความยาวรอบทีวันนี้เด้งไปช่องอื่น
      const keep = d.loop ? Math.min(DAYS.indexOf(todaySlot(d)) + 1, n) : 1;
      d.loop = { len: n, anchor: anchorFor(keep, n) };
    });

  const pill = (active: boolean) =>
    ({
      background: active ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,20,31,.6)",
      color: active ? "#050a18" : "var(--mut)",
      border: active ? "none" : "1px solid var(--edge)",
      clipPath: "var(--cut-path-sm)",
      padding: "7px 10px",
      fontSize: 12,
    }) as const;

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          on ? (
            <span className="font-mono2 text-[9px]" style={{ color: "var(--acc)" }}>
              {t(`วันนี้ = วันที่ ${cur}/${len}`, `Today = day ${cur}/${len}`)}
            </span>
          ) : undefined
        }
      >
        {t("ตารางแบบรอบ", "Rotating cycle")}
      </Kicker>
      <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
        {on
          ? t(
              "ตารางหมุนเป็นรอบ ไม่ผูกกับวันในสัปดาห์ — วันฝึกจะเลื่อนไปเองทุกวันตามรอบ",
              "Your program rotates on a cycle instead of weekdays — training days shift on their own",
            )
          : t(
              "ถ้าตารางคุณไม่ซ้ำทุกสัปดาห์ (ทำงานเป็นกะ / เรียนไม่ตรงกัน) เปิดโหมดนี้แล้วเล่นวนเป็นรอบแทน",
              "If your week isn't the same every week (shift work, uneven class schedule), turn this on and run a cycle instead",
            )}
      </p>

      {!on ? (
        <button className="btn-gh w-full !py-2.5 !text-[12px]" onClick={() => setLen(4)}>
          {t("เปิดโหมดรอบ (เริ่มที่ 4 วัน)", "Turn on cycle mode (starts at 4 days)")}
        </button>
      ) : (
        <>
          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            {t("ความยาวรอบ", "Cycle length")}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets().map((p) => (
              <button key={p.len} style={pill(len === p.len)} onClick={() => setLen(p.len)}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "var(--dim)" }}>
            {presets().find((p) => p.len === len)?.desc ?? t(`รอบ ${len} วัน`, `${daysText(len)} cycle`)}{" "}
            {t('— ตั้งชื่อแต่ละวันได้ที่หัวข้อ "ชื่อวันฝึก"', '— name each day under "Day names"')}
            {len < MAX_LOOP_LEN &&
              t(` · ช่องวันที่ ${len + 1}-7 จะถูกซ่อนไว้ ท่าที่อยู่ในนั้นไม่หาย`, ` · slots ${len + 1}-7 are hidden, but nothing in them is deleted`)}
          </p>

          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            {t("วันนี้อยู่วันที่เท่าไหร่ของรอบ", "Which day of the cycle is today")}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: len }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                style={pill(cur === n)}
                onClick={() => {
                  update((d) => {
                    d.loop = { len, anchor: anchorFor(n, len) };
                  });
                  toast(t(`ตั้งวันนี้เป็นวันที่ ${n} แล้ว`, `Today is now day ${n}`));
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-[10.5px] mb-3 leading-relaxed" style={{ color: "var(--dim)" }}>
            {t(
              'ระบบจำเป็น "วันที่จริง" ไม่ใช่ตัวนับ จึงเลื่อนรอบเองถูกต้องแม้ไม่ได้เปิดแอปหลายวัน',
              "It anchors to a real calendar date, not a counter — so the cycle stays correct even if you don't open the app for days",
            )}
          </p>

          <button
            className="btn-gh w-full !py-2.5 !text-[12px]"
            onClick={() => {
              update((d) => {
                d.loop = undefined;
              });
              toast(t("กลับไปใช้ตารางรายสัปดาห์แล้ว", "Back to a weekly schedule"));
            }}
          >
            {t("ปิดโหมดรอบ — กลับไปใช้วันในสัปดาห์", "Turn off cycle mode — go back to weekdays")}
          </button>
        </>
      )}
    </div>
  );
}
