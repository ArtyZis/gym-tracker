// การ์ดสรุปรายสัปดาห์แชร์ได้ — วาดด้วย canvas ให้แคปแชร์ลง social

import type { Data, SetLog } from "./store";
import { computeStreak } from "./streak";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export interface WeeklyStats {
  fromDate: string;
  toDate: string;
  volume: number;
  setsDone: number;
  daysTrained: number;
  streak: number;
  newPRs: { name: string; weight: number; unit: string }[];
}

export function weeklyStats(data: Data): WeeklyStats {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const fromKey = dateKey(monday);
  const toKey = dateKey(now);

  let volume = 0;
  let setsDone = 0;
  const days = new Set<string>();
  const newPRs: WeeklyStats["newPRs"] = [];

  for (const ex of data.exercises) {
    const sessions = data.history[ex.id] || [];
    let priorBest = 0;
    let weekBest = 0;
    for (const s of sessions) {
      const inWeek = s.date >= fromKey && s.date <= toKey;
      for (const st of s.sets.filter(Boolean) as SetLog[]) {
        const w = st.weight || 0;
        if (inWeek) {
          setsDone++;
          days.add(s.date);
          if (w && st.reps) volume += w * st.reps;
          if (w > weekBest) weekBest = w;
        } else if (s.date < fromKey && w > priorBest) {
          priorBest = w;
        }
      }
    }
    if (ex.type === "weight" && weekBest > priorBest && priorBest > 0)
      newPRs.push({ name: ex.name, weight: weekBest, unit: ex.unit || "kg" });
  }
  newPRs.sort((a, b) => b.weight - a.weight);

  return {
    fromDate: fromKey,
    toDate: toKey,
    volume: Math.round(volume),
    setsDone,
    daysTrained: days.size,
    streak: computeStreak(data).current,
    newPRs,
  };
}

const thDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });

