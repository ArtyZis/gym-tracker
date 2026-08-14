// หน้าวิเคราะห์ — ตอบ 3 คำถามตามลำดับที่คนถามจริง
//
//   1. ตารางฉันดีแค่ไหน   -> คะแนน + สรุปบรรทัดเดียว
//   2. ต้องทำอะไรต่อ      -> คำแนะนำที่กดแก้ได้ทันที
//   3. ทำไมถึงเป็นแบบนั้น -> รายละเอียด (ยุบไว้ ให้คนที่อยากรู้กดเอง)
//
// เดิมมี 10 บล็อกเรียงกันโดยคำแนะนำอยู่ล่างสุด ผู้ใช้ต้องเลื่อนผ่านตารางตัวเลขทั้งหมด
// กว่าจะถึงสิ่งเดียวที่กดแล้วเกิดอะไรขึ้นจริง — กลับหัวกับสิ่งที่เขาเปิดหน้านี้มาหา
// และมีบล็อกที่แสดงเซตต่อกล้ามเนื้อซ้ำกันถึง 3 แบบในหน้าเดียว

import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Recommendation } from "../lib/analyzer";
import { MUSCLE_TH, PATTERN_TH, analyzeProgram, applyRecommendation, buildRecommendations } from "../lib/analyzer";
import { slotName } from "../lib/loop";
import { getMaxSetsPerSession, getTimeCap, getVolumeTarget } from "../lib/profile";
import { Kicker, PremiumLock } from "./ui";
import { isPremium } from "../lib/premium";

