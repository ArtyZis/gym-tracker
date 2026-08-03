// ย้อนดูแต่ละวันที่ผ่านมา — ทำอะไรไป ยกไปเท่าไหร่ และโน้ตที่เขียนไว้
//
// รวบรวมจาก history ซึ่งผูกกับ exercise.id ไม่ใช่วัน จึงต้องไล่ทุกท่าแล้วจัดกลุ่มตามวันที่
// ท่าที่ถูกลบไปแล้วยังโผล่ในประวัติได้ผ่าน historyArchive — ตั้งใจ เพราะเคยเล่นจริง

import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Data } from "../lib/store";
import { Kicker } from "./ui";

interface DaySummary {
  date: string;
  sets: number;
  volume: number;
  names: string[];
  note?: string;
}

function collect(data: Data): DaySummary[] {
  const byDate = new Map<string, DaySummary>();
  const nameOf = new Map(data.exercises.map((e) => [e.id, e.name]));

  for (const [exId, sessions] of Object.entries(data.history)) {
    for (const s of sessions) {
      const done = s.sets.filter(Boolean);
      if (!done.length) continue;
      let cur = byDate.get(s.date);
      if (!cur) {
        cur = { date: s.date, sets: 0, volume: 0, names: [] };
        byDate.set(s.date, cur);
      }
      cur.sets += done.length;
      for (const st of done) if (st?.weight && st.reps) cur.volume += st.weight * st.reps;
      const nm = nameOf.get(exId);
      if (nm && !cur.names.includes(nm)) cur.names.push(nm);
    }
  }

  // วันที่มีแต่โน้ต (ไม่ได้ฝึก) ก็ต้องเห็น — บางวันโน้ตสำคัญกว่าตัวเลข เช่น "เจ็บไหล่ พัก"
  for (const [date, note] of Object.entries(data.dayNotes ?? {})) {
    let cur = byDate.get(date);
    if (!cur) {
      cur = { date, sets: 0, volume: 0, names: [] };
      byDate.set(date, cur);
    }
    cur.note = note;
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

const fmtDate = (iso: string) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
};

const PAGE = 10;

export default function SessionHistoryCard() {
  const { data } = useApp();
  const days = useMemo(() => collect(data), [data]);
  const [limit, setLimit] = useState(PAGE);

  if (!days.length) return null;

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{days.length} วัน</span>}>
        ย้อนดูแต่ละวัน
      </Kicker>
      {days.slice(0, limit).map((d) => (
        <div key={d.date} className="mb-2.5 last:mb-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono2 text-[11px]" style={{ color: "var(--acc)" }}>
              {fmtDate(d.date)}
            </span>
            <span className="font-mono2 text-[10px]" style={{ color: "var(--mut)" }}>
              {d.sets > 0 ? `${d.sets} เซต${d.volume > 0 ? ` · ${Math.round(d.volume).toLocaleString()} kg` : ""}` : "ไม่ได้ฝึก"}
            </span>
          </div>
          {d.names.length > 0 && (
            <div className="text-[11px] mt-[3px] leading-relaxed" style={{ color: "var(--mut)" }}>
              {d.names.slice(0, 5).join(" · ")}
              {d.names.length > 5 && ` +${d.names.length - 5}`}
            </div>
          )}
          {d.note && (
            <div
              className="glass-inset mt-1.5 px-2.5 py-2 text-[11.5px] leading-relaxed"
              style={{ color: "var(--ink)", whiteSpace: "pre-wrap" }}
            >
              {d.note}
            </div>
          )}
        </div>
      ))}
      {days.length > limit && (
        <button className="btn-gh w-full !py-2 !text-[11.5px] mt-2" onClick={() => setLimit((n) => n + PAGE)}>
          ดูย้อนหลังอีก {Math.min(PAGE, days.length - limit)} วัน
        </button>
      )}
    </div>
  );
}
