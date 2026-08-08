// หน้าต่างดูรายละเอียดแรงค์ — กดจากแถบ E→S เพื่อดูว่าแต่ละระดับหน้าตาเป็นยังไงและต้องยกเท่าไหร่
//
// ทำไมต้องมี: แถบ E→S บอกได้แค่ว่า "อยู่ตรงไหน" แต่ไม่บอกว่า "อีกไกลแค่ไหน"
// คนที่เห็นตัวเองอยู่ C แล้วไม่รู้ว่า B ต้องยกเท่าไหร่ ก็ไม่มีเป้าให้ไล่
// จึงแสดงเกณฑ์เป็น "กิโลจริง" ด้วย ไม่ใช่แค่เท่าของน้ำหนักตัว — คนคิดเป็นกิโล ไม่ได้คิดเป็นอัตราส่วน

import { useEffect, useState } from "react";
import type { Rank } from "../lib/rank";
import type { RankResult } from "../lib/rank";
import { RANKS, RANK_COLOR, RANK_TH, requirementFor } from "../lib/rank";
import RankEmblem from "./RankEmblem";

export default function RankPeek({
  rank,
  res,
  onPick,
  onClose,
}: {
  rank: Rank;
  res: RankResult;
  onPick: (r: Rank) => void;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(onClose, 200);
    return () => window.clearTimeout(t);
  }, [closing, onClose]);

  const c = RANK_COLOR[rank];
  const reqs = requirementFor(rank);
  const bw = res.bodyweight;
  const mine = new Map(res.lifts.map((l) => [l.label, l]));
  const isMine = res.rank === rank;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{
        background: "radial-gradient(70% 50% at 50% 45%, #0a0f2ae6, #01030af2 70%)",
        backdropFilter: "blur(3px)",
        opacity: closing ? 0 : 1,
        transition: "opacity .2s",
      }}
      onClick={() => setClosing(true)}
      role="dialog"
    >
      <div className="sys-win relative w-full" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div
          className="relative"
          style={{
            padding: 1.5,
            clipPath: "var(--cut-path)",
            background: `linear-gradient(150deg, ${c}, ${c}55 55%, ${c})`,
            boxShadow: `0 0 40px ${c}59`,
          }}
        >
          <div
            className="relative overflow-hidden px-5 pt-4 pb-4 text-center"
            style={{ clipPath: "var(--cut-path)", background: "linear-gradient(168deg, #0b1130fa, #04061198)" }}
          >
            <div className="font-mono2 text-[9.5px] tracking-[.36em]" style={{ color: c }}>
              RANK {rank}
            </div>

            <div className="flex justify-center my-1">
              <RankEmblem rank={rank} size={124} />
            </div>

            <div className="font-disp font-bold text-[22px] leading-none" style={{ color: "#fff", textShadow: `0 0 22px ${c}b3` }}>
              {RANK_TH[rank]}
            </div>
            {isMine && (
              <div className="font-mono2 text-[9px] tracking-[.2em] mt-1.5" style={{ color: c }}>
                ระดับของคุณตอนนี้
              </div>
            )}

            <div style={{ height: 1, margin: "12px 0 10px", background: `linear-gradient(90deg, transparent, ${c}, transparent)` }} />

            {reqs.length === 0 ? (
              <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
                ระดับเริ่มต้น — ทุกคนเริ่มจากตรงนี้ ยังไม่มีเกณฑ์ที่ต้องผ่าน
              </p>
            ) : (
              <>
                <div className="font-mono2 text-[8.5px] uppercase tracking-[.2em] mb-1.5 text-left" style={{ color: "var(--mut)" }}>
                  เกณฑ์ 1RM ที่ต้องถึง
                </div>
                {reqs.map((q) => {
                  const has = mine.get(q.label);
                  const need = bw ? Math.round(q.ratio * bw) : null;
                  const passed = has ? has.ratio >= q.ratio : false;
                  return (
                    <div key={q.label} className="flex items-baseline justify-between gap-2 py-[3px] text-[12px]">
                      <span style={{ color: "var(--mut)" }}>{q.label}</span>
                      <span className="font-mono2 text-[11px]" style={{ color: passed ? "var(--good)" : "var(--ink)" }}>
                        {q.ratio}×{need != null && ` · ${need} kg`}
                        {has && <span style={{ color: passed ? "var(--good)" : "var(--dim)" }}> {passed ? "✓" : `(ตอนนี้ ${has.oneRM})`}</span>}
                      </span>
                    </div>
                  );
                })}
                <p className="text-[10px] mt-2 leading-relaxed text-left" style={{ color: "var(--dim)" }}>
                  {bw
                    ? `คิดจากน้ำหนักตัว ${bw} kg · แรงค์รวมใช้ค่าเฉลี่ยของท่าหลักที่มีข้อมูล ไม่ต้องผ่านครบทุกท่า`
                    : "บันทึกน้ำหนักตัวแล้วจะเห็นเกณฑ์เป็นกิโลจริง"}
                </p>
              </>
            )}

            {/* เลื่อนดูระดับอื่นได้ในหน้าต่างเดียว ไม่ต้องปิดแล้วกดใหม่ทีละอัน */}
            <div className="flex gap-1 mt-3">
              {RANKS.map((r) => (
                <button
                  key={r}
                  className="flex-1 font-mono2 text-[10px] py-1.5"
                  style={{
                    color: r === rank ? "#050a18" : RANK_COLOR[r],
                    background: r === rank ? RANK_COLOR[r] : `color-mix(in srgb, ${RANK_COLOR[r]} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${RANK_COLOR[r]} 34%, transparent)`,
                    clipPath: "var(--cut-path-sm)",
                  }}
                  onClick={() => onPick(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              className="font-mono2 text-[9.5px] tracking-[.24em] mt-3 px-4 py-2"
              style={{
                color: c,
                background: "transparent",
                border: `1px solid color-mix(in srgb, ${c} 38%, transparent)`,
                clipPath: "var(--cut-path-sm)",
              }}
              onClick={() => setClosing(true)}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
