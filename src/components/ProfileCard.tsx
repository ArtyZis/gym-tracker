import { useState } from "react";
import { useApp } from "../AppContext";
import type { DayKey } from "../lib/store";
import { dayName } from "../lib/store";
import { trainingDays } from "../lib/analyzer";
import { slotName } from "../lib/loop";
import type { EquipTag, Experience, InjuryKey } from "../lib/muscles";
import { EQUIP_PRESETS, VOLUME_TARGETS, equipName, experienceDesc, experienceName, injuryName } from "../lib/muscles";
import { ALL_EQUIP, equipPresetLabel, getDayEquip, getExperience, getInjuries, getMaxSetsPerSession, getTimeCap } from "../lib/profile";
import { minText, setsText, t } from "../lib/i18n";
import { Kicker } from "./ui";

const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const INJURIES: InjuryKey[] = ["lower_back", "shoulder", "knee", "elbow", "wrist"];
// เรียงตามที่คนนึกถึง ไม่ใช่ตามตัวอักษร
const EQUIP_ORDER: EquipTag[] = [
  "barbell", "dumbbell", "machine", "cable", "bench", "rack", "pullup_bar", "bodyweight", "band", "kettlebell", "other",
];

// ปุ่มเลือกแบบชิป — ใช้ซ้ำทั้งการ์ด
function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-mono2 text-[11px] px-3 py-2 rounded-full transition-all"
      style={
        on
          ? { background: "linear-gradient(180deg, var(--acc), var(--acc-2))", color: "#03131C", fontWeight: 700, boxShadow: "0 0 10px var(--acc-40)" }
          : { background: "rgba(120,180,255,.05)", border: "1px solid var(--edge)", color: "var(--mut)" }
      }
    >
      {children}
    </button>
  );
}

