// เครื่องคิดแผ่นน้ำหนัก — อยู่ในหน้าวันนี้เพราะเป็นสิ่งที่ต้องใช้ "ตอนยืนอยู่หน้าแร็ค"
//
// เดิมซ่อนอยู่ในแท็บจัดการซึ่งต้องกดออกจากหน้าที่กำลังบันทึกเซตอยู่ไปอีกหน้า
// แล้วกดกลับมา — ระหว่างพัก 90 วินาทีไม่มีใครอยากทำแบบนั้น

import { useState } from "react";
import { useApp } from "../AppContext";
import { barbellStep, countsBar, plateCalc } from "../lib/progression";
import { t } from "../lib/i18n";
import { Kicker } from "./ui";

export default function PlateCard() {
  const { data } = useApp();
  const [open, setOpen] = useState(false);
  const [w, setW] = useState(60);

  const step = barbellStep(data);
  const bar = countsBar(data) ? (data.settings.barWeight ?? 20) : 0;
  const { list, leftover, barOnly } = plateCalc(w, bar);
  const perSide = ((w - bar) / 2).toFixed(2).replace(/\.?0+$/, "");

  if (!open)
    return (
      <button className="btn-gh w-full !py-2.5 !text-[12px] mb-2.5" onClick={() => setOpen(true)}>
        {t("เครื่องคิดแผ่นน้ำหนัก", "Plate calculator")}
      </button>
    );

  return (
    <div className="glass p-4 mb-2.5">
      <Kicker
        right={
          <button className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }} onClick={() => setOpen(false)}>
            {t("ปิด", "Close")}
          </button>
        }
      >
        {t("เครื่องคิดแผ่นน้ำหนัก", "Plate calculator")}
      </Kicker>

      <div className="flex items-center gap-2 mb-3">
        <button
          className="w-11 h-11 cut-sm shrink-0 font-mono2 text-[13px]"
          style={{ background: "var(--acc-08)", border: "1px solid var(--edge)", color: "var(--acc)" }}
          onClick={() => setW((v) => Math.max(step, +(v - step).toFixed(2)))}
          aria-label={t("ลด", "Decrease")}
        >
          −{step}
        </button>
        <div className="flex-1 text-center">
          <input
            type="number"
            inputMode="decimal"
            className="w-full text-center font-disp font-bold text-[26px] py-1"
            style={{ background: "transparent", border: "none", color: "var(--ink)" }}
            value={w}
            onChange={(e) => setW(Math.max(0, parseFloat(e.target.value) || 0))}
          />
          <div className="font-mono2 text-[9px] -mt-1" style={{ color: "var(--dim)" }}>
            {countsBar(data) ? t("รวมบาร์", "bar included") : t("น้ำหนักแผ่นรวม", "plates only")} · kg
          </div>
        </div>
        <button
          className="w-11 h-11 cut-sm shrink-0 font-mono2 text-[13px]"
          style={{ background: "var(--acc-08)", border: "1px solid var(--edge)", color: "var(--acc)" }}
          onClick={() => setW((v) => +(v + step).toFixed(2))}
          aria-label={t("เพิ่ม", "Increase")}
        >
          +{step}
        </button>
      </div>

      {barOnly ? (
        <p className="text-[12px] text-center py-2" style={{ color: "var(--mut)" }}>
          {t(`บาร์เปล่า (${bar} kg)`, `Empty bar (${bar} kg)`)}
        </p>
      ) : list.length ? (
        <>
          <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
            {t(`ใส่ข้างละ ${perSide} kg`, `${perSide} kg per side`)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {list.map((p, i) => (
              <span
                key={i}
                className="font-mono2 text-[12px] px-2.5 py-1.5"
                style={{
                  color: "var(--acc)",
                  background: "var(--acc-08)",
                  border: "1px solid color-mix(in srgb, var(--acc) 30%, transparent)",
                  clipPath: "var(--cut-path-sm)",
                }}
              >
                {p}
              </span>
            ))}
          </div>
          {leftover > 0.01 && (
            <p className="text-[10.5px] mt-2" style={{ color: "var(--warn)" }}>
              {t(
                `ขาดอีก ${(leftover * 2).toFixed(1)} kg — แผ่นที่มีใส่ได้ไม่ลงตัวพอดี`,
                `${(leftover * 2).toFixed(1)} kg short — your plates can't hit this exactly`,
              )}
            </p>
          )}
        </>
      ) : (
        <p className="text-[12px] text-center py-2" style={{ color: "var(--dim)" }}>
          {t("ใส่น้ำหนักที่จะยก", "Enter the weight you're lifting")}
        </p>
      )}
    </div>
  );
}
