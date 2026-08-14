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
import { muscleName, patternName } from "../lib/muscles";
import { useApp } from "../AppContext";
import type { Recommendation } from "../lib/analyzer";
import { analyzeProgram, applyRecommendation, buildRecommendations } from "../lib/analyzer";
import { slotName } from "../lib/loop";
import { getMaxSetsPerSession, getTimeCap, getVolumeTarget } from "../lib/profile";
import { minText, setsText, t } from "../lib/i18n";
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
    toast(t(`${rec.title} แล้ว`, `Done — ${rec.title.toLowerCase()}`));
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
            {t("ยังไม่มีท่าให้วิเคราะห์", "Nothing to analyze yet")}
          </div>
          <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--mut)" }}>
            {t(
              "เพิ่มท่าแรกหรือวางตารางที่เขียนไว้ แล้วหน้านี้จะบอกว่าตารางขาดอะไรและควรแก้ตรงไหน",
              "Add your first exercise or paste in a program you've already written, and this page will tell you what's missing and what to fix.",
            )}
          </p>
          <button className="btn-cy w-full !py-2.5 !text-[12.5px]" onClick={() => goTab("manage")}>
            {t("ไปเพิ่มท่า", "Add exercises")}
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
        <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{t(`เพดาน ${analysis.ceiling}`, `Ceiling ${analysis.ceiling}`)}</span>}>
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
                ? t("ตารางนี้ทำได้เต็มที่แล้วภายใต้วันฝึกและเวลาที่มี", "This is as good as it gets with the days and time you have")
                : t(`ยังปรับได้อีก ${analysis.ceiling - analysis.execution} คะแนน`, `${analysis.ceiling - analysis.execution} points still on the table`)}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. สิ่งที่ทำได้ตอนนี้ — ต้องอยู่บนสุดรองจากคะแนน ── */}
      {!premium ? (
        <PremiumLock
          label={t(
            `เจอ ${analysis.issues.length} จุดที่ควรแก้ — ปลดล็อกเพื่อดูว่าคืออะไรและแก้ยังไง`,
            `${analysis.issues.length} things worth fixing — unlock to see what they are and how to fix them`,
          )}
        >
          <div className="glass p-4 mb-3">
            <Kicker>{t("ปรับตารางให้ดีขึ้น", "Improve your program")}</Kicker>
            <div className="h-24" />
          </div>
        </PremiumLock>
      ) : recommendations.length > 0 ? (
        <div className="glass p-4 mb-3">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{t("ไม่ทำก็ได้", "optional")}</span>}>
            {t("ปรับตารางให้ดีขึ้น", "Improve your program")}
          </Kicker>
          <p className="text-[11px] -mt-1 mb-2" style={{ color: "var(--dim)" }}>
            {t(
              "ผ่านการตรวจอุปกรณ์ · เวลา · เพดานเซต · ระยะฟื้นตัว แล้วทุกข้อ",
              "Every one is checked against your equipment · time · set cap · recovery gaps",
            )}
          </p>
          {recommendations.map((rec) => {
            const accent = rec.priority === "high" ? "var(--acc)" : rec.priority === "medium" ? "var(--blue)" : "var(--warn)";
            const verb =
              rec.kind === "reduceSets"
                ? t("ลด", "Cut")
                : rec.kind === "splitDay"
                  ? t("แยกวัน", "Split")
                  : rec.kind === "moveExercise"
                    ? t("ย้าย", "Move")
                    : rec.kind === "addDay"
                      ? t("สร้างวัน", "Add day")
                      : rec.kind === "reorder"
                        ? t("จัดใหม่", "Reorder")
                        : rec.kind === "buildProgram"
                          ? t("สร้างเลย", "Build it")
                          : t("เพิ่ม", "Add");
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
            {t("ไม่มีอะไรต้องแก้แล้ว", "Nothing left to fix")}
          </div>
          <div className="text-[12px] leading-relaxed" style={{ color: "var(--mut)" }}>
            {t(
              "ทุกกลุ่มอยู่ในเป้าและตารางสมดุลแล้ว — จากนี้โฟกัสที่การเพิ่มน้ำหนักต่อเนื่องแทน",
              "Every muscle group is on target and the program is balanced — from here, focus on adding weight consistently.",
            )}
          </div>
        </div>
      ) : null}

      {/* ── ปัญหาที่ตารางนี้แก้เองไม่ได้ — เป็นต้นเหตุจริง ไม่ใช่สิ่งที่กดปุ่มแล้วหาย ── */}
      {premium && analysis.blockedInsights.length > 0 && (
        <div className="glass p-4 mb-3" style={{ borderColor: "rgba(255,193,94,.28)" }}>
          <Kicker>{t("ติดข้อจำกัดของตาราง", "Limits of this program")}</Kicker>
          {analysis.blockedInsights.map((b, i) => (
            <div key={i} className="py-2 hairline first:border-0">
              <b className="block text-[12.5px]" style={{ color: "var(--warn)" }}>
                {b.issue}
              </b>
              <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
                {b.whyCannotFix}
              </span>
              <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: "var(--ink)" }}>
                {t("ทางแก้จริง:", "Real fix:")} {b.realSolution}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. ปริมาณต่อกล้ามเนื้อ — เห็นครบทุกมัดในตาเดียว ── */}
      {premium && (
        <div className="glass p-4 mb-3">
          <Kicker
            right={
              <span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
                {t(`เป้า ${target.min}-${target.max} เซต/สัปดาห์`, `Target ${target.min}-${target.max} sets/week`)}
              </span>
            }
          >
            {t("ปริมาณต่อกล้ามเนื้อ", "Volume per muscle")}
          </Kicker>
          <div className="grid grid-cols-2 gap-x-4 gap-y-[9px]">
            {analysis.stats.map((s) => {
              const c = s.status === "good" ? "var(--acc)" : s.status === "high" ? "var(--good)" : "var(--warn)";
              return (
                <div key={s.muscle} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                    <span className="truncate" style={{ color: "var(--mut)" }}>
                      {muscleName(s.muscle)}
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
            {showDetail
              ? t("ซ่อนรายละเอียด", "Hide details")
              : t("ดูรายละเอียด — ภาระรายวัน · สมดุลท่า", "Show details — daily load · movement balance")}
          </button>

          {showDetail && (
            <>
              <div className="glass p-4 mb-3">
                <Kicker
                  right={
                    <span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
                      {t(`สูงสุด ${maxSets} เซต · ${timeCap} นาที`, `Max ${maxSets} sets · ${timeCap} min`)}
                    </span>
                  }
                >
                  {t("ภาระแต่ละวัน", "Load per day")}
                </Kicker>
                {analysis.dayLoads.map((d) => {
                  const over = d.overSets || d.overTime;
                  return (
                    <div key={d.day} className="flex items-center justify-between gap-2 py-[5px] text-[12px]">
                      <span style={{ color: "var(--mut)" }}>{slotName(data, d.day)}</span>
                      <span className="font-mono2 text-[11px]" style={{ color: over ? "var(--warn)" : "var(--ink)" }}>
                        {setsText(d.sets)} · {minText(d.minutes)}
                        {over ? " ⚠" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="glass p-4 mb-3">
                <Kicker>{t("สมดุลรูปแบบการเคลื่อนไหว", "Movement pattern balance")}</Kicker>
                {analysis.patterns.map((p) => (
                  <div key={p.pattern} className="flex items-center justify-between gap-2 py-[5px] text-[12px]">
                    <span style={{ color: "var(--mut)" }}>{patternName(p.pattern)}</span>
                    <span className="font-mono2 text-[11px]" style={{ color: "var(--ink)" }}>
                      {setsText(p.sets)}
                    </span>
                  </div>
                ))}
              </div>

              {analysis.issues.length > 0 && (
                <div className="glass p-4 mb-3">
                  <Kicker>{t("จุดที่ตรวจพบ", "What we found")}</Kicker>
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
