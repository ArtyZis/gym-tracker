import { useState } from "react";
import { useApp } from "../AppContext";
import { todayStr } from "../lib/store";
import { t } from "../lib/i18n";
import { Spark } from "./ProgressView";

// บันทึกผลสแกนร่างกาย (Inbody / Accuniq) — กล้ามเนื้อลาย, %ไขมัน + FFMI อัตโนมัติ
export default function BodyCompCard() {
  const { data, update, toast } = useApp();
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [height, setHeight] = useState(data.settings.heightCm ? String(data.settings.heightCm) : "");

  const scans = data.bodyScans;
  const last = scans[scans.length - 1];

  const h = parseFloat(height) || data.settings.heightCm || 0;
  const previewW = parseFloat(weight) || last?.weightKg || 0;
  const previewF = parseFloat(fat) || last?.fatPct || 0;
  const ffmi = h > 0 && previewW > 0 && previewF > 0 ? +((previewW * (1 - previewF / 100)) / (h / 100) ** 2).toFixed(1) : null;

  function save() {
    const w = parseFloat(weight);
    const f = parseFloat(fat);
    const m = parseFloat(muscle);
    if (!w && !f && !m) {
      toast(t("ใส่ค่าจากเครื่องสแกนก่อน", "Enter the numbers from your scan first"));
      return;
    }
    update((d) => {
      if (height) d.settings.heightCm = parseFloat(height) || undefined;
      d.bodyScans = d.bodyScans.filter((s) => s.date !== todayStr());
      d.bodyScans.push({
        date: todayStr(),
        weightKg: w || undefined,
        fatPct: f || undefined,
        muscleKg: m || undefined,
      });
      d.bodyScans.sort((a, b) => a.date.localeCompare(b.date));
      // น้ำหนักตัวจากเครื่องสแกนอัปเดตกราฟน้ำหนักด้วย
      if (w) {
        d.bodyweight = d.bodyweight.filter((b) => b.date !== todayStr());
        d.bodyweight.push({ date: todayStr(), kg: w });
        d.bodyweight.sort((a, b) => a.date.localeCompare(b.date));
      }
    });
    setWeight("");
    setFat("");
    setMuscle("");
    toast(t("บันทึกผลสแกนแล้ว", "Scan saved"));
  }

  const musclePts = scans.filter((s) => s.muscleKg).map((s) => s.muscleKg!);
  const fatPts = scans.filter((s) => s.fatPct).map((s) => s.fatPct!);
  const inputCls = "w-full px-3 py-2.5 text-[14px]";

  return (
    <div className="glass p-4 mb-3">
      <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2.5" style={{ color: "var(--cyan-dim)" }}>
        {t("สแกนร่างกาย · Body Composition", "Body composition scan")}
      </div>
      <p className="text-[11.5px] mb-2.5" style={{ color: "var(--mut)" }}>
        {t("กรอกจากเครื่องสแกน (Inbody, Accuniq ฯลฯ) — เก็บแยกจากน้ำหนักตัวเฉยๆ", "From a body scanner (InBody, Accuniq, etc.) — kept separate from plain bodyweight")}
      </p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <Label>{t("น้ำหนัก (kg)", "Weight (kg)")}</Label>
          <input type="number" step="0.1" className={inputCls} value={weight} placeholder={last?.weightKg ? String(last.weightKg) : "61.0"} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <Label>{t("ไขมัน (%)", "Body fat (%)")}</Label>
          <input type="number" step="0.1" className={inputCls} value={fat} placeholder={last?.fatPct ? String(last.fatPct) : "18.5"} onChange={(e) => setFat(e.target.value)} />
        </div>
        <div>
          <Label>{t("กล้ามเนื้อลาย (kg)", "Skeletal muscle (kg)")}</Label>
          <input type="number" step="0.1" className={inputCls} value={muscle} placeholder={last?.muscleKg ? String(last.muscleKg) : "27.0"} onChange={(e) => setMuscle(e.target.value)} />
        </div>
        <div>
          <Label>{t("ส่วนสูง (cm)", "Height (cm)")}</Label>
          <input type="number" className={inputCls} value={height} placeholder="170" onChange={(e) => setHeight(e.target.value)} />
        </div>
      </div>
      {ffmi != null && (
        <div className="glass-inset px-3 py-2 mb-2 flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: "var(--mut)" }}>
            {t("FFMI (คำนวณอัตโนมัติ)", "FFMI (calculated)")}
          </span>
          <span className="font-mono2 text-[15px] font-bold" style={{ color: "var(--cyan)" }}>
            {ffmi}
          </span>
        </div>
      )}
      <button className="btn-cy w-full !py-2.5 !text-[12.5px] mb-3" onClick={save}>
        {t("บันทึกผลสแกนวันนี้", "Save today's scan")}
      </button>

      {musclePts.length > 0 && (
        <div className="mb-2">
          <div className="flex justify-between font-mono2 text-[10px] mb-1">
            <span style={{ color: "var(--mut)" }}>{t("กล้ามเนื้อลาย", "Skeletal muscle")}</span>
            <span style={{ color: "var(--good)" }}>{musclePts[musclePts.length - 1]} kg</span>
          </div>
          <Spark pts={musclePts.slice(-12)} color="#4ADE9C" />
        </div>
      )}
      {fatPts.length > 0 && (
        <div>
          <div className="flex justify-between font-mono2 text-[10px] mb-1">
            <span style={{ color: "var(--mut)" }}>{t("ไขมัน", "Body fat")}</span>
            <span style={{ color: "var(--warn)" }}>{fatPts[fatPts.length - 1]}%</span>
          </div>
          <Spark pts={fatPts.slice(-12)} color="#FFC15E" />
        </div>
      )}
      {scans.length === 0 && (
        <p className="text-center text-[11.5px] py-1" style={{ color: "var(--dim)" }}>
          {t("ยังไม่มีผลสแกน — บันทึกครั้งแรกเพื่อเริ่มดูแนวโน้ม", "No scans yet — save your first one to start seeing a trend")}
        </p>
      )}
    </div>
  );
}

const Label = ({ children }: { children: string }) => (
  <label className="block font-mono2 text-[9.5px] uppercase tracking-[.1em] mb-1" style={{ color: "var(--mut)" }}>
    {children}
  </label>
);
