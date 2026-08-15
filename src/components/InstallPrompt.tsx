// การ์ดชวนเพิ่มลงหน้าจอโฮม — เหตุผลทางเทคนิคอยู่หัวไฟล์ src/lib/install.ts
//
// น้ำเสียงตั้งใจให้เป็น "เตือนว่าข้อมูลจะหาย" ไม่ใช่ "ชวนติดตั้งแอป"
// เพราะคำชวนติดตั้งคนกดปิดทันทีจนเป็นนิสัย แต่คำเตือนว่าของที่อุตส่าห์บันทึกจะหาย
// คนอ่านจบ · และมันเป็นความจริง ไม่ใช่กลยุทธ์ — iOS ลบ localStorage จริงถ้าไม่ได้ติดตั้ง
//
// สองที่: การ์ดเด้งในหน้าวันนี้ (ปิดได้ เงียบ 7 วัน) กับการ์ดถาวรในหน้าจัดการ
// ใช้เนื้อในชุดเดียวกัน ต่างกันแค่ปุ่ม "ไว้ทีหลัง"

import { useEffect, useState } from "react";
import { canInstallDirectly, detectPlatform, isIOS, isInstalled, onInstallReady, promptInstall, snooze } from "../lib/install";
import { t } from "../lib/i18n";

/** ปุ่มติดตั้งจริงพร้อมใช้ไหม — event มาช้ากว่า render แรกเสมอ ต้อง subscribe */
function useDirectInstall(): boolean {
  const [direct, setDirect] = useState(canInstallDirectly());
  useEffect(() => onInstallReady(() => setDirect(canInstallDirectly())), []);
  return direct;
}

/** ขั้นตอนที่ต้องทำเอง — ต่างกันคนละเรื่องตามเครื่อง บอกผิดเครื่องคือให้หาปุ่มที่ไม่มีอยู่ */
function InstallSteps({ direct }: { direct: boolean }) {
  const platform = detectPlatform();
  const lines =
    platform === "in-app"
      ? [
          t("เบราว์เซอร์นี้เพิ่มลงหน้าจอโฮมไม่ได้", "This in-app browser can't add to the home screen"),
          t('กดปุ่ม ⋯ หรือ ⋮ มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์"', 'Tap ⋯ or ⋮ at the top right, then "Open in browser"'),
          t("แล้วค่อยเพิ่มลงหน้าจอโฮมจากที่นั่น", "Then add it to the home screen from there"),
        ]
      : platform === "ios"
        ? [
            t("กดปุ่มแชร์ ⬆️ ตรงแถบล่างของ Safari", "Tap the Share button ⬆️ in Safari's bottom bar"),
            t('เลื่อนลงหา "เพิ่มไปยังหน้าจอโฮม"', 'Scroll down to "Add to Home Screen"'),
            t('กด "เพิ่ม" มุมขวาบน', 'Tap "Add" at the top right'),
          ]
        : direct
          ? [] // มีปุ่มจริงแล้ว ไม่ต้องสอน
          : [
              t("กดปุ่ม ⋮ มุมขวาบนของเบราว์เซอร์", "Tap ⋮ at the top right of your browser"),
              t('เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"', 'Choose "Install app" or "Add to Home screen"'),
            ];

  if (!lines.length) return null;
  return (
    <ol className="glass-inset px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
      {lines.map((l, i) => (
        <li key={i} className="flex gap-2 py-[2px]">
          <span className="font-mono2 shrink-0" style={{ color: "var(--acc)" }}>
            {i + 1}.
          </span>
          <span>{l}</span>
        </li>
      ))}
    </ol>
  );
}

