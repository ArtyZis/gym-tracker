// การ์ดสรุปรายสัปดาห์แชร์ได้ — วาดด้วย canvas ให้แคปแชร์ลง social

import type { Data, SetLog } from "./store";
import { computeStreak } from "./streak";
import { resolveAccent } from "./accent";


// ผสมสองสี hex — ใช้ทำพื้นหลังการ์ดให้อมสีธีมโดยไม่สว่างจนตัวหนังสืออ่านไม่ออก
function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number) => Math.round(x * t + y * (1 - t));
  return "#" + [m(r1, r2), m(g1, g2), m(b1, b2)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

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

export function drawWeeklyCard(stats: WeeklyStats, accent = "#4fd8ff"): HTMLCanvasElement {
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
  ctx.fillStyle = accent;
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
  ctx.fillStyle = accent;
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
    ctx.fillStyle = accent;
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
  ctx.fillStyle = accent;
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
      ctx.fillStyle = accent;
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
  const canvas = drawWeeklyCard(stats, resolveAccent(data.settings.accent));
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

import type { BestLift, Rank, RankResult } from "./rank";
import { RANKS } from "./rank";
import { RANK_COLOR, RANK_COLOR2, RANK_STARS, RANK_TH, bestLifts, computeRank } from "./rank";


// วาดตราแรงค์บน canvas — ต้องให้ออกมาเหมือน RankEmblem.tsx เพราะเป็นตราเดียวกัน
// (SVG ใช้ในแอป · canvas ใช้ในรูปแชร์ — ถ้าไม่เหมือนกันคนจะงงว่าทำไมตราคนละแบบ)
function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, rank: Rank | null): { top: number; bottom: number } {
  const r = rank ?? "E";
  const idx = RANKS.indexOf(r);
  const c1 = rank ? RANK_COLOR[r] : "#4a5670";
  const c2 = rank ? RANK_COLOR2[r] : "#2a3247";
  const stars = rank ? RANK_STARS[r] : 0;

  const hex = (radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = ((60 * i - 90) * Math.PI) / 180;
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  const edge = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  edge.addColorStop(0, c1);
  edge.addColorStop(1, c2);

  // ปีก — B ขึ้นไป
  if (idx >= 3) {
    ctx.save();
    ctx.fillStyle = edge;
    ctx.shadowColor = c1;
    ctx.shadowBlur = 24;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + s * (R + 14), cy);
      ctx.scale(s * (R / 44), R / 44);
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(26, -9); ctx.lineTo(15, -3);
      ctx.lineTo(30, 3); ctx.lineTo(13, 6); ctx.lineTo(22, 14); ctx.lineTo(0, 15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // มงกุฎ — S เท่านั้น
  if (idx >= 5) {
    ctx.save();
    ctx.fillStyle = edge;
    ctx.shadowColor = c1;
    ctx.shadowBlur = 26;
    const k = R / 44;
    ctx.beginPath();
    ctx.moveTo(cx - 20 * k, cy - R - 6 * k);
    ctx.lineTo(cx - 12 * k, cy - R - 22 * k);
    ctx.lineTo(cx - 4 * k, cy - R - 10 * k);
    ctx.lineTo(cx, cy - R - 27 * k);
    ctx.lineTo(cx + 4 * k, cy - R - 10 * k);
    ctx.lineTo(cx + 12 * k, cy - R - 22 * k);
    ctx.lineTo(cx + 20 * k, cy - R - 6 * k);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ขอบนอก + แผ่นใน
  ctx.save();
  ctx.shadowColor = c1;
  ctx.shadowBlur = 44;
  ctx.fillStyle = edge;
  hex(R);
  ctx.fill();
  ctx.restore();

  const plate = ctx.createLinearGradient(cx, cy - R, cx + R * 0.4, cy + R);
  plate.addColorStop(0, "#131a33");
  plate.addColorStop(0.55, "#0a0f24");
  plate.addColorStop(1, "#050814");
  ctx.fillStyle = plate;
  hex(R - R * 0.1);
  ctx.fill();

  ctx.strokeStyle = c1;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = Math.max(1, R / 44);
  hex(R - R * 0.2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ตัวอักษร
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = c1;
  ctx.shadowBlur = 34;
  ctx.font = `bold ${Math.round(R * 1.05)}px 'Chakra Petch', sans-serif`;
  ctx.fillText(rank ?? "?", cx, cy + R * 0.02);
  ctx.restore();

  // ดาว
  const sy = cy + R + R * 0.36;
  for (let i = 0; i < 5; i++) {
    const on = i < stars;
    const x = cx + (i - 2) * (R * 0.3);
    ctx.save();
    ctx.translate(x, sy);
    ctx.scale(R / 44, R / 44);
    ctx.fillStyle = on ? c1 : "#1b2338";
    if (on) { ctx.shadowColor = c1; ctx.shadowBlur = 12; }
    ctx.beginPath();
    const pts = [[0,-5.4],[1.6,-1.7],[5.5,-1.7],[2.4,0.8],[3.6,4.6],[0,2.3],[-3.6,4.6],[-2.4,0.8],[-5.5,-1.7],[-1.6,-1.7]];
    pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // คืนขอบเขตจริงของตรา (รวมมงกุฎด้านบนและดาวด้านล่าง)
  // ผู้เรียกต้องใช้ค่านี้วางเนื้อหาถัดไป ไม่ใช่เดาระยะเอาเอง
  // (เดาแล้วพลาด: ชื่อแรงค์เคยไปทับดาวเพราะคิดว่าตราจบที่ cy + R)
  const k = R / 44;
  return { top: cy - R - (idx >= 5 ? 27 * k : 0), bottom: sy + 6 * k };
}

export function drawRankCard(data: Data): HTMLCanvasElement {
  const W = 1080;

  const res: RankResult = computeRank(data);
  const allLifts: BestLift[] = bestLifts(data);

  // ── วางเลย์เอาต์ก่อนสร้าง canvas ──
  //
  // สัดส่วนต้องเป็นค่ามาตรฐานเท่านั้น (4:5 หรือ 3:4) ไม่ใช่ยืดตามเนื้อหาอิสระ
  // เพราะรูปที่สัดส่วนแปลกจะโดนโซเชียลครอปทิ้งเอง ผู้ใช้เห็นเป็น "รูปเพี้ยน"
  // (เคยยืดอิสระแล้วได้ 1080×1529 = 1.42 ซึ่งไม่ตรงกับสัดส่วนไหนเลย)
  //
  // เมื่อความสูงตายตัว จำนวนบรรทัดจึงต้องยอมตัด — ตัดที่ "สถิติสูงสุด" ซึ่งเรียงจาก
  // หนักสุดอยู่แล้ว แล้วบอกจำนวนที่เหลือไว้ท้ายรายการ ดีกว่าปล่อยให้ล้นออกนอกกรอบ
  const EMB_CY = 320;
  const EMB_R = 118;
  const ROW_MAIN = 48;
  const ROW_BEST = 44;
  const HEAD_GAP = 44; // จากหัวข้อย่อยถึงบรรทัดแรก
  const FOOT = 150; // ที่ว่างท้ายการ์ดสำหรับคำเตือน + ชื่อแอป

  const embBottom = EMB_CY + EMB_R + EMB_R * 0.36 + (EMB_R / 44) * 6;
  const nameY = embBottom + 58;
  const bodyY = res.bodyweight ? nameY + 38 : nameY;
  const lineY = bodyY + 32;
  let bestHeadY = lineY + 54;
  if (res.lifts.length) bestHeadY += HEAD_GAP + res.lifts.length * ROW_MAIN + 14;

  // เลือกจำนวนบรรทัดสถิติที่ใส่ได้จริงในการ์ดสูงสุด 3:4
  const lastRowY = (n: number) => bestHeadY + HEAD_GAP + Math.max(0, n - 1) * ROW_BEST;
  const MAX_H = 1440; // 3:4
  let shown = Math.min(7, allLifts.length);
  while (shown > 1 && lastRowY(shown) + (shown < allLifts.length ? ROW_BEST : 0) + FOOT > MAX_H) shown--;
  const lifts = allLifts.slice(0, shown);
  const more = allLifts.length - shown;

  const needed = lastRowY(shown) + (more > 0 ? ROW_BEST : 0) + FOOT;
  const H = needed <= 1350 ? 1350 : MAX_H; // 4:5 ถ้าพอ ไม่งั้น 3:4

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // สีธีมของผู้ใช้ — การ์ดที่แชร์ควรเป็นสีเดียวกับแอปที่เขาใช้อยู่ ไม่ใช่สีตายตัว
  // แต่ "ตราแรงค์" ยังใช้สีตามระดับเสมอ เพราะสีคือข้อมูล (E เทา ... S ทอง)
  // ถ้าย้อมตราด้วยสีธีมด้วย ทุกแรงค์จะหน้าตาเหมือนกันจนดูไม่ออกว่าใครอยู่ระดับไหน
  const theme = resolveAccent(data.settings.accent);
  const acc = theme;

  // พื้นหลัง
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mixHex(theme, "#05081a", 0.22));
  bg.addColorStop(0.55, "#05081a");
  bg.addColorStop(1, "#03050c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // กริดจางๆ ให้เข้าธีมหน้าต่างระบบ
  ctx.strokeStyle = theme + "14";
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

  // เรืองแสงหลังตรา
  const glow = ctx.createRadialGradient(W / 2, EMB_CY, 20, W / 2, EMB_CY, 300);
  glow.addColorStop(0, acc + "4d");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 30, W, 640);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#8fa4d4";
  ctx.font = "500 26px 'JetBrains Mono', monospace";
  ctx.fillText("S T R E N G T H   R A N K", W / 2, 116);

  // ตราแรงค์แบบเกม (หกเหลี่ยมโลหะ + ปีก + มงกุฎ) — ชุดเดียวกับที่แสดงในแอป
  drawEmblem(ctx, W / 2, EMB_CY, EMB_R, res.rank);

  ctx.fillStyle = "#e7edfb";
  ctx.font = "600 42px 'Chakra Petch', sans-serif";
  ctx.fillText(res.rank ? RANK_TH[res.rank] : "ข้อมูลยังไม่พอ", W / 2, nameY);

  if (res.bodyweight) {
    ctx.fillStyle = "#6d7fa8";
    ctx.font = "400 24px 'JetBrains Mono', monospace";
    ctx.fillText(`เทียบน้ำหนักตัว ${res.bodyweight} kg`, W / 2, bodyY);
  }

  // เส้นคั่น
  const line = ctx.createLinearGradient(120, 0, W - 120, 0);
  line.addColorStop(0, "transparent");
  line.addColorStop(0.5, acc);
  line.addColorStop(1, "transparent");
  ctx.fillStyle = line;
  ctx.fillRect(120, lineY, W - 240, 2);

  // ท่าหลัก + อัตราส่วน
  ctx.textAlign = "left";
  let y = lineY + 54;
  if (res.lifts.length) {
    ctx.fillStyle = "#8fa4d4";
    ctx.font = "500 22px 'JetBrains Mono', monospace";
    ctx.fillText("ท่าหลัก (1RM ประเมิน / น้ำหนักตัว)", 90, y);
    y += HEAD_GAP;
    for (const l of res.lifts) {
      ctx.fillStyle = "#dbe4f7";
      ctx.font = "500 32px 'Chakra Petch', sans-serif";
      ctx.fillText(l.label, 90, y);
      ctx.textAlign = "right";
      ctx.fillStyle = RANK_COLOR[l.rank];
      ctx.font = "600 30px 'JetBrains Mono', monospace";
      ctx.fillText(`${l.oneRM} kg · ${l.ratio}x · ${l.rank}`, W - 90, y);
      ctx.textAlign = "left";
      y += ROW_MAIN;
    }
    y += 14;
  }

  // สถิติสูงสุดรายท่า
  ctx.fillStyle = "#8fa4d4";
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  ctx.fillText("สถิติสูงสุดที่เคยทำ", 90, y);
  y += HEAD_GAP;
  for (const l of lifts) {
    ctx.fillStyle = "#c3cfe6";
    ctx.font = "400 29px 'Chakra Petch', sans-serif";
    const name = l.name.length > 26 ? l.name.slice(0, 25) + "…" : l.name;
    ctx.fillText(name, 90, y);
    ctx.textAlign = "right";
    ctx.fillStyle = theme;
    ctx.font = "500 27px 'JetBrains Mono', monospace";
    ctx.fillText(`${l.weight} ${l.unit} × ${l.reps} · ${l.sets} เซต`, W - 90, y);
    ctx.textAlign = "left";
    y += ROW_BEST;
  }

  // บอกตรงๆ ว่าตัดไปกี่ท่า ดีกว่าให้คนคิดว่าแอปจำสถิติได้แค่นี้
  if (more > 0) {
    ctx.fillStyle = "#4a5a7d";
    ctx.font = "400 24px 'Chakra Petch', sans-serif";
    ctx.fillText(`และอีก ${more} ท่า`, 90, y);
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
