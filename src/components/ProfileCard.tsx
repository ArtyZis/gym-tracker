import { useState } from "react";
import { useApp } from "../AppContext";
import type { DayKey } from "../lib/store";
import { DAY_TH } from "../lib/store";
import { trainingDays } from "../lib/analyzer";
import type { EquipTag, Experience, Goal, InjuryKey } from "../lib/muscles";
import {
  EQUIP_PRESETS,
  EQUIP_TH,
  EXPERIENCE_DESC,
  EXPERIENCE_TH,
  GOAL_TH,
  INJURY_TH,
  VOLUME_TARGETS,
} from "../lib/muscles";
import { ALL_EQUIP, equipPresetLabel, getDayEquip, getExperience, getGoal, getInjuries, getMaxSetsPerSession, getTimeCap } from "../lib/profile";
import { Kicker } from "./ui";

const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const GOALS: Goal[] = ["hypertrophy", "strength", "fatloss", "general"];
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

// โปรไฟล์การฝึก — ระดับ เป้าหมาย อาการบาดเจ็บ เวลาต่อครั้ง
// ทั้งหมดมีค่า default ที่ใช้ได้ทันที ไม่บังคับกรอกก่อนใช้แอป
export default function ProfileCard() {
  const { data, update, toast } = useApp();
  const exp = getExperience(data);
  const goal = getGoal(data);
  const injuries = getInjuries(data);
  const timeCap = getTimeCap(data);
  const maxSets = getMaxSetsPerSession(data);
  const target = VOLUME_TARGETS[exp];

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>ใช้ตอนวิเคราะห์</span>}>
        โปรไฟล์การฝึก
      </Kicker>

      <div className="text-[12.5px] mb-1.5" style={{ color: "var(--ink)" }}>ระดับประสบการณ์</div>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {EXPERIENCES.map((e) => (
          <Pick key={e} on={exp === e} onClick={() => update((d) => { d.profile = { ...d.profile, experience: e }; })}>
            {EXPERIENCE_TH[e]}
          </Pick>
        ))}
      </div>
      <p className="text-[11px] mb-3" style={{ color: "var(--mut)" }}>
        {EXPERIENCE_DESC[exp]} · เป้าหมาย <b style={{ color: "var(--acc)" }}>{target.min}-{target.max} เซต/สัปดาห์</b> ต่อกล้ามเนื้อ
      </p>

      <div className="text-[12.5px] mb-1.5" style={{ color: "var(--ink)" }}>เป้าหมาย</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GOALS.map((g) => (
          <Pick key={g} on={goal === g} onClick={() => update((d) => { d.profile = { ...d.profile, goal: g }; })}>
            {GOAL_TH[g]}
          </Pick>
        ))}
      </div>

      <div className="text-[12.5px] mb-1" style={{ color: "var(--ink)" }}>อาการบาดเจ็บ (ถ้ามี)</div>
      <p className="text-[11px] mb-1.5" style={{ color: "var(--mut)" }}>
        ระบบจะไม่เสนอท่าที่เสี่ยงซ้ำเติม — แต่ควรปรึกษาแพทย์/นักกายภาพก่อนฝึกต่อ
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
              {INJURY_TH[k]}
            </Pick>
          );
        })}
      </div>

      <div className="hairline pt-3">
        <div className="text-[12.5px] mb-2" style={{ color: "var(--ink)" }}>ข้อจำกัดต่อครั้ง</div>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="block font-mono2 text-[9.5px] mb-1" style={{ color: "var(--mut)" }}>เวลาสูงสุด (นาที)</span>
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
            <span className="block font-mono2 text-[9.5px] mb-1" style={{ color: "var(--mut)" }}>เซตสูงสุด</span>
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
            toast("คืนค่าเริ่มต้นแล้ว");
          }}
        >
          คืนค่าเริ่มต้น
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
        <Kicker>อุปกรณ์แต่ละวัน</Kicker>
        <p className="text-[12px] -mt-1" style={{ color: "var(--mut)" }}>
          ยังไม่มีวันฝึก — เพิ่มท่าก่อนแล้วค่อยกลับมาตั้งว่าวันไหนใช้อุปกรณ์อะไรได้บ้าง
        </p>
      </div>
    );

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>{days.length} วันฝึก</span>}>
        อุปกรณ์แต่ละวัน
      </Kicker>
      <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
        บอกว่าวันไหนอยู่ยิม วันไหนอยู่บ้าน — ระบบจะไม่เสนอท่าที่วันนั้นไม่มีอุปกรณ์ทำ
        {!data.dayEquip && <span style={{ color: "var(--warn)" }}> (ยังไม่ได้ตั้ง — ตอนนี้ถือว่ามีครบทุกวัน)</span>}
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
                {DAY_TH[day]}
              </span>
              <span className="flex-1 min-w-0 text-[12px] truncate" style={{ color: isDefault ? "var(--dim)" : "var(--ink)" }}>
                {isDefault ? "มีครบทุกอย่าง (ค่าเริ่มต้น)" : equipPresetLabel(equip)}
              </span>
              <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
                {open ? "ปิด" : "แก้"}
              </span>
            </button>

            {open && (
              <div className="glass-inset mt-1 p-3">
                <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
                  เลือกชุดสำเร็จรูป
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {EQUIP_PRESETS.map((p) => (
                    <Pick
                      key={p.id}
                      on={equipPresetLabel(equip) === p.label}
                      onClick={() => {
                        update((d) => {
                          d.dayEquip = { ...d.dayEquip, [day]: [...p.equip] };
                        });
                        toast(`${DAY_TH[day]}: ${p.label}`);
                      }}
                    >
                      {p.label}
                    </Pick>
                  ))}
                </div>

                <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
                  หรือเลือกเอง
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
                        {EQUIP_TH[e]}
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
                      toast(`${DAY_TH[day]}: กลับเป็นค่าเริ่มต้น`);
                    }}
                  >
                    คืนค่าเริ่มต้นวันนี้
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
