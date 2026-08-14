// แรงค์ความแข็งแรง + สถิติสูงสุดทุกท่า — กดแชร์เป็นรูปได้
//
// แรงค์คิดจากอัตราส่วน 1RM ต่อน้ำหนักตัว ซึ่งเป็นตัวเดียวที่เทียบข้ามคนได้จริง
// (ปริมาณเซตหรือจำนวนวันที่มายิมเทียบกันไม่ได้ คนตัวใหญ่ยกหนักกว่าเป็นเรื่องธรรมดา)

import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Rank } from "../lib/rank";
import { RANKS, RANK_COLOR, bestLifts, computeRank, rankName } from "../lib/rank";
import { deleteBestRecord, normName } from "../lib/store";
import { shareBestLiftsCard, shareRankCard } from "../lib/share";
import { exText, setsText, t } from "../lib/i18n";
import { Kicker } from "./ui";
import RankEmblem from "./RankEmblem";
import RankPeek from "./RankPeek";

const SHOW = 6;

export default function RankCard() {
  const { data, update, toast, goTab } = useApp();
  const res = useMemo(() => computeRank(data), [data]);
  const lifts = useMemo(() => bestLifts(data), [data]);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState<Rank | null>(null);

  if (!lifts.length) return null;

  // แชร์แยกสองใบ: แรงค์ (แข็งแรงแค่ไหน) กับสถิติสูงสุด (เคยยกอะไรได้บ้าง)
  // เป็นคนละเรื่องและคนอยากแชร์คนละโอกาส ยัดรวมใบเดียวกลายเป็นกำแพงตัวเลข
  const share = async (kind: "rank" | "best") => {
    setBusy(true);
    const r = await (kind === "rank" ? shareRankCard(data) : shareBestLiftsCard(data));
    setBusy(false);
    toast(
      r === "shared" ? t("แชร์แล้ว", "Shared") : r === "downloaded" ? t("บันทึกรูปแล้ว", "Image saved") : t("แชร์ไม่สำเร็จ", "Share failed"),
      r !== "failed",
    );
  };

  // ลบสถิติที่กรอกผิด — บอกล่วงหน้าว่าลบแล้วสถิติใหม่จะเป็นเท่าไหร่
  //
  // ลองลบในสำเนาก่อนแล้วคำนวณจริงเพื่อเอามาบอกในกล่องยืนยัน คนกรอกผิดมักไม่แน่ใจว่า
  // "ลบแล้วจะเหลืออะไร" ถ้าถามแค่ "แน่ใจไหม" เขาจะไม่กล้ากดแล้วปล่อยเลขผิดไว้อย่างนั้น
  const removeRecord = (l: (typeof lifts)[number]) => {
    const probe = structuredClone(data);
    deleteBestRecord(probe, l.name, l.weight, l.date);
    const after = bestLifts(probe).find((x) => normName(x.name) === normName(l.name));
    const nextLine = after
      ? t(`สถิติใหม่จะเป็น ${after.weight} ${after.unit} × ${after.reps}`, `New best becomes ${after.weight} ${after.unit} × ${after.reps}`)
      : t("ท่านี้จะไม่มีสถิติเหลือ (หลุดออกจากรายการ)", "This exercise will have no record left and drops off the list");

    if (!confirm(`${t(`ลบสถิติ ${l.name} ${l.weight} ${l.unit} × ${l.reps}?`, `Delete ${l.name} ${l.weight} ${l.unit} × ${l.reps}?`)}\n\n${nextLine}`)) return;

    update((d) => deleteBestRecord(d, l.name, l.weight, l.date));
    toast(t("ลบสถิตินั้นแล้ว", "Record deleted"));
  };

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{exText(lifts.length)}</span>}>
        {t("แรงค์ความแข็งแรง", "Strength rank")}
      </Kicker>

      <div className="flex items-center gap-3 mb-3">
        <button className="shrink-0" onClick={() => setPeek(res.rank ?? "E")} aria-label={t("ดูรายละเอียดแรงค์", "View rank details")}>
          <RankEmblem rank={res.rank} size={104} />
        </button>
        <div className="min-w-0 flex-1">
          {res.rank ? (
            <>
              <div className="font-disp font-bold text-[17px] leading-snug" style={{ color: "var(--ink)" }}>
                {rankName(res.rank)}
              </div>
              <div className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
                {t(
                  `เทียบน้ำหนักตัว ${res.bodyweight} kg · จาก ${res.lifts.length} ท่าหลัก`,
                  `Against ${res.bodyweight} kg bodyweight · from ${res.lifts.length} main lifts`,
                )}
              </div>
            </>
          ) : (
            <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
              {t(
                "ยังประเมินแรงค์ไม่ได้ — ต้องมีน้ำหนักตัวและท่าหลักอย่างน้อย 2 ท่า",
                "Can't rank you yet — needs your bodyweight and at least 2 of the main lifts",
              )}
              {res.missing.length > 0 && t(` (ยังขาด ${res.missing.join(" · ")})`, ` (missing ${res.missing.join(" · ")})`)}
            </div>
          )}
        </div>
      </div>

      {/* แถบระดับ E→S ให้เห็นว่าอยู่ตรงไหนและอีกไกลแค่ไหน · กดดูเกณฑ์ของแต่ละระดับได้ */}
      <div className="flex gap-1 mb-1.5">
        {RANKS.map((r) => {
          const on = res.rank === r;
          const passed = res.rank ? RANKS.indexOf(r) <= RANKS.indexOf(res.rank) : false;
          return (
            <button
              key={r}
              className="flex-1 text-center font-mono2 text-[10px] py-1"
              style={{
                color: on ? "#050a18" : passed ? RANK_COLOR[r] : "var(--dim)",
                background: on ? RANK_COLOR[r] : passed ? `color-mix(in srgb, ${RANK_COLOR[r]} 16%, transparent)` : "rgba(10,20,31,.5)",
                border: `1px solid ${passed ? `color-mix(in srgb, ${RANK_COLOR[r]} 40%, transparent)` : "var(--edge)"}`,
              }}
              onClick={() => setPeek(r)}
              aria-label={t(`ดูแรงค์ ${r}`, `View rank ${r}`)}
            >
              {r}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] mb-3 text-center" style={{ color: "var(--dim)" }}>
        {t("กดที่ตัวอักษรเพื่อดูตราและเกณฑ์ของแต่ละระดับ", "Tap a letter to see its emblem and requirements")}
      </p>

      {res.lifts.length > 0 && (
        <div className="glass-inset p-3 mb-2.5">
          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            {t("ท่าหลัก · 1RM ประเมิน / น้ำหนักตัว", "Main lifts · est. 1RM / bodyweight")}
          </div>
          {res.lifts.map((l) => (
            <div key={l.key} className="flex items-baseline justify-between gap-2 py-[3px] text-[12px]">
              <span style={{ color: "var(--mut)" }}>{l.label}</span>
              <span className="font-mono2 text-[11px]" style={{ color: RANK_COLOR[l.rank] }}>
                {l.oneRM} kg · {l.ratio}× · {l.rank}
              </span>
            </div>
          ))}
        </div>
      )}

      <button className="btn-cy w-full !py-2.5 !text-[12.5px] mb-1" onClick={() => share("rank")} disabled={busy}>
        {busy ? t("กำลังสร้างรูป…", "Building image…") : t("แชร์แรงค์ + ท่าหลัก", "Share rank + main lifts")}
      </button>
      <p className="text-[10px] mb-3 text-center leading-relaxed" style={{ color: "var(--dim)" }}>
        {t(
          "การ์ดจะโชว์จำนวนวันที่ฝึกจริงคู่ไปด้วย — คนดูจะได้แยกออกว่าใครฝึกมาจริง",
          "The card shows how many days you've actually trained — so people can tell the real ones apart",
        )}
      </p>

      <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-1.5" style={{ color: "var(--mut)" }}>
        {t("สถิติสูงสุดที่เคยทำ", "All-time bests")}
      </div>
      {(all ? lifts : lifts.slice(0, SHOW)).map((l) => (
        <div key={l.name} className="flex items-baseline gap-2 py-[3px] text-[12px]">
          <span className="truncate flex-1 min-w-0" style={{ color: "var(--ink)" }}>
            {l.name}
          </span>
          <span className="font-mono2 text-[10.5px] shrink-0" style={{ color: "var(--acc)" }}>
            {l.weight} {l.unit} × {l.reps} · {setsText(l.sets)}
          </span>
          {/* ลบสถิติที่กรอกผิดออกทีละอัน — ไม่ต้องทิ้งประวัติทั้งท่าเหมือนเมื่อก่อน */}
          <button
            className="shrink-0 px-1 leading-none"
            style={{ color: "var(--dim)", background: "none", border: "none" }}
            aria-label={t(`ลบสถิติ ${l.name}`, `Delete ${l.name} record`)}
            onClick={() => removeRecord(l)}
          >
            ✕
          </button>
        </div>
      ))}
      {lifts.length > SHOW && (
        <button className="btn-gh w-full !py-2 !text-[11.5px] mt-2" onClick={() => setAll((v) => !v)}>
          {all ? t("ย่อ", "Show less") : t(`ดูทั้งหมด ${lifts.length} ท่า`, `Show all ${lifts.length}`)}
        </button>
      )}

      <button className="btn-gh w-full !py-2.5 !text-[12px] mt-2" onClick={() => share("best")} disabled={busy}>
        {busy ? t("กำลังสร้างรูป…", "Building image…") : t(`แชร์สถิติสูงสุด ${lifts.length} ท่า`, `Share ${lifts.length} personal bests`)}
      </button>

      {!res.bodyweight && (
        <button className="btn-gh w-full !py-2 !text-[11px] mt-2" onClick={() => goTab("progress")}>
          {t("บันทึกน้ำหนักตัวก่อนถึงจะประเมินแรงค์ได้", "Log your bodyweight to get ranked")}
        </button>
      )}
      <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>
        {t(
          "แรงค์เป็นค่าประเมินจากมาตรฐานความแข็งแรงที่ใช้อ้างอิงกันทั่วไป (อิงผู้ชายเป็นหลัก) ไม่ใช่การวัดที่แม่นยำ — ใช้ดูพัฒนาการของตัวเองเทียบกับตัวเองดีที่สุด",
          "Rank is an estimate based on commonly used strength standards (which skew male), not a precise measurement — it's most useful for tracking yourself against yourself.",
        )}
      </p>

      {peek && <RankPeek rank={peek} res={res} onPick={setPeek} onClose={() => setPeek(null)} />}
    </div>
  );
}
