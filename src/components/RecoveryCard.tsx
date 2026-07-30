// การนอน + โภชนาการ — ปัจจัยนอกยิมที่ตัดสินผลลัพธ์มากกว่าตัวโปรแกรม
//
// จงใจทำให้กรอกง่ายที่สุด: การนอนกรอกเลขเดียว การกินติ๊กปุ่มเดียว
// ไม่ทำระบบบันทึกอาหารรายมื้อเพราะไม่มีใครทำต่อเนื่องได้จริง แล้วข้อมูลขาดๆ หายๆ
// ก็สรุปอะไรไม่ได้อยู่ดี — ข้อมูลหยาบที่มีทุกวันมีค่ากว่าข้อมูลละเอียดที่มีอาทิตย์ละครั้ง

import { useState } from "react";
import { useApp } from "../AppContext";
import { DAY_TH, todayStr } from "../lib/store";
import {
  MIN_DAYS_FOR_TREND,
  SHORT_NIGHT_HOURS,
  bedtimeFor,
  estimateTDEE,
  nutritionHit,
  nutritionStreak,
  sleepSummary,
  tomorrowKey,
  weightAdvice,
  weightTrend,
} from "../lib/recovery";
import { Kicker } from "./ui";

const TONE_COLOR = { ok: "var(--acc)", fast: "var(--warn)", slow: "var(--warn)", wait: "var(--mut)" } as const;

