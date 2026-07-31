import { useMemo } from "react";
import { useApp } from "../AppContext";
import type { Recommendation } from "../lib/analyzer";
import {
  MUSCLE_TH,
  PATTERN_TH,
  analyzeProgram,
  applyRecommendation,
  buildRecommendations,
} from "../lib/analyzer";
import { slotName } from "../lib/loop";
import { getMaxSetsPerSession, getTimeCap, getVolumeTarget } from "../lib/profile";
import { EXPERIENCE_TH } from "../lib/muscles";
import { getExperience } from "../lib/profile";
import { Kicker, PremiumLock } from "./ui";
import { isPremium } from "../lib/premium";

export default function AnalyzerView() {
  const { data, update, toast, goTab } = useApp();

  const analysis = useMemo(() => analyzeProgram(data), [data]);
  const recommendations = useMemo(() => buildRecommendations(data, analysis), [data, analysis]);
  const premium = isPremium(data);
  const target = getVolumeTarget(data);
  const maxSets = getMaxSetsPerSession(data);
  const timeCap = getTimeCap(data);

  function applyRec(rec: Recommendation) {
    update((d) => applyRecommendation(d, rec));
    toast(rec.title + " แล้ว");
  }

  const atCeiling = analysis.execution >= analysis.ceiling - 2;
  const scoreColor = atCeiling
    ? "var(--good)"
    : analysis.execution >= 70
      ? "var(--acc)"
      : analysis.execution >= 50
        ? "var(--warn)"
        : "var(--bad)";
  const circ = 2 * Math.PI * 34;

  return (
    <div className="rise">
      {/* ── คะแนน 2 ชั้น: ทำได้จริง vs เพดานที่ข้อจำกัดอนุญาต ── */}
      <div className="glass p-5 mb-3 relative overflow-hidden" style={{ "--card-pad": "20px" } as React.CSSProperties}>
        <Kicker
          right={
            <span className="font-mono2 text-[8.5px]" style={{ color: "var(--dim)" }}>
              เพดาน {analysis.ceiling}
            </span>
          }
        >
          Program Status
        </Kicker>
        <div className="flex items-center gap-4 relative">
          <div className="relative w-[96px] h-[96px] shrink-0">
            {/* วงกลมเรืองแสงหลังเกจ — inset ต้องน้อยกว่า padding การ์ด (p-5 = 20px)
                เพราะการ์ดตั้ง overflow:hidden ถ้าล้นออกไปขอบจะโดนเฉือนจนไม่กลม */}
            <div
              className="absolute pointer-events-none"
              style={{
                inset: -13,
                borderRadius: "50%",
                background: `radial-gradient(circle, color-mix(in srgb, ${scoreColor} 28%, transparent) 0%, transparent 68%)`,
              }}
            />
            <ScoreGauge score={analysis.execution} ceiling={analysis.ceiling} color={scoreColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-disp font-bold text-[30px] leading-none num-glow" style={{ color: scoreColor }}>
                {analysis.execution}
              </span>
              <span className="font-mono2 text-[7.5px] tracking-[.2em] mt-0.5" style={{ color: "var(--dim)" }}>
                SCORE
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-disp font-bold text-[16px] leading-snug">{analysis.headline}</h2>
            <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--mut)" }}>
              {atCeiling ? (
                <>
                  ดีที่สุดเท่าที่ตารางนี้ทำได้แล้วด้วยการฝึก {analysis.dayLoads.length} วัน
                  {analysis.ceiling < 98 && " — ถ้าอยากทะลุเพดาน ต้องเพิ่มวันฝึก ไม่ใช่แก้ท่า"}
                </>
              ) : (
                <>เพดานตารางนี้ {analysis.ceiling} — ยังปรับได้อีก {analysis.ceiling - analysis.execution} คะแนน</>
              )}
            </p>
          </div>
        </div>
        <button
          className="btn-gh w-full !py-2 !text-[11px] mt-3"
          onClick={() => goTab("manage")}
        >
          ระดับ: {EXPERIENCE_TH[getExperience(data)]} · เป้า {target.min}-{target.max} เซต · {timeCap} นาที/ครั้ง — แก้ได้
        </button>
      </div>

      {/* ── ปัญหาที่แก้ด้วยตารางนี้ไม่ได้ (แสดงก่อนคำแนะนำ เพราะเป็นต้นเหตุจริง) ── */}
      {premium && analysis.blockedInsights.length > 0 && (
        <div className="glass p-4 mb-3" style={{ borderColor: "rgba(255,193,94,.35)" }}>
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--warn)" }}>แก้ที่ต้นเหตุ</span>}>
            ติดข้อจำกัดของตาราง
          </Kicker>
          {analysis.blockedInsights.map((b, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{b.issue}</div>
              <div className="text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
                ทำไมแก้ไม่ได้: {b.whyCannotFix}
              </div>
              <div className="text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--acc)" }}>
                ทางแก้จริง: {b.realSolution}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ปริมาณต่อกล้ามเนื้อ ── */}
      {!premium && (
        <PremiumLock label={`เจอ ${analysis.issues.length} จุดที่ควรแก้ — ปลดล็อกเพื่อดูว่าคืออะไรและแก้ยังไง`}>
          <div className="glass p-4 mb-3">
            <Kicker>เซตต่อกล้ามเนื้อ / สัปดาห์</Kicker>
            {analysis.stats.slice(0, 6).map((s) => (
              <div key={s.muscle} className="mb-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12.5px]">{MUSCLE_TH[s.muscle]}</span>
                  <span className="font-mono2 text-[10.5px]" style={{ color: "var(--acc)" }}>{s.sets} เซต</span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(120,180,255,.10)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.sets / target.max) * 100)}%`, background: "var(--acc)" }} />
                </div>
              </div>
            ))}
          </div>
        </PremiumLock>
      )}

      {/* ── ATTRIBUTES — ตาราง 2 คอลัมน์ เห็นครบ 13 กลุ่มในตาเดียวก่อนลงรายละเอียด ── */}
      {premium && (
        <div className="glass p-4 mb-3">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>เซต/สัปดาห์</span>}>
            Attributes
          </Kicker>
          {/* แถบสั้นใต้ตัวเลข — เห็นทันทีว่ามัดไหนขาด โดยไม่ต้องอ่านตัวเลขทีละคู่แล้วเทียบเอง */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-[9px]">
            {analysis.stats.map((s) => {
              const c =
                s.status === "good" ? "var(--acc)" : s.status === "high" ? "var(--good)" : "var(--warn)";
              return (
                <div key={s.muscle} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                    <span className="truncate" style={{ color: "var(--mut)" }}>
                      {MUSCLE_TH[s.muscle]}
                    </span>
                    <span className="font-mono2 text-[11px] shrink-0" style={{ color: c }}>
                      {s.sets.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-[3px]" style={{ height: 3, background: "#ffffff12" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (s.sets / target.max) * 100)}%`,
                        height: "100%",
                        background: c,
                        boxShadow: `0 0 6px color-mix(in srgb, ${c} 70%, transparent)`,
                        transition: "width .5s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {premium && (
        <div className="glass p-4 mb-3">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>เป้า {target.min}-{target.max}</span>}>
            รายละเอียดต่อกล้ามเนื้อ
          </Kicker>
          {analysis.stats.map((s) => {
            const color =
              s.status === "good" ? "var(--acc)" : s.status === "low" || s.status === "missing" ? "var(--warn)" : "var(--bad)";
            return (
              <div key={s.muscle} className="mb-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12.5px]">
                    {MUSCLE_TH[s.muscle]}
                    <span className="font-mono2 text-[9.5px]" style={{ color: "var(--dim)" }}>
                      {" "}
                      · {s.days} วัน{s.blockedBy ? " (ตารางจำกัด)" : ""}
                    </span>
                  </span>
                  <span className="font-mono2 text-[10.5px]" style={{ color }}>
                    {s.sets} เซต
                  </span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden relative" style={{ background: "rgba(120,180,255,.10)" }}>
                  {/* แถบโปร่งบอกโซนเป้าหมาย */}
                  <div
                    className="absolute inset-y-0"
                    style={{ left: `${(target.min / (target.max * 1.5)) * 100}%`, width: `${((target.max - target.min) / (target.max * 1.5)) * 100}%`, background: "rgba(120,180,255,.12)" }}
                  />
                  <div
                    className="h-full rounded-full relative"
                    style={{ width: `${Math.min(100, (s.sets / (target.max * 1.5)) * 100)}%`, background: color, boxShadow: `0 0 8px ${color}`, transition: "width .6s ease" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ภาระแต่ละวัน ── */}
      {premium && analysis.dayLoads.length > 0 && (
        <div className="glass p-4 mb-3">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>เพดาน {maxSets} เซต / {timeCap} นาที</span>}>
            ภาระแต่ละวันฝึก
          </Kicker>
          {analysis.dayLoads.map((dl) => {
            const over = dl.overSets || dl.overTime;
            const color = over ? "var(--bad)" : "var(--acc)";
            return (
              <div key={dl.day} className="mb-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12.5px]">
                    {slotName(data, dl.day)}
                    <span className="font-mono2 text-[10px]" style={{ color: "var(--dim)" }}> · {dl.exercises} ท่า</span>
                  </span>
                  <span className="font-mono2 text-[10.5px]" style={{ color }}>
                    {dl.sets} เซต · ~{dl.minutes} นาที
                  </span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(120,180,255,.10)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (dl.sets / maxSets) * 100)}%`, background: color, boxShadow: `0 0 8px ${color}`, transition: "width .6s ease" }}
                  />
                </div>
              </div>
            );
          })}
          {analysis.recovery.length > 0 && (
            <div className="glass-inset px-3 py-2.5 mt-3" style={{ borderColor: "rgba(255,193,94,.3)" }}>
              <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-1.5" style={{ color: "var(--warn)" }}>
                ฟื้นตัวไม่ทัน
              </div>
              {analysis.recovery.map((r, i) => (
                <div key={i} className="text-[12px] leading-relaxed" style={{ color: "#dbe9f7" }}>
                  {MUSCLE_TH[r.muscle]} — {slotName(data, r.a)} ต่อ {slotName(data, r.b)} ห่างแค่ {r.gapHours} ชม.
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── สมดุลรูปแบบการเคลื่อนไหว ── */}
      {premium && analysis.patterns.length > 0 && (
        <div className="glass p-4 mb-3">
          <Kicker>สมดุลรูปแบบการเคลื่อนไหว</Kicker>
          <p className="text-[11px] -mt-1 mb-2.5" style={{ color: "var(--mut)" }}>
            เซตครบแต่รูปแบบไม่สมดุลก็กระทบท่าทางได้ — ท่าดึงควรไม่น้อยกว่าท่าดัน
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.patterns
              .sort((a, b) => b.sets - a.sets)
              .map((p) => (
                <span
                  key={p.pattern}
                  className="font-mono2 text-[10.5px] px-2.5 py-1.5 cut-sm"
                  style={{ background: "var(--acc-08)", border: "1px solid var(--edge)", color: "var(--mut)" }}
                >
                  {PATTERN_TH[p.pattern]} <b style={{ color: "var(--acc)" }}>{p.sets}</b>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* ── จุดที่ตรวจพบ ── */}
      {premium && analysis.issues.length > 0 && (
        <div className="glass p-4 mb-3">
          <Kicker>จุดที่ตรวจพบ</Kicker>
          {analysis.issues.slice(0, 8).map((issue, i) => (
            <div key={i} className="flex gap-2.5 py-1.5 text-[12.5px]" style={{ color: "var(--ink)" }}>
              <span style={{ color: "var(--warn)" }}>▸</span>
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── คำแนะนำที่ผ่านตัวกรองแล้วเท่านั้น ── */}
      {premium && recommendations.length > 0 && (
        <div className="glass p-4">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>ผ่านตัวกรองแล้ว</span>}>
            คำแนะนำที่ทำได้จริง
          </Kicker>
          <p className="text-[11px] -mt-1 mb-2" style={{ color: "var(--dim)" }}>
            ตรวจอุปกรณ์ · เวลา · เพดานเซต · ระยะฟื้นตัว ครบทุกข้อแล้ว
          </p>
          {recommendations.map((rec) => {
            const accent =
              rec.priority === "high" ? "var(--acc)" : rec.priority === "medium" ? "var(--blue)" : "var(--warn)";
            const verb =
              rec.kind === "reduceSets"
                ? "ลด"
                : rec.kind === "splitDay"
                  ? "แยกวัน"
                  : rec.kind === "moveExercise"
                    ? "ย้าย"
                    : rec.kind === "addDay"
                      ? "สร้างวัน"
                      : rec.kind === "buildProgram"
                        ? "สร้างเลย"
                        : "เพิ่ม";
            return (
              <div key={rec.id} className="flex items-center gap-3 py-3 hairline first:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: accent }} />
                    <b className="text-[13.5px] font-semibold">{rec.title}</b>
                  </div>
                  <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
                    {rec.detail}
                  </span>
                  <span className="block font-mono2 text-[10px] mt-1" style={{ color: "var(--dim)" }}>
                    {rec.reason}
                  </span>
                </div>
                <button
                  className="btn-cy !py-2.5 !px-4 !text-[12px] shrink-0"
                  style={{ background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 78%, #06121f))`, boxShadow: `0 6px 14px -6px ${accent}` }}
                  onClick={() => applyRec(rec)}
                >
                  {verb}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {premium && recommendations.length === 0 && analysis.blockedInsights.length === 0 && (
        <div className="glass p-6 text-center">
          <div className="text-[15px] font-disp font-bold mb-1" style={{ color: "var(--good)" }}>
            ตารางดีแล้ว 🎯
          </div>
          <div className="text-[12px]" style={{ color: "var(--mut)" }}>
            ทุกกลุ่มอยู่ในเป้าหมายและไม่มีจุดที่ต้องแก้ — โฟกัสที่การเพิ่มน้ำหนักต่อเนื่องแทน
          </div>
        </div>
      )}
    </div>
  );
}

// เกจคะแนนแบบขีดรอบวง — อ่านค่าจากระยะไกลง่ายกว่าเส้นตันเส้นเดียว
// ขีดสว่าง = คะแนนที่ทำได้ · ขีดจาง = เพดานที่ข้อจำกัดอนุญาต · ขีดมืด = เกินเพดาน (แตะไม่ได้)
function ScoreGauge({ score, ceiling, color }: { score: number; ceiling: number; color: string }) {
  const N = 44;
  const cx = 48;
  const cy = 48;
  const rIn = 34;
  const rOut = 43;
  const ticks = [];
  for (let i = 0; i < N; i++) {
    const pct = (i / N) * 100;
    const ang = ((-90 + (i / N) * 360) * Math.PI) / 180;
    const lit = pct < score;
    const within = pct < ceiling;
    const r2 = lit ? rOut : rOut - 3;
    ticks.push(
      <line
        key={i}
        x1={cx + Math.cos(ang) * rIn}
        y1={cy + Math.sin(ang) * rIn}
        x2={cx + Math.cos(ang) * r2}
        y2={cy + Math.sin(ang) * r2}
        stroke={lit ? color : within ? `color-mix(in srgb, ${color} 22%, transparent)` : "rgba(255,255,255,.07)"}
        strokeWidth={lit ? 2.6 : 2}
        strokeLinecap="round"
        style={lit ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}
      />,
    );
  }
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: "relative", display: "block" }}>
      {ticks}
    </svg>
  );
}
