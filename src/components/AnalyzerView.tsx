import { useMemo } from "react";
import { useApp } from "../AppContext";
import type { Recommendation } from "../lib/analyzer";
import { MUSCLE_TH, analyzeProgram, applyRecommendation, buildRecommendations } from "../lib/analyzer";
import { Kicker, PremiumLock } from "./ui";
import { isPremium } from "../lib/premium";

export default function AnalyzerView() {
  const { data, update, toast } = useApp();

  const analysis = useMemo(() => analyzeProgram(data), [data]);
  const recommendations = useMemo(() => buildRecommendations(data, analysis), [data, analysis]);

  function applyRec(rec: Recommendation) {
    update((d) => applyRecommendation(d, rec));
    toast(rec.title + " แล้ว");
  }

  const scoreColor =
    analysis.score >= 85
      ? "var(--good)"
      : analysis.score >= 60
        ? "var(--cyan)"
        : analysis.score >= 45
          ? "var(--warn)"
          : "var(--bad)";
  const circ = 2 * Math.PI * 34;
  const premium = isPremium(data);

  return (
    <div className="rise">
      <div className="glass p-5 mb-3 flex items-center gap-5 relative overflow-hidden">
        <div
          className="absolute pointer-events-none"
          style={{ top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, var(--acc-18), transparent 70%)" }}
        />
        <div className="relative w-[86px] h-[86px] shrink-0">
          <svg width="86" height="86" viewBox="0 0 86 86" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="43" cy="43" r={34} stroke="rgba(120,180,255,.13)" strokeWidth="7" fill="none" />
            <circle
              cx="43"
              cy="43"
              r={34}
              stroke={scoreColor}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - analysis.score / 100)}
              style={{ transition: "stroke-dashoffset .8s ease", filter: `drop-shadow(0 0 8px ${scoreColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-disp font-bold text-[24px] leading-none" style={{ color: scoreColor }}>
              {analysis.score}
            </span>
            <span className="font-mono2 text-[8px] mt-0.5" style={{ color: "var(--dim)" }}>
              /100
            </span>
          </div>
        </div>
        <div className="min-w-0 relative">
          <Kicker>Program Score</Kicker>
          <h2 className="font-disp font-bold text-[18px] leading-snug -mt-1">{analysis.headline}</h2>
          <p className="text-[12px] mt-1" style={{ color: "var(--mut)" }}>
            วิเคราะห์จาก volume ต่อกล้ามเนื้อ ความถี่ และความครอบคลุมทั้งสัปดาห์
          </p>
        </div>
      </div>

      {!premium && (
        <PremiumLock
          label={`เจอ ${analysis.issues.length} จุดที่ควรแก้ในโปรแกรมนี้ — ปลดล็อกเพื่อดูว่าคืออะไรและแก้ยังไง`}
        >
          <div className="glass p-4 mb-3">
            <Kicker>เซตต่อกล้ามเนื้อ / สัปดาห์</Kicker>
            {analysis.stats.slice(0, 6).map((s) => (
              <div key={s.muscle} className="mb-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12.5px]">{MUSCLE_TH[s.muscle]}</span>
                  <span className="font-mono2 text-[10.5px]" style={{ color: "var(--acc)" }}>
                    {s.sets} เซต
                  </span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(120,180,255,.10)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (s.sets / 26) * 100)}%`, background: "var(--acc)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PremiumLock>
      )}

      {premium && (
      <div className="glass p-4 mb-3">
        <Kicker>เซตต่อกล้ามเนื้อ / สัปดาห์</Kicker>
        {analysis.stats.map((s) => {
          const color =
            s.status === "good"
              ? "var(--acc)"
              : s.status === "low"
                ? "var(--warn)"
                : "var(--bad)";
          const width = Math.min(100, (s.sets / 26) * 100);
          return (
            <div key={s.muscle} className="mb-2.5">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[12.5px]">{MUSCLE_TH[s.muscle]}</span>
                <span className="font-mono2 text-[10.5px]" style={{ color }}>
                  {s.sets} เซต{s.days ? ` · ${s.days} วัน` : ""}
                  {s.status === "missing" && " · ไม่มี"}
                </span>
              </div>
              <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(120,180,255,.10)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, background: color, boxShadow: `0 0 8px ${color}`, transition: "width .6s ease" }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-[11px] mt-2" style={{ color: "var(--dim)" }}>
          โซนที่งานวิจัยรองรับ: 8-26 เซต/สัปดาห์ ต่อกล้ามเนื้อ · เกิน 26 ยังโตได้ แต่ผลตอบแทนเริ่มลด ·
          ท่า compound นับให้กล้ามรองครึ่งเซต · ท่าละ 3-5 เซตกำลังดี
        </p>
      </div>
      )}

      {premium && analysis.issues.length > 0 && (
        <div className="glass p-4 mb-3">
          <Kicker>จุดที่ตรวจพบ</Kicker>
          {analysis.issues.map((issue, i) => (
            <div key={i} className="flex gap-2.5 py-1.5 text-[13px]" style={{ color: "var(--ink)" }}>
              <span style={{ color: "var(--warn)" }}>▸</span>
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      {premium && recommendations.length > 0 && (
        <div className="glass p-4">
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "#4b8bb0" }}>แตะทำตามได้</span>}>คำแนะนำปรับโปรแกรม</Kicker>
          <p className="text-[11px] -mt-1 mb-2" style={{ color: "var(--dim)" }}>
            ทำตามจนครบ คะแนนจะเต็ม 100
          </p>
          {recommendations.map((rec) => {
            const accent =
              rec.kind === "reduceSets"
                ? "var(--warn)"
                : rec.kind === "removeExercise"
                  ? "var(--bad)"
                  : rec.kind === "restDay" || rec.kind === "moveExercise"
                    ? "var(--blue)"
                    : rec.kind === "addDay"
                      ? "var(--cyan)"
                      : "var(--good)";
            const verb =
              rec.kind === "reduceSets"
                ? "ลด"
                : rec.kind === "removeExercise"
                  ? "ตัด"
                  : rec.kind === "restDay" || rec.kind === "moveExercise"
                    ? "ย้าย"
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
      )}

      {premium && recommendations.length === 0 && (
        <div className="glass p-6 text-center rise" style={{ color: analysis.score >= 100 ? "var(--good)" : "var(--mut)" }}>
          <div className="text-[15px] font-disp font-bold mb-1">
            {analysis.score >= 100 ? "เต็ม 100 แล้ว 🎉" : "ไม่มีจุดที่ต้องปรับตอนนี้ 🎯"}
          </div>
          <div className="text-[12px]" style={{ color: "var(--mut)" }}>
            {analysis.score >= 100 ? "โปรแกรมสมดุลครบทุกด้าน" : "โปรแกรมครอบคลุมดีแล้ว"}
          </div>
        </div>
      )}
    </div>
  );
}
