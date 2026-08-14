import { useMemo } from "react";
import { useApp } from "../AppContext";
import { computeStreak, heatmapGrid } from "../lib/streak";
import { plural, setsText, t } from "../lib/i18n";
import { Kicker } from "./ui";

// ระดับความเข้มของ heatmap อิงสี accent (color-mix ให้เปลี่ยนสีตามธีม)
const LEVEL_FILL = [
  "rgba(125,180,255,.07)",
  "color-mix(in srgb, var(--acc) 25%, transparent)",
  "color-mix(in srgb, var(--acc) 45%, transparent)",
  "color-mix(in srgb, var(--acc) 72%, transparent)",
  "var(--acc)",
];

const CELL = 13;
const GAP = 3;
const WEEKS = 16;

export default function StreakCard() {
  const { data } = useApp();
  const streak = useMemo(() => computeStreak(data), [data]);
  const { grid, monthLabels } = useMemo(() => heatmapGrid(data, WEEKS), [data]);

  const width = WEEKS * (CELL + GAP) + 22;
  const height = 7 * (CELL + GAP) + 18;
  // ป้ายซ้ายของ heatmap — โชว์แค่ 4 แถวเว้นแถว ให้พออ่านออกโดยไม่เบียดตาราง
  const dayLabels: { row: number; label: string }[] = [
    { row: 0, label: t("จ", "M") },
    { row: 2, label: t("พ", "W") },
    { row: 4, label: t("ศ", "F") },
    { row: 6, label: t("อา", "Su") },
  ];

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9.5px]" style={{ color: "var(--dim)" }}>{t(`${WEEKS} สัปดาห์ล่าสุด`, `Last ${WEEKS} weeks`)}</span>}>
        {t("สตรีคการฝึก", "Training streak")}
      </Kicker>

      <div className="flex items-center gap-4 mb-3.5">
        <div
          className="text-center px-4 py-2.5 rounded-2xl shrink-0"
          style={
            streak.current > 0
              ? {
                  background: "linear-gradient(160deg, var(--acc-18), color-mix(in srgb, var(--blue) 6%, transparent))",
                  border: "1px solid color-mix(in srgb, var(--acc) 24%, transparent)",
                  boxShadow: "0 0 22px -6px var(--acc-40), inset 0 1px 0 #bfe6ff1a",
                }
              : { background: "#08111ccc", border: "1px solid var(--edge)" }
          }
        >
          <div
            className="font-disp font-bold text-[32px] leading-none"
            style={{
              color: streak.current > 0 ? "var(--acc)" : "var(--dim)",
              textShadow: streak.current > 0 ? "0 0 16px color-mix(in srgb, var(--acc) 55%, transparent)" : "none",
            }}
          >
            {streak.current}
          </div>
          <div className="font-mono2 text-[9px] mt-1.5" style={{ color: "var(--mut)" }}>
            {t("วันต่อเนื่อง", "day streak")}
            {streak.current > 0 ? " 🔥" : ""}
          </div>
        </div>
        <div className="flex-1 text-[11.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
          <div>
            {t("สถิติสูงสุด", "Best")} <b style={{ color: "var(--ink)" }}>{streak.best}</b> {plural(streak.best, "วัน", "day")}
          </div>
          <div>
            {t("สัปดาห์นี้ฝึกแล้ว", "This week")} <b style={{ color: "var(--cyan)" }}>{streak.trainedThisWeek}</b>{" "}
            {plural(streak.trainedThisWeek, "วัน", "day")}
          </div>
          <div className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--dim)" }}>
            {t(
              "นับเฉพาะวันที่ฝึกจริง · วันพักไม่บวกแต่ไม่ตัด · พลาดวันฝึกแล้วชดเชยครบทีหลัง ถือว่าไม่ขาด",
              "Only real training days count · rest days neither add nor break it · make up a missed day in full and the streak holds",
            )}
          </div>
        </div>
      </div>

      <div className="scroll-x" style={{ direction: "rtl" }}>
        <svg width={width} height={height} style={{ direction: "ltr", display: "block", marginLeft: "auto" }}>
          {monthLabels.map((m) => (
            <text
              key={m.col + m.label}
              x={22 + m.col * (CELL + GAP)}
              y={9}
              fontSize={8.5}
              fill="var(--dim)"
              fontFamily="JetBrains Mono, monospace"
            >
              {m.label}
            </text>
          ))}
          {dayLabels.map((d) => (
            <text
              key={d.label}
              x={0}
              y={18 + 9 + d.row * (CELL + GAP)}
              fontSize={8.5}
              fill="var(--dim)"
              fontFamily="JetBrains Mono, monospace"
            >
              {d.label}
            </text>
          ))}
          {grid.map((col, c) =>
            col.map((cell, r) =>
              cell.inFuture ? null : (
                <rect
                  key={cell.date}
                  x={22 + c * (CELL + GAP)}
                  y={18 + r * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={3.5}
                  style={{
                    fill: LEVEL_FILL[cell.level],
                    ...(cell.level === 4 ? { filter: "drop-shadow(0 0 3px color-mix(in srgb, var(--acc) 80%, transparent))" } : {}),
                  }}
                >
                  <title>
                    {cell.date} · {setsText(cell.count)}
                  </title>
                </rect>
              ),
            ),
          )}
        </svg>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
        {t("น้อย", "Less")}
        {LEVEL_FILL.map((f, i) => (
          <span key={i} className="inline-block w-[10px] h-[10px] rounded-[3px]" style={{ background: f }} />
        ))}
        {t("มาก", "More")}
      </div>
    </div>
  );
}