/** เหตุผลว่าทำไมต้องติดตั้ง — iPhone พูดตรงๆ ว่าข้อมูลหาย เครื่องอื่นพูดถึงประโยชน์ */
function InstallReason() {
  // ใช้ isIOS() ไม่ใช่ platform เพราะคนเปิดผ่านไลน์บน iPhone ก็โดนกฎ 7 วันเหมือนกัน
  const ios = isIOS();
  return (
    <p className="text-[11.5px] leading-relaxed mt-1" style={{ color: ios ? "var(--warn)" : "var(--mut)" }}>
      {ios
        ? t(
            "⚠️ ถ้าไม่เพิ่ม ประวัติการฝึกอาจถูกลบเมื่อไม่ได้เปิดแอปเกิน 7 วัน — เป็นข้อจำกัดของ iPhone ไม่ใช่ของแอป",
            "⚠️ If you don't, iPhone may delete your training history after 7 days without opening the app — that's an iOS limit, not ours.",
          )
        : t(
            "เปิดเร็วขึ้น ใช้ตอนไม่มีเน็ตได้ และข้อมูลปลอดภัยกว่าเปิดผ่านแท็บเบราว์เซอร์",
            "Opens faster, works offline, and your data is safer than in a browser tab.",
          )}
    </p>
  );
}

// ── การ์ดเด้งในหน้าวันนี้ ──
export default function InstallPrompt({ onDone }: { onDone: () => void }) {
  const direct = useDirectInstall();

  const later = () => {
    snooze();
    onDone();
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) onDone();
    else later(); // ปฏิเสธกล่องของระบบ = ไม่ต้องถามซ้ำเร็วๆ
  };

  return (
    <div
      className="glass p-4 mb-3 rise"
      style={{
        borderColor: "color-mix(in srgb, var(--warn) 40%, transparent)",
        background: "linear-gradient(160deg, color-mix(in srgb, var(--warn) 7%, transparent), rgba(6,12,22,.6))",
      }}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        <span className="text-[18px] leading-none mt-px">📲</span>
        <div className="min-w-0">
          <div className="font-disp font-bold text-[14.5px] leading-snug" style={{ color: "var(--ink)" }}>
            {t("เพิ่ม RANKFORGE ลงหน้าจอโฮม", "Add RANKFORGE to your home screen")}
          </div>
          <InstallReason />
        </div>
      </div>

      <InstallSteps direct={direct} />

      <div className="flex gap-2 mt-3">
        {direct && (
          <button className="btn-cy flex-1 !py-2.5 !text-[12.5px]" onClick={install}>
            {t("ติดตั้งเลย", "Install now")}
          </button>
        )}
        <button className={`btn-gh !py-2.5 !px-4 !text-[12px] ${direct ? "" : "flex-1"}`} onClick={later}>
          {t("ไว้ทีหลัง", "Later")}
        </button>
      </div>
    </div>
  );
}

// ── การ์ดถาวรในหน้าจัดการ ──
export function InstallCard() {
  const direct = useDirectInstall();
  // สถานะติดตั้งเปลี่ยนได้ระหว่างเปิดแอปอยู่ (กดติดตั้งแล้วยังอยู่หน้าเดิม) จึงเก็บเป็น state
  const [installed, setInstalled] = useState(isInstalled);
  useEffect(() => onInstallReady(() => setInstalled(isInstalled())), []);

  if (installed)
    return (
      <div className="glass p-4 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[16px] leading-none">✓</span>
          <div className="min-w-0">
            <div className="font-disp font-bold text-[13px]" style={{ color: "var(--acc)" }}>
              {t("ติดตั้งลงหน้าจอโฮมแล้ว", "Installed on your home screen")}
            </div>
            <p className="text-[11.5px] mt-0.5" style={{ color: "var(--mut)" }}>
              {t("ข้อมูลปลอดภัยจากการถูกล้างอัตโนมัติแล้ว", "Your data is now safe from automatic clearing.")}
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="glass p-4 mb-3">
      <div className="mb-2.5">
        <div className="font-disp font-bold text-[13px] tracking-wide" style={{ color: "var(--ink)" }}>
          📲 {t("เพิ่มลงหน้าจอโฮม", "Add to home screen")}
        </div>
        <InstallReason />
      </div>
      <InstallSteps direct={direct} />
      {direct && (
        <button className="btn-cy w-full !py-2.5 !text-[12.5px] mt-2.5" onClick={() => void promptInstall()}>
          {t("ติดตั้งเลย", "Install now")}
        </button>
      )}
    </div>
  );
}
