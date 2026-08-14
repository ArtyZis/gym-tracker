import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { haptics } from "../lib/haptics";
import { playRestDone, unlockAudio } from "../lib/sound";
import { t } from "../lib/i18n";
import { Icon } from "./ui";

export interface RestTimerHandle {
  start(sec: number, label?: string): void;
}

const POS_KEY = "gymtracker_timerpos";

// ตัวจับเวลาพักแบบ timestamp-based:
// เก็บ endTime (epoch ms) แล้วคำนวณ remaining = endTime - Date.now() ใหม่ทุกครั้ง
// จึงแม่นยำแม้ browser จะหยุด/ชะลอ interval ตอนสลับแอปหรือล็อกหน้าจอ
// ลากขยับตำแหน่งได้ด้วย pointer events (จำตำแหน่งไว้ใน localStorage)
const RestTimer = forwardRef<RestTimerHandle>((_props, ref) => {
  const [totalSec, setTotalSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string>("");
  const [pos, setPos] = useState<{ dx: number; dy: number }>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        // ตรวจว่าเป็นตัวเลขจริงก่อนใช้ — ค่าพัง/ปลอมจะได้ไม่ทำ component crash ตอน mount
        if (p && Number.isFinite(p.dx) && Number.isFinite(p.dy)) return { dx: p.dx, dy: p.dy };
      }
    } catch {
      /* ไม่มี/พัง ก็ใช้ default */
    }
    return { dx: 0, dy: 0 };
  });

  const endTimeRef = useRef<number | null>(null);
  const pausedMsRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const tickRef = useRef<number | undefined>(undefined);
  const notifyTimerRef = useRef<number | undefined>(undefined);
  const barRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(pos); // ตำแหน่งล่าสุด กัน stale closure ตอนบันทึก
  posRef.current = pos;
  const drag = useRef<{ startX: number; startY: number; baseLeft: number; baseTop: number; dx0: number; dy0: number; moved: boolean } | null>(null);

  function notifyDone() {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return;
      const title = t("พักครบแล้ว 💪", "Rest over 💪");
      const opts: NotificationOptions = {
        body: label ? t(`${label} — เซตต่อไป`, `${label} — next set`) : t("กลับไปยกเซตต่อได้เลย", "Back to the bar"),
        tag: "rest-done",
      };
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.showNotification(title, opts);
          else new Notification(title, opts);
        });
      } else {
        new Notification(title, opts);
      }
    } catch {
      /* iOS Safari ไม่รองรับ new Notification() — fallback เสียง+สั่น */
    }
  }

  function clearTimers() {
    window.clearInterval(tickRef.current);
    window.clearTimeout(notifyTimerRef.current);
  }

  function finish() {
    if (firedRef.current) return;
    firedRef.current = true;
    clearTimers();
    endTimeRef.current = null;
    pausedMsRef.current = null;
    setRunning(false);
    setVisible(false);
    playRestDone();
    haptics.restDone();
    notifyDone();
  }

  function sync() {
    if (pausedMsRef.current != null) {
      setRemainingSec(Math.max(0, Math.ceil(pausedMsRef.current / 1000)));
      return;
    }
    const end = endTimeRef.current;
    if (end == null) return;
    const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setRemainingSec(rem);
    if (rem <= 0) finish();
  }

  function scheduleNotify(ms: number) {
    window.clearTimeout(notifyTimerRef.current);
    notifyTimerRef.current = window.setTimeout(finish, Math.max(0, ms));
  }

  useImperativeHandle(ref, () => ({
    start(sec: number, exLabel?: string) {
      unlockAudio(); // ปลุกเสียงใน user gesture
      try {
        if ("Notification" in window && Notification.permission === "default")
          Notification.requestPermission().catch(() => {});
      } catch {
        /* บางเบราว์เซอร์ไม่มี Notification */
      }
      firedRef.current = false;
      pausedMsRef.current = null;
      endTimeRef.current = Date.now() + sec * 1000;
      setLabel(exLabel || "");
      setTotalSec(sec);
      setRemainingSec(sec);
      setRunning(true);
      setVisible(true);
      scheduleNotify(sec * 1000);
    },
  }));

  useEffect(() => {
    if (!running) {
      window.clearInterval(tickRef.current);
      return;
    }
    sync();
    tickRef.current = window.setInterval(sync, 300);
    return () => window.clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!visible) return;
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => clearTimers, []);

  // ── การลาก ──
  function onPointerDown(e: React.PointerEvent) {
    // ไม่ลากถ้ากดปุ่ม
    if ((e.target as HTMLElement).closest("button")) return;
    const bar = barRef.current;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: r.left - pos.dx, // ตำแหน่งถ้า dx=0
      baseTop: r.top - pos.dy,
      dx0: pos.dx,
      dy0: pos.dy,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const bar = barRef.current;
    if (!d || !bar) return;
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rawDx = d.dx0 + (e.clientX - d.startX);
    const rawDy = d.dy0 + (e.clientY - d.startY);
    if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    // clamp ไม่ให้หลุดจอ (เว้นขอบบน safe area และล่างเผื่อ nav)
    const minLeft = 8;
    const maxLeft = vw - w - 8;
    const minTop = 56;
    const maxTop = vh - h - 12;
    const left = Math.min(maxLeft, Math.max(minLeft, d.baseLeft + rawDx));
    const top = Math.min(maxTop, Math.max(minTop, d.baseTop + rawDy));
    const next = { dx: left - d.baseLeft, dy: top - d.baseTop };
    posRef.current = next;
    setPos(next);
  }

  function onPointerUp() {
    if (drag.current?.moved) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      } catch {
        /* เก็บไม่ได้ก็ไม่เป็นไร */
      }
    }
    drag.current = null;
  }

  function addThirty() {
    if (pausedMsRef.current != null) {
      pausedMsRef.current += 30000;
    } else if (endTimeRef.current != null) {
      endTimeRef.current += 30000;
      scheduleNotify(endTimeRef.current - Date.now());
    } else {
      return;
    }
    setTotalSec((t) => t + 30);
    sync();
  }

  function subThirty() {
    const cut = (ms: number) => Math.max(1000, ms - 30000);
    if (pausedMsRef.current != null) {
      pausedMsRef.current = cut(pausedMsRef.current);
    } else if (endTimeRef.current != null) {
      const rem = cut(endTimeRef.current - Date.now());
      endTimeRef.current = Date.now() + rem;
      scheduleNotify(rem);
    } else {
      return;
    }
    setTotalSec((t) => Math.max(1, t - 30));
    sync();
  }

  function togglePause() {
    if (running) {
      pausedMsRef.current = Math.max(0, (endTimeRef.current ?? Date.now()) - Date.now());
      endTimeRef.current = null;
      window.clearTimeout(notifyTimerRef.current);
      setRunning(false);
    } else {
      if (pausedMsRef.current == null) return;
      endTimeRef.current = Date.now() + pausedMsRef.current;
      scheduleNotify(pausedMsRef.current);
      pausedMsRef.current = null;
      setRunning(true);
    }
  }

  function close() {
    clearTimers();
    endTimeRef.current = null;
    pausedMsRef.current = null;
    firedRef.current = true;
    setRunning(false);
    setVisible(false);
  }

  if (!visible) return null;

  const mins = Math.floor(remainingSec / 60);
  const pct = totalSec ? Math.min(1, remainingSec / totalSec) : 0;

  return (
    <div
      className="fixed left-0 right-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ bottom: "calc(94px + env(safe-area-inset-bottom))" }}
    >
      <div
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="glass edge-glow no-brackets rise pointer-events-auto touch-none w-full max-w-[300px]"
        style={{ transform: `translate(${pos.dx}px, ${pos.dy}px)`, cursor: "grab" }}
      >
        {/* แถบหัว = ที่จับสำหรับลากด้วย (ลากได้ทั้งใบอยู่แล้ว แต่หัวเป็นจุดที่นิ้วหาเจอง่ายสุด) */}
        <div className="panel-head flush">
          <span className="mark" />
          <span className="font-mono2 text-[8.5px] uppercase tracking-[.28em] shrink-0" style={{ color: "#c9d6ff" }}>
            Rest Timer
          </span>
          <span className="flex-1 min-w-[6px]" />
          {label && (
            <span className="font-mono2 text-[8.5px] max-w-[110px] truncate" style={{ color: "var(--dim)" }}>
              {label}
            </span>
          )}
          <button
            className="ml-1.5 shrink-0 flex items-center"
            style={{ color: "var(--dim)", background: "none", border: "none", padding: "2px 2px" }}
            onClick={close}
            aria-label={t("ปิดตัวจับเวลา", "Close timer")}
          >
            <Icon name="close" size={11} />
          </button>
        </div>

        <div className="px-3 pt-2.5 pb-3">
          <div className="text-center">
            <div className="font-mono2 text-[7.5px] tracking-[.3em]" style={{ color: "var(--dim)" }}>
              REMAINING
            </div>
            <div className="font-mono2 font-bold text-[34px] leading-none mt-1 num-glow" style={{ color: "var(--ink)" }}>
              {mins}:{String(remainingSec % 60).padStart(2, "0")}
            </div>
          </div>

          {/* แถบแบ่งช่อง 10 ช่อง — อ่านเป็น % ได้ทันทีโดยไม่ต้องคิดเลข */}
          <div className="seg-bar mt-2.5">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < Math.round(pct * 10) ? "on" : ""} />
            ))}
          </div>

          <div className="flex gap-1.5 mt-2.5">
            <button className="btn-gh flex-1 !py-2 !px-0 !text-[11px] font-mono2" onClick={subThirty}>
              −30
            </button>
            <button
              className="btn-gh flex-1 !py-2 !px-0 !text-[11px] font-mono2 flex items-center justify-center gap-1.5"
              onClick={togglePause}
            >
              <Icon name={running ? "pause" : "play"} size={10} />
              {running ? t("หยุด", "Pause") : t("ไปต่อ", "Resume")}
            </button>
            <button className="btn-gh flex-1 !py-2 !px-0 !text-[11px] font-mono2" onClick={addThirty}>
              +30
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RestTimer;
