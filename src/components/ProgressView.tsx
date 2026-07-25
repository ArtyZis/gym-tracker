import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { normName, todayStr } from "../lib/store";
import type { SetLog } from "../lib/store";
import { forecastPR } from "../lib/forecast";
import { shareWeeklyCard } from "../lib/share";
import StreakCard from "./StreakCard";
import BodyCompCard from "./BodyCompCard";
import { Kicker } from "./ui";
import { isPremium } from "../lib/premium";

// อัตราส่วนน้ำหนักที่ยกได้ต่อน้ำหนักตัว: [เริ่มต้น, กลาง, สูง]
const STRENGTH_STANDARDS: Record<string, { ratios: [number, number, number] }> = {
  squat: { ratios: [1.15, 1.59, 2.11] },
  incline_press: { ratios: [0.344, 0.492, 0.672] },
  ohp: { ratios: [0.246, 0.393, 0.574] },
  incline_curl: { ratios: [0.148, 0.262, 0.393] },
  lat_pulldown: { ratios: [0.787, 1.115, 1.525] },
};

function standardKey(name: string): string | null {
  const t = name.toLowerCase();
  return /squat/.test(t) && !/split|bulgar/.test(t)
    ? "squat"
    : /incline/.test(t) && /press/.test(t)
      ? "incline_press"
      : /(overhead|shoulder)/.test(t) && /press/.test(t)
        ? "ohp"
        : /incline/.test(t) && /curl/.test(t)
          ? "incline_curl"
          : /pulldown/.test(t)
            ? "lat_pulldown"
            : null;
}

