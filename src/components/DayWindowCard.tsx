// ช่องเวลาที่เข้ายิมได้จริงแยกรายวัน
//
// ทำไมต้องแยกรายวัน: เวลาว่างของคนทำงาน/เรียนไม่เท่ากันทุกวัน บางวันมีชั่วโมงครึ่ง
// บางวันแทรกได้แค่ 75 นาทีระหว่างคาบ ถ้าระบบใช้เพดานเวลาค่าเดียวก็จะเสนอเพิ่มท่า
// ในวันที่จริงๆ ทำไม่ทัน แล้วผู้ใช้ต้องตัดท่าท้ายทิ้งเอง — ซึ่งท่าท้ายมักเป็นท่าที่
// ตั้งใจใส่ไว้เติมกล้ามเนื้อที่ยังขาดพอดี

import { useState } from "react";
import { useApp } from "../AppContext";
import type { DayKey } from "../lib/store";
import { DAYS, dayName, exercisesForDay } from "../lib/store";
import { estimateMinutes, trainingDays } from "../lib/analyzer";
import { getTimeCap, windowMinutes } from "../lib/profile";
import { minText, t } from "../lib/i18n";
import { Kicker } from "./ui";

// ตัวเลือกเวลาที่กดง่ายบนมือถือ (พิมพ์เวลาบนมือถือช้าและพลาดง่าย)
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINS = [0, 15, 30, 45];