// โปรไฟล์การฝึก — ระดับ อาการบาดเจ็บ เวลาต่อครั้ง อุปกรณ์
// ทั้งหมดมีค่า default ที่ใช้ได้ทันที ไม่บังคับกรอกก่อนใช้แอป
export default function ProfileCard() {
  const { data, update, toast } = useApp();
  const exp = getExperience(data);
  const injuries = getInjuries(data);
  const timeCap = getTimeCap(data);
  const maxSets = getMaxSetsPerSession(data);
  const target = VOLUME_TARGETS[exp];

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{t("ใช้ตอนวิเคราะห์", "used by the analyzer")}</span>}>
        {t("โปรไฟล์การฝึก", "Training profile")}
      </Kicker>

      <div className="text-[12.5px] mb-1.5" style={{ color: "var(--ink)" }}>{t("ระดับประสบการณ์", "Experience level")}</div>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {EXPERIENCES.map((e) => (
          <Pick key={e} on={exp === e} onClick={() => update((d) => { d.profile = { ...d.profile, experience: e }; })}>
            {experienceName(e)}
          </Pick>
        ))}
      </div>
      <p className="text-[11px] mb-3" style={{ color: "var(--mut)" }}>
        {experienceDesc(exp)} · {t("เป้าหมาย", "target")}{" "}
        <b style={{ color: "var(--acc)" }}>
          {t(`${target.min}-${target.max} เซต/สัปดาห์`, `${target.min}-${target.max} sets/week`)}
        </b>{" "}
        {t("ต่อกล้ามเนื้อ", "per muscle")}
      </p>

      {/* เคยมีปุ่มเลือก "เป้าหมาย" (สร้างกล้าม/แรง/ลดไขมัน/ทั่วไป) ตรงนี้ — เอาออกเมื่อ 16 ส.ค. 2026
          เพราะไม่มีโค้ดไหนอ่านค่านั้นเลย ตัววิเคราะห์กับตัวบอกน้ำหนักไม่แตะ
          ถามลูกค้าแล้วไม่เอาคำตอบไปใช้ = หลอกว่าตั้งแล้วมีผล แย่กว่าไม่ถามเลย
          ค่าที่ผู้ใช้เคยเลือกไว้ยังอยู่ใน settings ไม่ได้ลบ (ดู Profile.goal ใน store.ts) */}

      <div className="text-[12.5px] mb-1" style={{ color: "var(--ink)" }}>{t("อาการบาดเจ็บ (ถ้ามี)", "Injuries (if any)")}</div>
      <p className="text-[11px] mb-1.5" style={{ color: "var(--mut)" }}>
        {t(
          "ระบบจะไม่เสนอท่าที่เสี่ยงซ้ำเติม — แต่ควรปรึกษาแพทย์/นักกายภาพก่อนฝึกต่อ",
          "We won't suggest lifts that could make it worse — but see a doctor or physio before training on it",
        )}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {INJURIES.map((k) => {
          const on = injuries.includes(k);
          return (
            <Pick
              key={k}
              on={on}
              onClick={() =>
                update((d) => {
                  const cur = d.profile?.injuries ?? [];
                  d.profile = { ...d.profile, injuries: on ? cur.filter((x) => x !== k) : [...cur, k] };
                })
              }
            >
              {on ? "✓ " : ""}
              {injuryName(k)}
            </Pick>
          );
        })}
      </div>

      <div className="hairline pt-3">
        <div className="text-[12.5px] mb-2" style={{ color: "var(--ink)" }}>{t("ข้อจำกัดต่อครั้ง", "Per-session limits")}</div>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="block font-mono2 text-[9.5px] mb-1" style={{ color: "var(--mut)" }}>{t("เวลาสูงสุด (นาที)", "Max time (min)")}</span>
            <input
              type="number"
              className="w-full px-3 py-2 text-[14px]"
              value={timeCap}
              min={20}
              max={240}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) update((d) => { d.constraints = { ...d.constraints, sessionTimeCapMinutes: Math.max(20, Math.min(240, v)) }; });
              }}
            />
          </label>
          <label className="flex-1">
            <span className="block font-mono2 text-[9.5px] mb-1" style={{ color: "var(--mut)" }}>{t("เซตสูงสุด", "Max sets")}</span>
            <input
              type="number"
              className="w-full px-3 py-2 text-[14px]"
              value={maxSets}
              min={5}
              max={60}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) update((d) => { d.constraints = { ...d.constraints, maxSetsPerSession: Math.max(5, Math.min(60, v)) }; });
              }}
            />
          </label>
        </div>
        <button
          className="btn-gh w-full !py-2 !text-[11.5px] mt-2.5"
          onClick={() => {
            update((d) => { d.profile = undefined; d.constraints = undefined; });
            toast(t("คืนค่าเริ่มต้นแล้ว", "Reset to defaults"));
          }}
        >
          {t("คืนค่าเริ่มต้น", "Reset to defaults")}
        </button>
      </div>
    </div>
  );
}

