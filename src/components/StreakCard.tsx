import { useMemo } from "react";
import { useApp } from "../AppContext";
import { computeStreak, heatmapGrid } from "../lib/streak";
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
  const dayLabels: { row: number; label: string }[] = [
    { row: 0, label: "จ" },
    { row: 2, label: "พ" },
    { row: 4, label: "ศ" },
    { row: 6, label: "อา" },
  ];

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9.5px]" style={{ color: "var(--dim)" }}>{WEEKS} สัปดาห์ล่าสุด</span>}>
        สตรีคการฝึก
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
            วันต่อเนื่อง{streak.current > 0 ? " 🔥" : ""}
          </div>
        </div>
        <div className="flex-1 text-[11.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
          <div>
            สถิติสูงสุด <b style={{ color: "var(--ink)" }}>{streak.best}</b> วัน
          </div>
          <div>
            สัปดาห์นี้ฝึกแล้ว <b style={{ color: "var(--cyan)" }}>{streak.trainedThisWeek}</b> วัน
          </div>
          <div className="font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
            วันพักตามโปรแกรมไม่ตัดสตรีค
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
                    {cell.date} · {cell.count} เซต
                  </title>
                </rect>
              ),
            ),
          )}
        </svg>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
        น้อย
        {LEVEL_FILL.map((f, i) => (
          <span key={i} className="inline-block w-[10px] h-[10px] rounded-[3px]" style={{ background: f }} />
        ))}
        มาก
      </div>
    </div>
  );
}