function TimePick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":").map((x) => parseInt(x, 10));
  const set = (nh: number, nm: number) => onChange(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
  const sel = {
    background: "rgba(10,20,31,.6)",
    border: "1px solid var(--edge)",
    color: "var(--ink)",
    borderRadius: 9,
    padding: "5px 7px",
    fontSize: 12,
  } as const;
  return (
    <div className="flex items-center gap-1">
      <select style={sel} value={h} onChange={(e) => set(+e.target.value, m)}>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {String(x).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span style={{ color: "var(--dim)" }}>:</span>
      <select style={sel} value={m} onChange={(e) => set(h, +e.target.value)}>
        {MINS.map((x) => (
          <option key={x} value={x}>
            {String(x).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DayWindowCard() {
  const { data, update, toast } = useApp();
  const [openDay, setOpenDay] = useState<DayKey | null>(null);
  const train = trainingDays(data);
  // แสดงทุกวัน ไม่ใช่แค่วันฝึก — ผู้ใช้อาจตั้งเวลาไว้ก่อนแล้วค่อยใส่ท่า
  const days = DAYS;

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          <span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
            {t(`ค่ากลาง ${getTimeCap(data)} นาที`, `Default ${minText(getTimeCap(data))}`)}
          </span>
        }
      >
        {t("เวลาเข้ายิมแต่ละวัน", "Gym time per day")}
      </Kicker>
      <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
        {t("บอกว่าวันไหนมีเวลาแค่ไหน — ระบบจะไม่เสนอเพิ่มท่าในวันที่ทำจริงไม่ทัน", "Tell it how long you have each day — it won't suggest adding lifts to a day you can't finish")}
        {!data.dayWindows && (
          <span style={{ color: "var(--warn)" }}>
            {" "}
            {t(`(ยังไม่ได้ตั้ง — ตอนนี้ใช้ค่ากลาง ${getTimeCap(data)} นาทีทุกวัน)`, `(not set — using the ${minText(getTimeCap(data))} default every day)`)}
          </span>
        )}
      </p>

      {days.map((day) => {
        const w = data.dayWindows?.[day];
        const open = openDay === day;
        const usable = windowMinutes(data, day);
        const exs = exercisesForDay(data, day);
        const used = estimateMinutes(exs);
        const isTrain = train.includes(day);
        const tight = usable != null && used > usable;

        return (
          <div key={day} className="mb-2 last:mb-0">
            <button
              className="w-full glass-inset flex items-center gap-2.5 px-3 py-2.5 text-left"
              onClick={() => setOpenDay(open ? null : day)}
            >
              <span
                className="font-mono2 text-[11px] font-bold shrink-0 rounded-lg px-2 py-1"
                style={
                  isTrain
                    ? { color: "#031420", background: "linear-gradient(180deg, var(--acc), var(--acc-2))" }
                    : { color: "var(--dim)", background: "rgba(10,20,31,.6)", border: "1px solid var(--edge)" }
                }
              >
                {dayName(day)}
              </span>
              <span className="flex-1 min-w-0 text-[12px] truncate" style={{ color: w ? "var(--ink)" : "var(--dim)" }}>
                {w ? `${w.start}–${w.end}` : t("ยังไม่ตั้ง (ใช้ค่ากลาง)", "Not set (using default)")}
                {usable != null && (
                  <span className="font-mono2 text-[10px] ml-1.5" style={{ color: tight ? "var(--warn)" : "var(--mut)" }}>
                    {t(`ยกได้ ${usable} น.`, `${usable} min usable`)}
                    {isTrain ? t(` · ใช้ ${used} น.`, ` · ${used} min used`) : ""}
                  </span>
                )}
              </span>
              <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
                {open ? t("ปิด", "Close") : w ? t("แก้", "Edit") : t("ตั้ง", "Set")}
              </span>
            </button>

            {open && (
              <div className="glass-inset mt-1 p-3">
                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                  <span className="font-mono2 text-[10px] w-9" style={{ color: "var(--mut)" }}>
                    {t("เข้า", "In")}
                  </span>
                  <TimePick
                    value={w?.start ?? "17:00"}
                    onChange={(v) =>
                      update((d) => {
                        const cur = d.dayWindows?.[day];
                        d.dayWindows = { ...d.dayWindows, [day]: { start: v, end: cur?.end ?? "18:30", bufferMin: cur?.bufferMin } };
                      })
                    }
                  />
                  <span className="font-mono2 text-[10px] w-9 text-right" style={{ color: "var(--mut)" }}>
                    {t("ออก", "Out")}
                  </span>
                  <TimePick
                    value={w?.end ?? "18:30"}
                    onChange={(v) =>
                      update((d) => {
                        const cur = d.dayWindows?.[day];
                        d.dayWindows = { ...d.dayWindows, [day]: { start: cur?.start ?? "17:00", end: v, bufferMin: cur?.bufferMin } };
                      })
                    }
                  />
                </div>

                <p className="text-[10.5px] leading-relaxed mb-2" style={{ color: "var(--mut)" }}>
                  {t(`หักเวลาเดินทางในยิม/เปลี่ยนชุด/รอเครื่องออก ${w?.bufferMin ?? 10} นาทีอัตโนมัติ`, `Automatically subtracts ${minText(w?.bufferMin ?? 10)} for changing, walking, and waiting on machines`)}
                  {usable != null && t(` → เหลือยกจริง ${usable} นาที`, ` → ${minText(usable)} of actual lifting`)}
                </p>

                {tight && (
                  <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--warn)" }}>
                    {t(`ตอนนี้ท่าใน${dayName(day)}ใช้เวลาราว ${used} นาที เกินที่มี ${usable} นาที — ลดเซตหรือย้ายท่าท้ายไปวันอื่น`, `${dayName(day)} currently runs about ${used} min but you only have ${usable} — cut sets or move the tail to another day`)}
                  </p>
                )}

                {w && (
                  <button
                    className="font-mono2 text-[10px] px-2.5 py-1.5 rounded-lg"
                    style={{ color: "var(--warn)", background: "rgba(10,20,31,.6)", border: "1px solid var(--edge)" }}
                    onClick={() => {
                      update((d) => {
                        if (!d.dayWindows) return;
                        delete d.dayWindows[day];
                        if (!Object.keys(d.dayWindows).length) d.dayWindows = undefined;
                      });
                      toast(t(`${dayName(day)}: กลับไปใช้ค่ากลาง`, `${dayName(day)}: back to the default`));
                    }}
                  >
                    {t("ล้างค่าวันนี้", "Clear this day")}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