export default function RecoveryCard() {
  const { data, update, toast } = useApp();
  const [hours, setHours] = useState("");

  const sleep = sleepSummary(data);
  const trend = weightTrend(data);
  const advice = weightAdvice(data);
  const streak = nutritionStreak(data);
  const hitToday = nutritionHit(data);
  const tomorrow = tomorrowKey();
  const bed = bedtimeFor(data, tomorrow);
  const tdee = estimateTDEE(data);
  const target = data.profile?.nutrition;

  const logSleep = (h: number) => {
    if (!(h > 0) || h > 16) return;
    update((d) => {
      const log = d.sleepLog ?? [];
      const i = log.findIndex((s) => s.date === todayStr());
      if (i >= 0) log[i] = { date: todayStr(), hours: h };
      else log.push({ date: todayStr(), hours: h });
      d.sleepLog = log;
    });
    setHours("");
    toast(`บันทึกนอน ${h} ชม.`);
  };

  const logNutrition = (hit: boolean) => {
    update((d) => {
      const log = d.nutritionLog ?? [];
      const i = log.findIndex((n) => n.date === todayStr());
      if (i >= 0) log[i] = { date: todayStr(), hit };
      else log.push({ date: todayStr(), hit });
      d.nutritionLog = log;
    });
    toast(hit ? "กินถึงเป้าวันนี้ ✓" : "บันทึกว่ายังไม่ถึงเป้า");
  };

  const pill = (on: boolean) =>
    ({
      background: on ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,20,31,.6)",
      color: on ? "#031420" : "var(--mut)",
      border: on ? "none" : "1px solid var(--edge)",
      borderRadius: 10,
      padding: "6px 12px",
      fontSize: 12,
    }) as const;

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          streak > 0 ? (
            <span className="font-mono2 text-[9px]" style={{ color: "var(--acc)" }}>
              กินถึงเป้า {streak} วันติด
            </span>
          ) : undefined
        }
      >
        การฟื้นตัว
      </Kicker>

      {/* ── การนอน ── */}
      <div className="glass-inset p-3 mb-2">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono2 text-[9px] uppercase tracking-[.16em]" style={{ color: "var(--mut)" }}>
            การนอน
          </span>
          <span className="font-mono2 text-[11px]" style={{ color: sleep.underRecovered ? "var(--warn)" : "var(--ink)" }}>
            {sleep.avg7 != null ? `เฉลี่ย 7 วัน ${sleep.avg7} ชม.` : "ยังไม่มีข้อมูล"}
            {sleep.shortNights > 0 && ` · ต่ำกว่า ${SHORT_NIGHT_HOURS} ชม. ${sleep.shortNights} คืน`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: "var(--mut)" }}>
            คืนที่ผ่านมานอนกี่ชม.
          </span>
          <input
            className="font-mono2 text-[13px] text-center"
            style={{ background: "rgba(10,20,31,.6)", border: "1px solid var(--edge)", color: "var(--ink)", borderRadius: 9, padding: "6px 4px", width: 64 }}
            type="number"
            step="0.5"
            inputMode="decimal"
            value={hours}
            placeholder="7.5"
            onChange={(e) => setHours(e.target.value)}
          />
          <button className="btn-gh !py-1.5 !px-3 !text-[11px]" onClick={() => logSleep(parseFloat(hours))}>
            บันทึก
          </button>
        </div>

        {sleep.underRecovered && (
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--warn)" }}>
            นอนน้อยติดกันหลายคืน — ระบบจะหยุดเสนอเพิ่มปริมาณจนกว่าจะฟื้นตัวได้ทัน
            เพราะเพิ่มตอนนี้ไม่ทำให้โตขึ้น แต่ล้าสะสมและเสี่ยงบาดเจ็บ
          </p>
        )}

        {bed && (
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--mut)" }}>
            พรุ่งนี้ ({DAY_TH[tomorrow]}) มีภาระเช้า — ควรเข้านอนราว{" "}
            <span className="font-mono2" style={{ color: "var(--acc)" }}>
              {bed}
            </span>{" "}
            เพื่อให้ได้ 8 ชม.
          </p>
        )}
      </div>

      {/* ── โภชนาการ ── */}
      <div className="glass-inset p-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono2 text-[9px] uppercase tracking-[.16em]" style={{ color: "var(--mut)" }}>
            การกิน
          </span>
          <span className="font-mono2 text-[11px]" style={{ color: "var(--ink)" }}>
            {target ? `เป้า ${target.kcal} kcal · โปรตีน ${target.protein} ก.` : "ยังไม่ตั้งเป้า"}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] flex-1" style={{ color: "var(--mut)" }}>
            วันนี้กินถึงเป้าไหม
          </span>
          <button style={pill(hitToday === true)} onClick={() => logNutrition(true)}>
            ถึง
          </button>
          <button style={pill(hitToday === false)} onClick={() => logNutrition(false)}>
            ยังไม่ถึง
          </button>
        </div>

        {!target && tdee != null && (
          <button
            className="btn-gh w-full !py-2 !text-[11.5px] mb-2"
            onClick={() => {
              // lean bulk: TDEE + 300 kcal · โปรตีน 2.0 ก./กก. น้ำหนักตัว
              const scan = [...data.bodyScans].sort((a, b) => a.date.localeCompare(b.date)).pop();
              const kg = scan?.weightKg ?? data.bodyweight[data.bodyweight.length - 1]?.kg ?? 60;
              update((d) => {
                d.profile = { ...d.profile, nutrition: { kcal: tdee + 300, protein: Math.round(kg * 2) } };
              });
              toast("ตั้งเป้าจาก TDEE แล้ว");
            }}
          >
            คำนวณจากผลสแกน (TDEE ~{tdee} kcal) → ตั้งเป้า lean bulk
          </button>
        )}

        <p className="text-[11.5px] leading-relaxed" style={{ color: TONE_COLOR[advice.tone] }}>
          {advice.msg}
        </p>
        {!trend.enough && (
          <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color: "var(--dim)" }}>
            ชั่งน้ำหนักทุกเช้าหลังเข้าห้องน้ำก่อนกินอะไร — ครบ {MIN_DAYS_FOR_TREND} วันแล้วระบบจะบอกได้ว่าควรเพิ่มหรือลดแคล
          </p>
        )}
      </div>
    </div>
  );
}