export default function ProgressView() {
  const { data, update, toast, goTab } = useApp();
  const [bwInput, setBwInput] = useState("");
  const [exId, setExId] = useState(data.exercises[0]?.id ?? "");

  const bw = data.bodyweight.length ? data.bodyweight[data.bodyweight.length - 1].kg : 61;
  const ex = data.exercises.find((e) => e.id === exId);

  const sessions = useMemo(
    () =>
      ex
        ? (data.history[ex.id] || [])
            .map((s) => ({ date: s.date, sets: s.sets.filter(Boolean) as SetLog[] }))
            .filter((s) => s.sets.length)
        : [],
    [data, ex],
  );

  const metric: keyof SetLog = ex?.type === "weight" ? "weight" : ex?.type === "time" ? "duration" : "reps";
  const points = sessions.slice(-12).map((s) => Math.max(...s.sets.map((st) => st[metric] || 0)));
  const premium = isPremium(data);
  const forecast = useMemo(() => (premium && ex ? forecastPR(data, ex) : null), [data, ex, premium]);
  const [sharing, setSharing] = useState(false);

  function saveBodyweight() {
    const kg = parseFloat(bwInput);
    if (!kg || kg <= 0) {
      toast("ใส่น้ำหนักก่อน");
      return;
    }
    update((d) => {
      d.bodyweight = d.bodyweight.filter((b) => b.date !== todayStr());
      d.bodyweight.push({ date: todayStr(), kg });
      d.bodyweight.sort((a, b) => a.date.localeCompare(b.date));
    });
    setBwInput("");
    toast("บันทึกน้ำหนักแล้ว");
  }

  return (
    <div className="rise">
      <StreakCard />

      <div className="glass p-4 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Kicker>การ์ดสรุปสัปดาห์</Kicker>
            <p className="text-[11.5px] leading-relaxed -mt-1" style={{ color: "var(--mut)" }}>
              สร้างภาพสรุป volume · PR ใหม่ · สตรีค ไว้แชร์ลง social
            </p>
          </div>
          <button
            className="btn-cy !py-2.5 !px-4 !text-[12px] shrink-0"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              const r = await shareWeeklyCard(data);
              setSharing(false);
              toast(r === "shared" ? "เปิดหน้าแชร์แล้ว" : r === "downloaded" ? "ดาวน์โหลดการ์ดแล้ว 🖼️" : "สร้างการ์ดไม่สำเร็จ");
            }}
          >
            {sharing ? "กำลังวาด..." : "แชร์"}
          </button>
        </div>
      </div>

      <div className="glass p-4 mb-3">
        <Kicker right={data.bodyweight.length ? <span className="font-mono2 text-[11px]" style={{ color: "var(--acc)" }}>{bw} kg</span> : undefined}>
          น้ำหนักตัว
        </Kicker>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            step="0.1"
            placeholder="61.0"
            value={bwInput}
            onChange={(e) => setBwInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 text-[15px]"
          />
          <button className="btn-cy !py-2.5 !px-4 !text-[12px] shrink-0" onClick={saveBodyweight}>
            บันทึก
          </button>
        </div>
        <Spark pts={data.bodyweight.slice(-12).map((b) => b.kg)} color="var(--acc)" />
        {data.bodyweight.length > 0 && (
          <div className="flex justify-between font-mono2 text-[10.5px] mt-1" style={{ color: "var(--mut)" }}>
            <span>{data.bodyweight.slice(-6)[0]?.date}</span>
            <span style={{ color: "var(--cyan)" }}>{bw} kg ล่าสุด</span>
          </div>
        )}
      </div>

      <BodyCompCard />

      <div className="glass p-4 mb-3">
        <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>@ {bw} kg</span>}>
          ระดับความแข็งแรง
        </Kicker>
        {Object.keys(STRENGTH_STANDARDS).map((key) => {
          const match = data.exercises.find((e) => standardKey(e.name) === key && e.type === "weight");
          if (!match) return null;
          const hist = data.history[match.id] || [];
          let current = 0;
          if (hist.length) {
            const last = hist[hist.length - 1].sets.filter(Boolean) as SetLog[];
            if (last.length) current = Math.max(...last.map((s) => s.weight || 0));
          }
          const [beg, mid, adv] = STRENGTH_STANDARDS[key].ratios.map((r) => +(r * bw).toFixed(1));
          return (
            <div key={key} className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[13px]">{match.name}</span>
                <span className="font-mono2 text-[11px]" style={{ color: "var(--cyan)" }}>
                  {current || "—"} {match.unit || "kg"}
                </span>
              </div>
              <div className="h-[7px] rounded-full relative overflow-hidden" style={{ background: "rgba(120,180,255,.10)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (current / adv) * 100)}%`,
                    background: "linear-gradient(90deg, var(--blue), var(--acc))",
                    boxShadow: "0 0 10px var(--acc-40)",
                    transition: "width .6s",
                  }}
                />
              </div>
              <div className="flex justify-between font-mono2 text-[9px] mt-1" style={{ color: "var(--dim)" }}>
                <span>เริ่มต้น {beg}</span>
                <span>กลาง {mid}</span>
                <span>สูง {adv}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass p-4">
        <Kicker>สถิติแต่ละท่า</Kicker>
        <select value={exId} onChange={(e) => setExId(e.target.value)} className="w-full px-3.5 py-2.5 mb-2 text-[14px]">
          {data.exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <Spark pts={points} color="#6ff0c0" />
        {forecast && ex && (
          <div className="glass-inset px-3 py-2.5 my-2">
            <div className="font-mono2 text-[9px] uppercase tracking-[.18em] mb-1" style={{ color: "var(--cyan-dim)" }}>
              พยากรณ์ PR · Linear Trend
            </div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--ink)" }}>
              โน้มไปทาง{" "}
              <b style={{ color: "var(--cyan)" }}>
                {forecast.in2w} {ex.unit || "kg"}
              </b>{" "}
              ในอีก 2 สัปดาห์ · <b style={{ color: "var(--cyan)" }}>{forecast.in4w}</b> ในอีก 4 สัปดาห์
            </p>
            <p className="font-mono2 text-[10px] mt-0.5" style={{ color: "var(--dim)" }}>
              จาก {forecast.points} เซสชันล่าสุด · แนวโน้ม {forecast.slopePerWeek >= 0 ? "+" : ""}
              {forecast.slopePerWeek} kg/สัปดาห์
            </p>
          </div>
        )}
        {!premium && ex?.type === "weight" && sessions.length > 0 && (
          <button
            className="glass-inset w-full px-3 py-2.5 my-2 flex items-center gap-2.5 text-left"
            onClick={() => goTab("manage")}
          >
            <span className="text-[13px]">🔒</span>
            <span className="text-[12px] flex-1 leading-snug" style={{ color: "var(--mut)" }}>
              พยากรณ์ PR — อีก 2-4 สัปดาห์จะยกได้เท่าไหร่
            </span>
            <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
              ปลดล็อก
            </span>
          </button>
        )}
        {premium && !forecast && ex?.type === "weight" && sessions.length > 0 && (
          <p className="text-[11px] my-2" style={{ color: "var(--dim)" }}>
            บันทึกให้ครบ 4 เซสชันขึ้นไป จะเริ่มพยากรณ์ PR ให้
          </p>
        )}
        {sessions.length === 0 ? (
          <p className="text-center text-[12px] py-3" style={{ color: "var(--dim)" }}>
            ยังไม่มีบันทึกของท่านี้
          </p>
        ) : (
          sessions
            .slice(-5)
            .reverse()
            .map((s) => (
              <div key={s.date} className="flex gap-3 py-2 hairline font-mono2 text-[11.5px]">
                <span style={{ color: "var(--dim)" }}>{s.date}</span>
                <span className="flex-1 text-right" style={{ color: "var(--ink)" }}>
                  {s.sets
                    .map((st) =>
                      ex?.type === "weight" ? `${st.weight}×${st.reps}` : ex?.type === "time" ? `${st.duration}วิ` : `${st.reps}`,
                    )
                    .join("  ")}
                </span>
              </div>
            ))
        )}
        {ex && sessions.length > 0 && (
          <button
            className="btn-gh w-full !py-2 !text-[11.5px] mt-2.5"
            style={{ color: "var(--bad)", borderColor: "rgba(255,107,107,.35)" }}
            onClick={() => {
              if (!confirm(`ลบประวัติทั้งหมดของ "${ex.name}"? (ลบถาวร กู้ไม่ได้)`)) return;
              update((d) => {
                delete d.history[ex.id];
                if (d.historyArchive) delete d.historyArchive[normName(ex.name)];
              });
              toast("ลบประวัติท่านี้แล้ว");
            }}
          >
            🗑 ลบประวัติท่านี้
          </button>
        )}
      </div>
    </div>
  );
}

export function Spark({ pts, color }: { pts: number[]; color: string }) {
  if (pts.length < 2)
    return (
      <div className="h-[52px] flex items-center justify-center font-mono2 text-[10px]" style={{ color: "var(--dim)" }}>
        ยังไม่มีข้อมูลพอวาดกราฟ
      </div>
    );
  const min = Math.min(...pts);
  const range = Math.max(...pts) - min || 1;
  const step = 286 / (pts.length - 1);
  const coords = pts.map((p, i) => [7 + i * step, 45 - ((p - min) / range) * 38] as const);
  const line = coords.map((c, i) => (i ? "L" : "M") + c[0].toFixed(1) + "," + c[1].toFixed(1)).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},45 L${coords[0][0].toFixed(1)},45 Z`;
  return (
    <svg viewBox="0 0 300 52" className="w-full h-[52px]" preserveAspectRatio="none">
      <path d={area} style={{ fill: color, opacity: 0.1 }} />
      <path d={line} fill="none" style={{ stroke: color, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${color})` }} />
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r="2.4" style={{ fill: color }} />
      ))}
    </svg>
  );
}