export function drawWeeklyCard(stats: WeeklyStats): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // พื้นหลังธีมเดิม: มืด + glow ฟ้า
  ctx.fillStyle = "#04070D";
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(W / 2, -80, 0, W / 2, -80, 900);
  g.addColorStop(0, "rgba(61,123,255,.22)");
  g.addColorStop(1, "rgba(61,123,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W, H + 100, 0, W, H + 100, 800);
  g.addColorStop(0, "rgba(79,216,255,.14)");
  g.addColorStop(1, "rgba(79,216,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const disp = '"Chakra Petch","Noto Sans Thai",sans-serif';
  const thai = '"Noto Sans Thai","Chakra Petch",sans-serif';
  const mono = '"JetBrains Mono",monospace';

  // header
  ctx.textAlign = "left";
  ctx.fillStyle = "#1F6F8A";
  ctx.font = `600 30px ${mono}`;
  ctx.fillText("H Y P E R T R O P H Y   S Y S T E M", 80, 120);
  ctx.fillStyle = "#EAF4FF";
  ctx.shadowColor = "rgba(79,216,255,.55)";
  ctx.shadowBlur = 26;
  ctx.font = `700 76px ${disp}`;
  ctx.fillText("สรุปสัปดาห์", 80, 216);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#7E93AC";
  ctx.font = `500 36px ${thai}`;
  ctx.fillText(`${thDate(stats.fromDate)} – ${thDate(stats.toDate)}`, 80, 278);

  // เส้นคั่น
  ctx.strokeStyle = "rgba(140,205,255,.18)";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(80, 330);
  ctx.lineTo(W - 80, 330);
  ctx.stroke();
  ctx.setLineDash([]);

  // volume ใหญ่
  ctx.fillStyle = "#4FD8FF";
  ctx.shadowColor = "rgba(79,216,255,.65)";
  ctx.shadowBlur = 40;
  ctx.font = `700 170px ${disp}`;
  ctx.fillText(stats.volume.toLocaleString(), 80, 540);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#7E93AC";
  ctx.font = `500 40px ${thai}`;
  ctx.fillText("kg ที่ยกทั้งสัปดาห์", 84, 608);

  // กล่องสถิติ 3 ช่อง
  const boxes = [
    { label: "เซตที่ทำ", value: String(stats.setsDone) },
    { label: "วันที่ฝึก", value: String(stats.daysTrained) },
    { label: "สตรีค (วัน)", value: String(stats.streak) },
  ];
  const bw = (W - 160 - 2 * 24) / 3;
  boxes.forEach((b, i) => {
    const x = 80 + i * (bw + 24);
    const y = 680;
    ctx.fillStyle = "rgba(120,200,255,.07)";
    ctx.strokeStyle = "rgba(140,205,255,.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, 210, 26);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4FD8FF";
    ctx.font = `700 86px ${disp}`;
    ctx.textAlign = "center";
    ctx.fillText(b.value, x + bw / 2, y + 118);
    ctx.fillStyle = "#7E93AC";
    ctx.font = `500 30px ${thai}`;
    ctx.fillText(b.label, x + bw / 2, y + 172);
    ctx.textAlign = "left";
  });

  // PR ใหม่
  let y = 1010;
  ctx.fillStyle = "#1F6F8A";
  ctx.font = `600 28px ${mono}`;
  ctx.fillText("NEW PR", 80, y);
  y += 62;
  if (stats.newPRs.length) {
    for (const pr of stats.newPRs.slice(0, 3)) {
      ctx.fillStyle = "#4ADE9C";
      ctx.font = `600 40px ${disp}`;
      ctx.fillText("⚡", 80, y);
      ctx.fillStyle = "#EAF4FF";
      ctx.font = `600 40px ${thai}`;
      ctx.fillText(pr.name, 140, y);
      ctx.fillStyle = "#4FD8FF";
      ctx.font = `700 40px ${mono}`;
      ctx.textAlign = "right";
      ctx.fillText(`${pr.weight} ${pr.unit}`, W - 80, y);
      ctx.textAlign = "left";
      y += 66;
    }
  } else {
    ctx.fillStyle = "#3E5068";
    ctx.font = `500 34px ${thai}`;
    ctx.fillText("สัปดาห์นี้ยังไม่มี PR ใหม่ — สัปดาห์หน้าจัดไป", 80, y);
  }

  // footer
  ctx.fillStyle = "#3E5068";
  ctx.font = `600 30px ${disp}`;
  ctx.fillText("GYM TRACKER BY ARTYZ", 80, H - 70);

  return canvas;
}

export async function shareWeeklyCard(data: Data): Promise<"shared" | "downloaded" | "failed"> {
  const stats = weeklyStats(data);
  const canvas = drawWeeklyCard(stats);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return "failed";
  const file = new File([blob], "gym-week.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "สรุปสัปดาห์ Gym Tracker" });
      return "shared";
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return "shared"; // ผู้ใช้ปิด share sheet เอง
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gym-week.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

// ══════════ การ์ดสถิติสูงสุด + แรงค์ ══════════
//
// ต่างจากการ์ดสรุปสัปดาห์: อันนั้นบอก "สัปดาห์นี้ทำอะไรไป" อันนี้บอก "ตอนนี้แข็งแรงแค่ไหน"
// จึงเหมาะกับการแชร์อวดกันข้ามคน เพราะเทียบกันได้จริงด้วยอัตราส่วนต่อน้ำหนักตัว

import type { BestLift, RankResult } from "./rank";
import { RANK_COLOR, RANK_TH, bestLifts, computeRank } from "./rank";

export function drawRankCard(data: Data): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const res: RankResult = computeRank(data);
  const lifts: BestLift[] = bestLifts(data).slice(0, 8);
  const acc = res.rank ? RANK_COLOR[res.rank] : "#8b6bff";

  // พื้นหลัง
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a1030");
  bg.addColorStop(0.55, "#05081a");
  bg.addColorStop(1, "#03050c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // กริดจางๆ ให้เข้าธีมหน้าต่างระบบ
  ctx.strokeStyle = "rgba(139,107,255,.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // เรืองแสงหลังตัวแรงค์
  const glow = ctx.createRadialGradient(W / 2, 400, 20, W / 2, 400, 340);
  glow.addColorStop(0, acc + "55");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 60, W, 700);

  ctx.textAlign = "center";

  ctx.fillStyle = "#8fa4d4";
  ctx.font = "500 26px 'JetBrains Mono', monospace";
  ctx.fillText("S T R E N G T H   R A N K", W / 2, 150);

  // ตัวอักษรแรงค์
  ctx.fillStyle = acc;
  ctx.shadowColor = acc;
  ctx.shadowBlur = 60;
  ctx.font = "bold 300px 'Chakra Petch', sans-serif";
  ctx.fillText(res.rank ?? "?", W / 2, 500);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#e7edfb";
  ctx.font = "600 40px 'Chakra Petch', sans-serif";
  ctx.fillText(res.rank ? RANK_TH[res.rank] : "ข้อมูลยังไม่พอ", W / 2, 570);

  if (res.bodyweight)
    { ctx.fillStyle = "#6d7fa8";
      ctx.font = "400 24px 'JetBrains Mono', monospace";
      ctx.fillText(`เทียบน้ำหนักตัว ${res.bodyweight} kg`, W / 2, 612); }

  // เส้นคั่น
  const line = ctx.createLinearGradient(120, 0, W - 120, 0);
  line.addColorStop(0, "transparent");
  line.addColorStop(0.5, acc);
  line.addColorStop(1, "transparent");
  ctx.fillStyle = line;
  ctx.fillRect(120, 660, W - 240, 2);

  // ท่าหลัก + อัตราส่วน
  ctx.textAlign = "left";
  let y = 730;
  if (res.lifts.length) {
    ctx.fillStyle = "#8fa4d4";
    ctx.font = "500 22px 'JetBrains Mono', monospace";
    ctx.fillText("ท่าหลัก (1RM ประเมิน / น้ำหนักตัว)", 90, y);
    y += 46;
    for (const l of res.lifts) {
      ctx.fillStyle = "#dbe4f7";
      ctx.font = "500 32px 'Chakra Petch', sans-serif";
      ctx.fillText(l.label, 90, y);
      ctx.textAlign = "right";
      ctx.fillStyle = RANK_COLOR[l.rank];
      ctx.font = "600 30px 'JetBrains Mono', monospace";
      ctx.fillText(`${l.oneRM} kg · ${l.ratio}x · ${l.rank}`, W - 90, y);
      ctx.textAlign = "left";
      y += 50;
    }
    y += 16;
  }

  // สถิติสูงสุดรายท่า
  ctx.fillStyle = "#8fa4d4";
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  ctx.fillText("สถิติสูงสุดที่เคยทำ", 90, y);
  y += 46;
  for (const l of lifts.slice(0, 7)) {
    ctx.fillStyle = "#c3cfe6";
    ctx.font = "400 29px 'Chakra Petch', sans-serif";
    const name = l.name.length > 26 ? l.name.slice(0, 25) + "…" : l.name;
    ctx.fillText(name, 90, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#8b6bff";
    ctx.font = "500 27px 'JetBrains Mono', monospace";
    ctx.fillText(`${l.weight} ${l.unit} × ${l.reps} · ${l.sets} เซต`, W - 90, y);
    ctx.textAlign = "left";
    y += 44;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#4a5a7d";
  ctx.font = "400 20px 'JetBrains Mono', monospace";
  ctx.fillText("แรงค์เป็นค่าประเมินจากมาตรฐานความแข็งแรงทั่วไป", W / 2, H - 110);
  ctx.fillStyle = "#6d7fa8";
  ctx.font = "600 26px 'Chakra Petch', sans-serif";
  ctx.fillText("GYM TRACKER BY ARTYZ", W / 2, H - 62);

  return canvas;
}

export async function shareRankCard(data: Data): Promise<"shared" | "downloaded" | "failed"> {
  const canvas = drawRankCard(data);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return "failed";
  const file = new File([blob], "gym-rank.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "สถิติและแรงค์ Gym Tracker" });
      return "shared";
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return "shared";
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gym-rank.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