// อุปกรณ์แยกรายวัน — จุดสำคัญที่สุด
// คนจำนวนมากเข้ายิมบางวันและเล่นที่บ้านบางวัน ถ้าเก็บเป็นค่าเดียวทั้งโปรไฟล์
// ระบบจะเสนอท่าบาร์เบลในวันที่อยู่บ้าน ซึ่งทำจริงไม่ได้
export function DayEquipmentCard() {
  const { data, update, toast } = useApp();
  const [openDay, setOpenDay] = useState<DayKey | null>(null);
  const days = trainingDays(data);

  if (!days.length)
    return (
      <div className="glass p-4 mb-3">
        <Kicker>{t("อุปกรณ์แต่ละวัน", "Equipment by day")}</Kicker>
        <p className="text-[12px] -mt-1" style={{ color: "var(--mut)" }}>
          {t(
            "ยังไม่มีวันฝึก — เพิ่มท่าก่อนแล้วค่อยกลับมาตั้งว่าวันไหนใช้อุปกรณ์อะไรได้บ้าง",
            "No training days yet — add some exercises first, then come back and set what's available each day",
          )}
        </p>
      </div>
    );

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          <span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
            {t(`${days.length} วันฝึก`, `${days.length} training ${days.length === 1 ? "day" : "days"}`)}
          </span>
        }
      >
        {t("อุปกรณ์แต่ละวัน", "Equipment by day")}
      </Kicker>
      <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
        {t(
          "บอกว่าวันไหนอยู่ยิม วันไหนอยู่บ้าน — ระบบจะไม่เสนอท่าที่วันนั้นไม่มีอุปกรณ์ทำ",
          "Tell it which days you're at the gym and which you're home — it won't suggest lifts you can't do that day",
        )}
        {!data.dayEquip && (
          <span style={{ color: "var(--warn)" }}>
            {" "}
            {t("(ยังไม่ได้ตั้ง — ตอนนี้ถือว่ามีครบทุกวัน)", "(not set — assuming you have everything, every day)")}
          </span>
        )}
      </p>

      {days.map((day) => {
        const equip = getDayEquip(data, day);
        const open = openDay === day;
        const isDefault = !data.dayEquip?.[day];
        return (
          <div key={day} className="mb-2 last:mb-0">
            <button
              className="w-full glass-inset flex items-center gap-2.5 px-3 py-2.5 text-left"
              onClick={() => setOpenDay(open ? null : day)}
            >
              <span
                className="font-mono2 text-[11px] font-bold shrink-0 rounded-lg px-2 py-1"
                style={{ color: "#031420", background: "linear-gradient(180deg, var(--acc), var(--acc-2))" }}
              >
                {slotName(data, day)}
              </span>
              <span className="flex-1 min-w-0 text-[12px] truncate" style={{ color: isDefault ? "var(--dim)" : "var(--ink)" }}>
                {isDefault ? t("มีครบทุกอย่าง (ค่าเริ่มต้น)", "Everything available (default)") : equipPresetLabel(equip)}
              </span>
              <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
                {open ? t("ปิด", "Close") : t("แก้", "Edit")}
              </span>
            </button>

            {open && (
              <div className="glass-inset mt-1 p-3">
                <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
                  {t("เลือกชุดสำเร็จรูป", "Pick a preset")}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {EQUIP_PRESETS.map((p) => (
                    <Pick
                      key={p.id}
                      on={equipPresetLabel(equip) === p.label()}
                      onClick={() => {
                        update((d) => {
                          d.dayEquip = { ...d.dayEquip, [day]: [...p.equip] };
                        });
                        toast(`${slotName(data, day)}: ${p.label()}`);
                      }}
                    >
                      {p.label()}
                    </Pick>
                  ))}
                </div>

                <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
                  {t("หรือเลือกเอง", "Or pick your own")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIP_ORDER.map((e) => {
                    const on = equip.includes(e);
                    return (
                      <Pick
                        key={e}
                        on={on}
                        onClick={() =>
                          update((d) => {
                            const cur = d.dayEquip?.[day] ?? ALL_EQUIP;
                            const next = on ? cur.filter((x) => x !== e) : [...cur, e];
                            d.dayEquip = { ...d.dayEquip, [day]: next };
                          })
                        }
                      >
                        {on ? "✓ " : ""}
                        {equipName(e)}
                      </Pick>
                    );
                  })}
                </div>

                {!isDefault && (
                  <button
                    className="btn-gh w-full !py-2 !text-[11px] mt-2.5"
                    onClick={() => {
                      update((d) => {
                        if (d.dayEquip) delete d.dayEquip[day];
                      });
                      toast(t(`${slotName(data, day)}: กลับเป็นค่าเริ่มต้น`, `${slotName(data, day)}: back to default`));
                    }}
                  >
                    {t("คืนค่าเริ่มต้นวันนี้", "Reset this day")}
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
