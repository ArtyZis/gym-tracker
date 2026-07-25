import { useState } from "react";
import { useApp } from "../AppContext";
import { clearKey, formatKey, isUnlocked, saveKey, savedKey } from "../lib/license";
import { getRoster } from "../lib/profiles";
import { Kicker } from "./ui";

// การ์ดปลดล็อกรุ่น Coach (รุ่น Coach เท่านั้น — ไม่ถูกเรียกใช้ในรุ่นส่วนตัว)
export default function LicenseCard() {
  const { toast } = useApp();
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const count = getRoster().profiles.length;

  function apply() {
    if (!input.trim()) {
      toast("ใส่รหัสก่อน");
      return;
    }
    if (!saveKey(input)) {
      toast("รหัสไม่ถูกต้อง — ตรวจตัวอักษรอีกครั้ง");
      return;
    }
    setUnlocked(true);
    setInput("");
    toast("ปลดล็อกแล้ว เพิ่มลูกเทรนได้ไม่จำกัด 🎉", true);
  }

  if (unlocked)
    return (
      <div className="glass p-4 mb-3">
        <Kicker right={<span className="font-mono2 text-[9.5px]" style={{ color: "var(--good)" }}>ปลดล็อกแล้ว ✓</span>}>
          รหัสใช้งาน
        </Kicker>
        <p className="text-[12.5px] -mt-1" style={{ color: "var(--mut)" }}>
          เพิ่มลูกเทรนได้ไม่จำกัด · ตอนนี้มี <b style={{ color: "var(--acc)" }}>{count}</b> คน
        </p>
        <div className="glass-inset font-mono2 text-[12px] px-3 py-2.5 mt-2.5" style={{ color: "var(--mut)" }}>
          {formatKey(savedKey() ?? "")}
        </div>
        <button
          className="btn-gh w-full !py-2 !text-[11.5px] mt-2"
          onClick={() => {
            if (!confirm("เอารหัสออกจากเครื่องนี้? (ลูกเทรนที่บันทึกไว้ยังอยู่ครบ)")) return;
            clearKey();
            setUnlocked(false);
            toast("เอารหัสออกแล้ว");
          }}
        >
          เอารหัสออกจากเครื่องนี้
        </button>
      </div>
    );

  return (
    <div className="glass p-4 mb-3" style={{ borderColor: "var(--acc-24)" }}>
      <Kicker right={<span className="font-mono2 text-[9.5px]" style={{ color: "var(--warn)" }}>รุ่นทดลอง</span>}>
        ปลดล็อกเก็บลูกเทรนไม่จำกัด
      </Kicker>
      <p className="text-[12.5px] -mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
        ตอนนี้เก็บได้ 1 คน — ใส่รหัสเพื่อเพิ่มลูกเทรนได้ไม่จำกัด ข้อมูลทั้งหมดอยู่ในเครื่องนี้เหมือนเดิม
      </p>
      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="COACH-XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className="flex-1 min-w-0 px-3.5 py-2.5 text-[13px]"
        />
        <button className="btn-cy !py-2.5 !px-4 !text-[12.5px] shrink-0" onClick={apply}>
          ใช้รหัส
        </button>
      </div>
    </div>
  );
}