export default function AnalyzerView() {
  const { data, update, toast, goTab } = useApp();
  const [showDetail, setShowDetail] = useState(false);

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

  const empty = data.exercises.length === 0;

  if (empty)
    return (
      <div className="rise">
        <div className="glass p-6 text-center">
          <div className="font-mono2 text-[9px] tracking-[.3em] mb-2" style={{ color: "var(--acc)" }}>
            NO PROGRAM
          </div>
          <div className="font-disp font-bold text-[17px] mb-2" style={{ color: "var(--ink)" }}>
            ยังไม่มีท่าให้วิเคราะห์
          </div>
          <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--mut)" }}>
            เพิ่มท่าแรกหรือวางตารางที่เขียนไว้ แล้วหน้านี้จะบอกว่าตารางขาดอะไรและควรแก้ตรงไหน
          </p>
          <button className="btn-cy w-full !py-2.5 !text-[12.5px]" onClick={() => goTab("manage")}>
            ไปเพิ่มท่า
          </button>
        </div>
      </div>
    );

  return (
    <div className="rise">
      {/* ── 1. คะแนน ── */}
      <div className="glass p-5 mb-3 relative overflow-hidden" style={{ ["--card-pad" as string]: "20px" }}>
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            inset: -13,
            background: `radial-gradient(120px 120px at 22% 50%, color-mix(in srgb, ${scoreColor} 26%, transparent), transparent 70%)`,
          }}
        />
        <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>เพดาน {analysis.ceiling}</span>}>
          Program Status
        </Kicker>
        <div className="flex items-center gap-4 relative">
          <div className="relative shrink-0">
            <ScoreGauge score={analysis.execution} ceiling={analysis.ceiling} color={scoreColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="font-disp font-bold text-[30px]" style={{ color: scoreColor, textShadow: `0 0 18px ${scoreColor}` }}>
                {analysis.execution}
              </span>
              <span className="font-mono2 text-[8px] tracking-[.2em] mt-1" style={{ color: "var(--dim)" }}>
                SCORE
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-disp font-bold text-[16px] leading-snug">{analysis.headline}</h2>
            <p className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color: "var(--mut)" }}>
              {atCeiling
                ? "ตารางนี้ทำได้เต็มที่แล้วภายใต้วันฝึกและเวลาที่มี"
                : `ยังปรับได้อีก ${analysis.ceiling - analysis.execution} คะแนน`}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. สิ่งที่ทำได้ตอนนี้ — ต้องอยู่บนสุดรองจากคะแนน ── */}
      {!premium ? (
        <PremiumLock label={`เจอ ${analysis.issues.length} จุดที่ควรแก้ — ปลดล็อกเพื่อดูว่าคืออะไรและแก้ยังไง`}>
          <div className="glass p-4 mb-3">
            <Kicker>ปรับตารางให้ดีขึ้น</Kicker>
            <div className="h-24" />
          </div>
        </PremiumLock>
      ) : recommendations.length > 0 ? (
        <div className="glass p-4 mb-3">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>ไม่ทำก็ได้</span>}>
            ปรับตารางให้ดีขึ้น
          </Kicker>
          <p className="text-[11px] -mt-1 mb-2" style={{ color: "var(--dim)" }}>
            ผ่านการตรวจอุปกรณ์ · เวลา · เพดานเซต · ระยะฟื้นตัว แล้วทุกข้อ
          </p>
          {recommendations.map((rec) => {
            const accent = rec.priority === "high" ? "var(--acc)" : rec.priority === "medium" ? "var(--blue)" : "var(--warn)";
            const verb =
              rec.kind === "reduceSets"
                ? "ลด"
                : rec.kind === "splitDay"
                  ? "แยกวัน"
                  : rec.kind === "moveExercise"
                    ? "ย้าย"
                    : rec.kind === "addDay"
                      ? "สร้างวัน"
                      : rec.kind === "reorder"
                        ? "จัดใหม่"
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
                  style={{
                    background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 78%, #06121f))`,
                    boxShadow: `0 6px 14px -6px ${accent}`,
                  }}
                  onClick={() => applyRec(rec)}
                >
                  {verb}
                </button>
              </div>
            );
          })}
        </div>
      ) : analysis.blockedInsights.length === 0 ? (
        <div className="glass p-5 mb-3 text-center">
          <div className="text-[15px] font-disp font-bold mb-1" style={{ color: "var(--good)" }}>
            ไม่มีอะไรต้องแก้แล้ว
          </div>
          <div className="text-[12px] leading-relaxed" style={{ color: "var(--mut)" }}>
            ทุกกลุ่มอยู่ในเป้าและตารางสมดุลแล้ว — จากนี้โฟกัสที่การเพิ่มน้ำหนักต่อเนื่องแทน
          </div>
        </div>
      ) : null}

      {/* ── ปัญหาที่ตารางนี้แก้เองไม่ได้ — เป็นต้นเหตุจริง ไม่ใช่สิ่งที่กดปุ่มแล้วหาย ── */}
      {premium && analysis.blockedInsights.length > 0 && (
        <div className="glass p-4 mb-3" style={{ borderColor: "rgba(255,193,94,.28)" }}>
          <Kicker>ติดข้อจำกัดของตาราง</Kicker>
          {analysis.blockedInsights.map((b, i) => (
            <div key={i} className="py-2 hairline first:border-0">
              <b className="block text-[12.5px]" style={{ color: "var(--warn)" }}>
                {b.issue}
              </b>
              <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
                {b.whyCannotFix}
              </span>
              <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--ink)" }}>
                ทางแก้จริง: {b.realSolution}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. ปริมาณต่อกล้ามเนื้อ — เห็นครบทุกมัดในตาเดียว ── */}
      {premium && (
        <div className="glass p-4 mb-3">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>เป้า {target.min}-{target.max} เซต/สัปดาห์</span>}>
            ปริมาณต่อกล้ามเนื้อ
          </Kicker>
          <div className="grid grid-cols-2 gap-x-4 gap-y-[9px]">
            {analysis.stats.map((s) => {
              const c = s.status === "good" ? "var(--acc)" : s.status === "high" ? "var(--good)" : "var(--warn)";
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

      {/* ── 4. รายละเอียด — ยุบไว้ ── */}
      {premium && (
        <>
          <button className="btn-gh w-full !py-2.5 !text-[12px] mb-3" onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? "ซ่อนรายละเอียด" : "ดูรายละเอียด — ภาระรายวัน · สมดุลท่า"}
          </button>

          {showDetail && (
            <>
              <div className="glass p-4 mb-3">
                <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>สูงสุด {maxSets} เซต · {timeCap} นาที</span>}>
                  ภาระแต่ละวัน
                </Kicker>
                {analysis.dayLoads.map((d) => {
                  const over = d.overSets || d.overTime;
                  return (
                    <div key={d.day} className="flex items-center justify-between gap-2 py-[5px] text-[12px]">
                      <span style={{ color: "var(--mut)" }}>{slotName(data, d.day)}</span>
                      <span className="font-mono2 text-[11px]" style={{ color: over ? "var(--warn)" : "var(--ink)" }}>
                        {d.sets} เซต · {d.minutes} นาที{over ? " ⚠" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="glass p-4 mb-3">
                <Kicker>สมดุลรูปแบบการเคลื่อนไหว</Kicker>
                {analysis.patterns.map((p) => (
                  <div key={p.pattern} className="flex items-center justify-between gap-2 py-[5px] text-[12px]">
                    <span style={{ color: "var(--mut)" }}>{PATTERN_TH[p.pattern]}</span>
                    <span className="font-mono2 text-[11px]" style={{ color: "var(--ink)" }}>
                      {p.sets} เซต
                    </span>
                  </div>
                ))}
              </div>

              {analysis.issues.length > 0 && (
                <div className="glass p-4 mb-3">
                  <Kicker>จุดที่ตรวจพบ</Kicker>
                  {analysis.issues.map((s, i) => (
                    <div key={i} className="text-[11.5px] py-[5px] leading-relaxed" style={{ color: "var(--mut)" }}>
                      · {s}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
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
