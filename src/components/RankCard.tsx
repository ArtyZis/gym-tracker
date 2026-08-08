// แรงค์ความแข็งแรง + สถิติสูงสุดทุกท่า — กดแชร์เป็นรูปได้
//
// แรงค์คิดจากอัตราส่วน 1RM ต่อน้ำหนักตัว ซึ่งเป็นตัวเดียวที่เทียบข้ามคนได้จริง
// (ปริมาณเซตหรือจำนวนวันที่มายิมเทียบกันไม่ได้ คนตัวใหญ่ยกหนักกว่าเป็นเรื่องธรรมดา)

import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Rank } from "../lib/rank";
import { RANKS, RANK_COLOR, RANK_TH, bestLifts, computeRank } from "../lib/rank";
import { shareBestLiftsCard, shareRankCard } from "../lib/share";
import { Kicker } from "./ui";
import RankEmblem from "./RankEmblem";
import RankPeek from "./RankPeek";

const SHOW = 6;

export default function RankCard() {
  const { data, toast, goTab } = useApp();
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
    toast(r === "shared" ? "แชร์แล้ว" : r === "downloaded" ? "บันทึกรูปแล้ว" : "แชร์ไม่สำเร็จ", r !== "failed");
  };

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{lifts.length} ท่า</span>}>
        แรงค์ความแข็งแรง
      </Kicker>

      <div className="flex items-center gap-3 mb-3">
        <button className="shrink-0" onClick={() => setPeek(res.rank ?? "E")} aria-label="ดูรายละเอียดแรงค์">
          <RankEmblem rank={res.rank} size={104} />
        </button>
        <div className="min-w-0 flex-1">
          {res.rank ? (
            <>
              <div className="font-disp font-bold text-[17px] leading-snug" style={{ color: "var(--ink)" }}>
                {RANK_TH[res.rank]}
              </div>
              <div className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
                เทียบน้ำหนักตัว {res.bodyweight} kg · จาก {res.lifts.length} ท่าหลัก
              </div>
            </>
          ) : (
            <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
              ยังประเมินแรงค์ไม่ได้ — ต้องมีน้ำหนักตัวและท่าหลักอย่างน้อย 2 ท่า
              {res.missing.length > 0 && ` (ยังขาด ${res.missing.join(" · ")})`}
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
              aria-label={`ดูแรงค์ ${r}`}
            >
              {r}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] mb-3 text-center" style={{ color: "var(--dim)" }}>
        กดที่ตัวอักษรเพื่อดูตราและเกณฑ์ของแต่ละระดับ
      </p>

      {res.lifts.length > 0 && (
        <div className="glass-inset p-3 mb-2.5">
          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            ท่าหลัก · 1RM ประเมิน / น้ำหนักตัว
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
        {busy ? "กำลังสร้างรูป…" : "แชร์แรงค์ + ท่าหลัก"}
      </button>
      <p className="text-[10px] mb-3 text-center leading-relaxed" style={{ color: "var(--dim)" }}>
        การ์ดจะโชว์จำนวนวันที่ฝึกจริงคู่ไปด้วย — คนดูจะได้แยกออกว่าใครฝึกมาจริง
      </p>

      <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-1.5" style={{ color: "var(--mut)" }}>
        สถิติสูงสุดที่เคยทำ
      </div>
      {(all ? lifts : lifts.slice(0, SHOW)).map((l) => (
        <div key={l.name} className="flex items-baseline justify-between gap-2 py-[3px] text-[12px]">
          <span className="truncate" style={{ color: "var(--ink)" }}>
            {l.name}
          </span>
          <span className="font-mono2 text-[10.5px] shrink-0" style={{ color: "var(--acc)" }}>
            {l.weight} {l.unit} × {l.reps} · {l.sets} เซต
          </span>
        </div>
      ))}
      {lifts.length > SHOW && (
        <button className="btn-gh w-full !py-2 !text-[11.5px] mt-2" onClick={() => setAll((v) => !v)}>
          {all ? "ย่อ" : `ดูทั้งหมด ${lifts.length} ท่า`}
        </button>
      )}

      <button className="btn-gh w-full !py-2.5 !text-[12px] mt-2" onClick={() => share("best")} disabled={busy}>
        {busy ? "กำลังสร้างรูป…" : `แชร์สถิติสูงสุด ${lifts.length} ท่า`}
      </button>

      {!res.bodyweight && (
        <button className="btn-gh w-full !py-2 !text-[11px] mt-2" onClick={() => goTab("progress")}>
          บันทึกน้ำหนักตัวก่อนถึงจะประเมินแรงค์ได้
        </button>
      )}
      <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>
        แรงค์เป็นค่าประเมินจากมาตรฐานความแข็งแรงที่ใช้อ้างอิงกันทั่วไป (อิงผู้ชายเป็นหลัก)
        ไม่ใช่การวัดที่แม่นยำ — ใช้ดูพัฒนาการของตัวเองเทียบกับตัวเองดีที่สุด
      </p>

      {peek && <RankPeek rank={peek} res={res} onPick={setPeek} onClose={() => setPeek(null)} />}
    </div>
  );
}
