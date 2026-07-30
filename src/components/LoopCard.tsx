// ตั้งค่าตารางแบบรอบ (loop) — หมุนเวียนเป็นรอบแทนที่จะผูกกับวันในสัปดาห์
//
// เหมาะกับคนทำงานเป็นกะหรือตารางเรียนไม่ซ้ำทุกสัปดาห์ ซึ่ง "วันจันทร์" ไม่ได้แปลว่า
// ต้องเล่นท่าเดิมทุกครั้ง · ตัวอย่างที่ใช้กันจริง: ดัน-ดึง-ขา-พัก วนไปเรื่อยๆ (รอบ 4 วัน)

import { useApp } from "../AppContext";
import { DAYS } from "../lib/store";
import { MAX_LOOP_LEN, anchorFor, cycleLen, isLoop, todaySlot } from "../lib/loop";
import { Kicker } from "./ui";

const PRESETS = [
  { len: 3, label: "3 วัน", desc: "ดัน · ดึง · ขา" },
  { len: 4, label: "4 วัน", desc: "ดัน · ดึง · ขา · พัก" },
  { len: 5, label: "5 วัน", desc: "ดัน · ดึง · ขา · บน · ล่าง" },
  { len: 6, label: "6 วัน", desc: "ดัน · ดึง · ขา ×2" },
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
              วันนี้ = วันที่ {cur}/{len}
            </span>
          ) : undefined
        }
      >
        ตารางแบบรอบ
      </Kicker>
      <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
        {on
          ? "ตารางหมุนเป็นรอบ ไม่ผูกกับวันในสัปดาห์ — วันฝึกจะเลื่อนไปเองทุกวันตามรอบ"
          : "ถ้าตารางคุณไม่ซ้ำทุกสัปดาห์ (ทำงานเป็นกะ / เรียนไม่ตรงกัน) เปิดโหมดนี้แล้วเล่นวนเป็นรอบแทน"}
      </p>

      {!on ? (
        <button className="btn-gh w-full !py-2.5 !text-[12px]" onClick={() => setLen(4)}>
          เปิดโหมดรอบ (เริ่มที่ 4 วัน)
        </button>
      ) : (
        <>
          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            ความยาวรอบ
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map((p) => (
              <button key={p.len} style={pill(len === p.len)} onClick={() => setLen(p.len)}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "var(--dim)" }}>
            {PRESETS.find((p) => p.len === len)?.desc ?? `รอบ ${len} วัน`} — ตั้งชื่อแต่ละวันได้ที่หัวข้อ "ชื่อวันฝึก"
            {len < MAX_LOOP_LEN && ` · ช่องวันที่ ${len + 1}-7 จะถูกซ่อนไว้ ท่าที่อยู่ในนั้นไม่หาย`}
          </p>

          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            วันนี้อยู่วันที่เท่าไหร่ของรอบ
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
                  toast(`ตั้งวันนี้เป็นวันที่ ${n} แล้ว`);
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-[10.5px] mb-3 leading-relaxed" style={{ color: "var(--dim)" }}>
            ระบบจำเป็น "วันที่จริง" ไม่ใช่ตัวนับ จึงเลื่อนรอบเองถูกต้องแม้ไม่ได้เปิดแอปหลายวัน
          </p>

          <button
            className="btn-gh w-full !py-2.5 !text-[12px]"
            onClick={() => {
              update((d) => {
                d.loop = undefined;
              });
              toast("กลับไปใช้ตารางรายสัปดาห์แล้ว");
            }}
          >
            ปิดโหมดรอบ — กลับไปใช้วันในสัปดาห์
          </button>
        </>
      )}
    </div>
  );
}
