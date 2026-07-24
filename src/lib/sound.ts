// เสียงสั้นๆ ตอบสนองการกด — เบา ไม่รำคาญ ปิดได้จาก settings
// ใช้ Web Audio สังเคราะห์เอง ไม่ต้องโหลดไฟล์เสียง (bundle เล็ก + ทำงาน offline)

let ctx: AudioContext | null = null;
let enabled = true; // ตั้งจาก settings ผ่าน setSoundEnabled

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

// ต้องเรียกใน user-gesture ครั้งแรก (กดปุ่ม) ไม่งั้น iOS บล็อกเสียง
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx?.state === "suspended") ctx.resume();
  } catch {
    /* ไม่มีเสียงก็ทำงานต่อได้ */
  }
}

// โน้ตเดียว: ความถี่, ความยาว, ความดัง, รูปคลื่น
function tone(freq: number, dur: number, gain = 0.18, type: OscillatorType = "sine", startAt = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ติ๊กเซตปกติ — click สั้นเบามาก
export function playTick() {
  if (!enabled) return;
  unlockAudio();
  tone(660, 0.05, 0.12, "triangle");
}

// ครบทุกเซตของท่า — สองโน้ตไล่ขึ้น
export function playExerciseDone() {
  if (!enabled) return;
  unlockAudio();
  tone(660, 0.09, 0.16, "sine", 0);
  tone(880, 0.12, 0.16, "sine", 0.08);
}

// ทำ PR ใหม่ — อาร์เพจิโอสั้น
export function playPR() {
  if (!enabled) return;
  unlockAudio();
  tone(659, 0.1, 0.18, "sine", 0);
  tone(880, 0.1, 0.18, "sine", 0.08);
  tone(1319, 0.22, 0.2, "sine", 0.16);
}

// พักครบ — beep คู่โดดเด่น (เดิมอยู่ใน RestTimer)
export function playRestDone() {
  // เสียงพักครบดังได้แม้ปิดเสียงติ๊ก เพราะเป็นการแจ้งเตือนสำคัญ
  unlockAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.setValueAtTime(1320, t + 0.11);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.6);
}
