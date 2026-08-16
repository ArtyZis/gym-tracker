import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { normName, todayStr } from "../lib/store";
import type { SetLog } from "../lib/store";
import { forecastPR } from "../lib/forecast";
import { shareWeeklyCard } from "../lib/share";
import { t } from "../lib/i18n";
import StreakCard from "./StreakCard";
import BodyCompCard from "./BodyCompCard";
import { Kicker } from "./ui";
import { isPremium } from "../lib/premium";
import SessionHistoryCard from "./SessionHistoryCard";
import LoadCard from "./LoadCard";
import RankCard from "./RankCard";

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
      toast(t("ใส่น้ำหนักก่อน", "Enter a weight first"));
      return;
    }
    update((d) => {
      d.bodyweight = d.bodyweight.filter((b) => b.date !== todayStr());
      d.bodyweight.push({ date: todayStr(), kg });
      d.bodyweight.sort((a, b) => a.date.localeCompare(b.date));
    });
    setBwInput("");
    toast(t("บันทึกน้ำหนักแล้ว", "Bodyweight saved"));
  }

  return (
    <div className="rise">
      <RankCard />

      <SessionHistoryCard />

      <StreakCard />

      {/* วางต่อจากสตรีคเพราะเป็นเรื่องเดียวกัน คือ "ที่ผ่านมาทำอะไรไปบ้าง"
          ต่างกันตรงสตรีคนับว่าไปกี่วัน ส่วนอันนี้นับว่างานหนักแค่ไหน */}
      <LoadCard />

      <div className="glass p-4 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Kicker>{t("การ์ดสรุปสัปดาห์", "Weekly recap card")}</Kicker>
            <p className="text-[11.5px] leading-relaxed -mt-1" style={{ color: "var(--mut)" }}>
              {t("สร้างภาพสรุป volume · PR ใหม่ · สตรีค ไว้แชร์ลง social", "An image with your volume · new PRs · streak, ready to post")}
            </p>
          </div>
          <button
            className="btn-cy !py-2.5 !px-4 !text-[12px] shrink-0"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              const r = await shareWeeklyCard(data);
              setSharing(false);
              toast(
                r === "shared"
                  ? t("เปิดหน้าแชร์แล้ว", "Share sheet opened")
                  : r === "downloaded"
                    ? t("ดาวน์โหลดการ์ดแล้ว 🖼️", "Card downloaded 🖼️")
                    : t("สร้างการ์ดไม่สำเร็จ", "Couldn't build the card"),
              );
            }}
          >
            {sharing ? t("กำลังวาด...", "Drawing…") : t("แชร์", "Share")}
          </button>
        </div>
      </div>

      <div className="glass p-4 mb-3">
        <Kicker right={data.bodyweight.length ? <span className="font-mono2 text-[11px]" style={{ color: "var(--acc)" }}>{bw} kg</span> : undefined}>
          {t("น้ำหนักตัว", "Bodyweight")}
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
            {t("บันทึก", "Save")}
          </button>
        </div>
        <Spark pts={data.bodyweight.slice(-12).map((b) => b.kg)} color="var(--acc)" />
        {data.bodyweight.length > 0 && (
          <div className="flex justify-between font-mono2 text-[10.5px] mt-1" style={{ color: "var(--mut)" }}>
            <span>{data.bodyweight.slice(-6)[0]?.date}</span>
            <span style={{ color: "var(--cyan)" }}>{t(`${bw} kg ล่าสุด`, `${bw} kg latest`)}</span>
          </div>
        )}
      </div>

      <BodyCompCard />

      <div className="glass p-4 mb-3">
        <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>@ {bw} kg</span>}>
          {t("ระดับความแข็งแรง", "Strength standards")}
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
                <span>{t(`เริ่มต้น ${beg}`, `Novice ${beg}`)}</span>
                <span>{t(`กลาง ${mid}`, `Inter. ${mid}`)}</span>
                <span>{t(`สูง ${adv}`, `Adv. ${adv}`)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass p-4">
        <Kicker>{t("สถิติแต่ละท่า", "Per-exercise history")}</Kicker>
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
              {t("พยากรณ์ PR · Linear Trend", "PR forecast · linear trend")}
            </div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--ink)" }}>
              {t("โน้มไปทาง", "Trending toward")}{" "}
              <b style={{ color: "var(--cyan)" }}>
                {forecast.in2w} {ex.unit || "kg"}
              </b>{" "}
              {t("ในอีก 2 สัปดาห์ ·", "in 2 weeks ·")} <b style={{ color: "var(--cyan)" }}>{forecast.in4w}</b>{" "}
              {t("ในอีก 4 สัปดาห์", "in 4 weeks")}
            </p>
            <p className="font-mono2 text-[10px] mt-0.5" style={{ color: "var(--dim)" }}>
              {t(
                `จาก ${forecast.points} เซสชันล่าสุด · แนวโน้ม ${forecast.slopePerWeek >= 0 ? "+" : ""}${forecast.slopePerWeek} kg/สัปดาห์`,
                `From the last ${forecast.points} sessions · trend ${forecast.slopePerWeek >= 0 ? "+" : ""}${forecast.slopePerWeek} kg/week`,
              )}
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
              {t("พยากรณ์ PR — อีก 2-4 สัปดาห์จะยกได้เท่าไหร่", "PR forecast — what you'll lift in 2-4 weeks")}
            </span>
            <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
              {t("ปลดล็อก", "Unlock")}
            </span>
          </button>
        )}
        {premium && !forecast && ex?.type === "weight" && sessions.length > 0 && (
          <p className="text-[11px] my-2" style={{ color: "var(--dim)" }}>
            {t("บันทึกให้ครบ 4 เซสชันขึ้นไป จะเริ่มพยากรณ์ PR ให้", "Log 4 or more sessions and the PR forecast kicks in")}
          </p>
        )}
        {sessions.length === 0 ? (
          <p className="text-center text-[12px] py-3" style={{ color: "var(--dim)" }}>
            {t("ยังไม่มีบันทึกของท่านี้", "Nothing logged for this exercise yet")}
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
                      ex?.type === "weight"
                        ? `${st.weight}×${st.reps}`
                        : ex?.type === "time"
                          ? `${st.duration}${t("วิ", "s")}`
                          : `${st.reps}`,
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
              if (
                !confirm(
                  t(
                    `ลบประวัติทั้งหมดของ "${ex.name}"? (ลบถาวร กู้ไม่ได้)`,
                    `Delete all history for "${ex.name}"? This is permanent — it cannot be undone.`,
                  ),
                )
              )
                return;
              update((d) => {
                delete d.history[ex.id];
                if (d.historyArchive) delete d.historyArchive[normName(ex.name)];
              });
              toast(t("ลบประวัติท่านี้แล้ว", "History deleted"));
            }}
          >
            {t("🗑 ลบประวัติท่านี้", "🗑 Delete this exercise's history")}
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
        {t("ยังไม่มีข้อมูลพอวาดกราฟ", "Not enough data to chart yet")}
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
