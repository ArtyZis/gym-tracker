// ย้อนดูโน้ตของแต่ละวัน — เลือกวันจากแถบด้านบน แล้วดูทีละวัน
//
// ทำไมไม่ไล่แสดงทุกวันต่อกันเป็นรายการยาว: พอเขียนโน้ตทุกวันสัก 2-3 เดือน
// การ์ดจะยาวเป็นร้อยหน้าจอ เลื่อนหาวันที่ต้องการไม่เจอ และหน้าก้าวหน้าจะใช้ไม่ได้เลย
// เลือกวันแล้วดูทีละวันจึงคงขนาดคงที่ไม่ว่าจะเขียนไปกี่วัน
//
// แสดงเฉพาะวันที่ "มีโน้ต" ตามที่ต้องการ — วันที่ฝึกแต่ไม่ได้เขียนอะไรดูได้จากกราฟอยู่แล้ว

import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Data } from "../lib/store";
import { Kicker } from "./ui";

interface NotedDay {
  date: string;
  note: string;
  sets: number;
  volume: number;
  names: string[];
}

function collect(data: Data): NotedDay[] {
  const notes = data.dayNotes ?? {};
  const dates = Object.keys(notes);
  if (!dates.length) return [];

  const nameOf = new Map(data.exercises.map((e) => [e.id, e.name]));
  const stat = new Map<string, { sets: number; volume: number; names: string[] }>();
  for (const d of dates) stat.set(d, { sets: 0, volume: 0, names: [] });

  // ไล่ประวัติครั้งเดียวแล้วหยิบเฉพาะวันที่มีโน้ต — ไม่ต้องสร้าง map ของทุกวันในประวัติ
  for (const [exId, sessions] of Object.entries(data.history)) {
    for (const s of sessions) {
      const cur = stat.get(s.date);
      if (!cur) continue;
      const done = s.sets.filter(Boolean);
      if (!done.length) continue;
      cur.sets += done.length;
      for (const st of done) if (st?.weight && st.reps) cur.volume += st.weight * st.reps;
      const nm = nameOf.get(exId);
      if (nm && !cur.names.includes(nm)) cur.names.push(nm);
    }
  }

  return dates
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, note: notes[date], ...stat.get(date)! }));
}

const fmtFull = (iso: string) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit" });
};

const fmtChip = (iso: string) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

export default function SessionHistoryCard() {
  const { data } = useApp();
  const days = useMemo(() => collect(data), [data]);
  const [picked, setPicked] = useState<string | null>(null);

  if (!days.length) return null;

  // ค่าเริ่มต้น = วันล่าสุดที่มีโน้ต · ถ้าวันที่เลือกไว้ถูกลบโน้ตไป ให้เด้งกลับวันล่าสุด
  const sel = days.find((d) => d.date === picked) ?? days[0];

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{days.length} วันที่มีโน้ต</span>}>
        ย้อนดูโน้ต
      </Kicker>

      {/* แถบเลือกวัน — เลื่อนแนวนอน จึงสูงคงที่ไม่ว่าจะมีกี่วัน */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {days.map((d) => {
          const on = d.date === sel.date;
          return (
            <button
              key={d.date}
              onClick={() => setPicked(d.date)}
              className="font-mono2 text-[10.5px] shrink-0 cut-sm"
              style={{
                padding: "6px 10px",
                background: on ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,20,31,.6)",
                color: on ? "#050a18" : "var(--mut)",
                border: on ? "none" : "1px solid var(--edge)",
              }}
            >
              {fmtChip(d.date)}
            </button>
          );
        })}
      </div>

      <div className="glass-inset p-3 mt-2">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="font-mono2 text-[11px]" style={{ color: "var(--acc)" }}>
            {fmtFull(sel.date)}
          </span>
          <span className="font-mono2 text-[10px]" style={{ color: "var(--mut)" }}>
            {sel.sets > 0
              ? `${sel.sets} เซต${sel.volume > 0 ? ` · ${Math.round(sel.volume).toLocaleString()} kg` : ""}`
              : "ไม่ได้ฝึก"}
          </span>
        </div>

        {sel.names.length > 0 && (
          <div className="text-[11px] mb-2 leading-relaxed" style={{ color: "var(--dim)" }}>
            {sel.names.slice(0, 6).join(" · ")}
            {sel.names.length > 6 && ` +${sel.names.length - 6}`}
          </div>
        )}

        <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--ink)", whiteSpace: "pre-wrap" }}>
          {sel.note}
        </div>
      </div>
    </div>
  );
}
