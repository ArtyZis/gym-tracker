import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { haptics } from "../lib/haptics";
import { playRestDone, unlockAudio } from "../lib/sound";

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
      const title = "พักครบแล้ว 💪";
      const opts: NotificationOptions = { body: label ? `${label} — เซตต่อไป` : "กลับไปยกเซตต่อได้เลย", tag: "rest-done" };
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
  const circ = 2 * Math.PI * 17;
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
        className="glass edge-glow flex items-center gap-2 pl-1.5 pr-2 py-2 rise pointer-events-auto max-w-full touch-none"
        style={{ transform: `translate(${pos.dx}px, ${pos.dy}px)`, cursor: "grab" }}
      >
        {/* handle ลาก */}
        <div className="flex flex-col gap-[3px] px-1.5 shrink-0" style={{ cursor: "grab" }} aria-label="ลากเพื่อย้าย">
          <span className="w-[3px] h-[3px] rounded-full" style={{ background: "var(--dim)" }} />
          <span className="w-[3px] h-[3px] rounded-full" style={{ background: "var(--dim)" }} />
          <span className="w-[3px] h-[3px] rounded-full" style={{ background: "var(--dim)" }} />
        </div>

        <div className="relative w-[42px] h-[42px] shrink-0">
          <svg width="42" height="42" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="22" cy="22" r={17} stroke="rgba(120,180,255,.15)" strokeWidth="3.5" fill="none" />
            <circle
              cx="22"
              cy="22"
              r={17}
              stroke="var(--cyan)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              style={{ transition: "stroke-dashoffset .3s linear", filter: "drop-shadow(0 0 5px color-mix(in srgb, var(--acc) 60%, transparent))" }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-mono2 text-[10px] font-bold"
            style={{ color: "var(--cyan)" }}
          >
            {mins}:{String(remainingSec % 60).padStart(2, "0")}
          </span>
        </div>

        {label && (
          <span className="font-mono2 text-[9.5px] max-w-[62px] truncate shrink" style={{ color: "var(--mut)" }}>
            {label}
          </span>
        )}

        <button className="btn-gh !py-2 !px-2 !text-[11px] font-mono2 shrink-0" onClick={subThirty}>
          −30
        </button>
        <button className="btn-gh !py-2 !px-2 !text-[11px] font-mono2 shrink-0" onClick={addThirty}>
          +30
        </button>
        <button className="btn-gh !py-2 !px-2.5 !text-[11px] font-mono2 shrink-0" onClick={togglePause}>
          {running ? "❚❚" : "▶"}
        </button>
        <button
          className="w-9 h-9 rounded-xl shrink-0 text-[14px] flex items-center justify-center"
          style={{ color: "var(--mut)", background: "rgba(6,12,22,.5)", border: "1px solid var(--edge)" }}
          onClick={close}
        >
          ✕
        </button>
      </div>
    </div>
  );
});

export default RestTimer;
