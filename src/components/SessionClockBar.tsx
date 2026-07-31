// แถบนาฬิกาเซสชัน — บอกว่าเล่นมานานแค่ไหน เหลือเวลาเท่าไหร่ และเล่นให้จบทันไหม
//
// อัปเดตด้วย setInterval ทุก 30 วิ "เพื่อ re-render เท่านั้น" — ตัวเลขคำนวณจาก
// Date.now() เทียบ timestamp ของเซตแรกเสมอ ไม่ได้นับสะสม
// ดังนั้นถ้า iOS suspend JS ตอนสลับแอป กลับมาแล้วตัวเลขยังถูกต้องทันที

import { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import type { DayKey } from "../lib/store";
import { sessionClock, suggestCuts } from "../lib/session";

export default function SessionClockBar({ day, isToday }: { day: DayKey; isToday: boolean }) {
  const { data } = useApp();
  const [, tick] = useState(0);
  const [showCuts, setShowCuts] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // เปิดเฉพาะที่ผู้ใช้เปิดเองในตั้งค่าการฝึก (ช่องเวลารายวันถูกถอดออกแล้ว
  // จึงใช้เพดานเวลาต่อครั้งค่าเดียวเป็นฐานคำนวณ)
  const enabled = data.settings.sessionClock === true;
  if (!enabled || !isToday) return null;

  const c = sessionClock(data, day);
  if (!c || c.startedAt == null) return null; // ยังไม่เริ่มเล่น ไม่ต้องรบกวน

  const done = c.setsLeft === 0;
  const warn = !done && (c.tight || c.remainMin < 20);
  const color = done ? "var(--acc)" : warn ? "var(--warn)" : "var(--ink)";
  const pct = Math.max(0, Math.min(100, (c.elapsedMin / Math.max(1, c.capMin)) * 100));

  const cuts = c.tight ? suggestCuts(data, day, c.neededMin - c.remainMin) : [];

  return (
    <div className="glass p-3 mb-3" style={{ "--card-pad": "12px" } as React.CSSProperties}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="font-mono2 text-[9px] uppercase tracking-[.16em]" style={{ color: "var(--mut)" }}>
          เวลาในเซสชัน
        </span>
        <span className="font-mono2 text-[11px]" style={{ color }}>
          {c.elapsedMin} / {c.capMin} นาที
          {c.remainMin >= 0 ? ` · เหลือ ${c.remainMin}` : ` · เลยมา ${-c.remainMin}`} น.
        </span>
      </div>

      {/* แถบความคืบหน้าของเวลา ไม่ใช่ของจำนวนเซต */}
      <div style={{ height: 5, borderRadius: 99, background: "rgba(10,20,31,.7)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 99,
            background: warn ? "var(--warn)" : "linear-gradient(90deg, var(--acc-2), var(--acc))",
            transition: "width .4s",
          }}
        />
      </div>

      <div className="mt-2 text-[11.5px] leading-relaxed" style={{ color: done ? "var(--acc)" : "var(--mut)" }}>
        {done
          ? "เล่นครบทุกเซตแล้ว"
          : `เหลืออีก ${c.exercisesLeft} ท่า ${c.setsLeft} เซต ประมาณ ${c.neededMin} นาที`}
      </div>

      {c.tight && cuts.length > 0 && (
        <div className="mt-2">
          <button
            className="font-mono2 text-[10px] px-2.5 py-1.5 rounded-lg"
            style={{ color: "var(--warn)", background: "rgba(10,20,31,.6)", border: "1px solid var(--edge)" }}
            onClick={() => setShowCuts((v) => !v)}
          >
            {showCuts ? "ปิด" : `เวลาไม่พอ ~${c.neededMin - c.remainMin} น. — ตัดท่าไหนดี`}
          </button>

          {showCuts && (
            <div className="glass-inset mt-2 p-3">
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--mut)" }}>
                เรียงจากท่าที่ตัดแล้วเสียหายน้อยที่สุด (ท่าเสริมก่อนท่าหลัก) — ท่าแรกของวันไม่อยู่ในรายการ
              </p>
              {cuts.map((c2) => (
                <div key={c2.ex.id} className="flex items-center gap-2 py-1.5 text-[12px]">
                  <span
                    className="font-mono2 text-[9px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: "var(--dim)", background: "rgba(10,20,31,.6)", border: "1px solid var(--edge)" }}
                  >
                    {c2.tier}
                  </span>
                  <span className="flex-1 min-w-0 truncate" style={{ color: "var(--ink)" }}>
                    {c2.ex.name}
                  </span>
                  <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--mut)" }}>
                    เหลือ {c2.setsLeft} เซต · ประหยัด {c2.savesMin} น.
                  </span>
                </div>
              ))}
              <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>
                ข้ามได้เลยโดยไม่ต้องลบท่า — สัปดาห์หน้าค่อยเล่นตามปกติ
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
