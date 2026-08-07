// ตราแรงค์แบบเกม — หกเหลี่ยมโลหะ ขอบเรืองแสง มีปีกและมงกุฎตามระดับ
//
// ทำไมเป็น SVG ไม่ใช่รูป: ต้องคมทุกขนาด (แสดงในแอป 74px และวาดลงการ์ดแชร์ 1080px)
// และเปลี่ยนสีตามแรงค์ได้โดยไม่ต้องเตรียมไฟล์รูป 6 ใบ — bundle ไม่โต
//
// ความอลังการไล่ตามระดับ: E เปล่าๆ · D-C มีขีดข้าง · B ขึ้นไปมีปีก · S มีมงกุฎ
// ให้เห็นความต่างตั้งแต่ยังไม่ทันอ่านตัวอักษร

import type { Rank } from "../lib/rank";
import { RANKS, RANK_COLOR, RANK_COLOR2, RANK_STARS } from "../lib/rank";

// จุดหกเหลี่ยมยอดแหลม (pointy-top) — ทรงมาตรฐานของตราในเกม
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 90) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export default function RankEmblem({ rank, size = 120 }: { rank: Rank | null; size?: number }) {
  const r = rank ?? "E";
  const idx = RANKS.indexOf(r);
  const c1 = rank ? RANK_COLOR[r] : "#4a5670";
  const c2 = rank ? RANK_COLOR2[r] : "#2a3247";
  const stars = rank ? RANK_STARS[r] : 0;
  const uid = `rk${r}${rank ? "" : "n"}`;

  const W = 132;
  const H = 150;
  const cx = 66;
  const cy = 68;
  const R = 44;

  const wings = idx >= 3; // B ขึ้นไป
  const crown = idx >= 5; // S เท่านั้น

  return (
    <svg width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} aria-label={`แรงค์ ${rank ?? "ยังไม่มี"}`}>
      <defs>
        <linearGradient id={`${uid}p`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#131a33" />
          <stop offset="55%" stopColor="#0a0f24" />
          <stop offset="100%" stopColor="#050814" />
        </linearGradient>
        <linearGradient id={`${uid}e`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`${uid}g`}>
          <stop offset="0%" stopColor={c1} stopOpacity="0.55" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}f`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* แสงเรืองด้านหลัง */}
      <circle cx={cx} cy={cy} r={R + 24} fill={`url(#${uid}g)`} />

      {/* ปีกข้าง — B ขึ้นไป · เป็นแฉกเฉียงคล้ายปีกโลหะ ไม่ใช่ปีกนก */}
      {wings &&
        [-1, 1].map((s) => (
          <g key={s} transform={`translate(${cx + s * (R + 4)} ${cy}) scale(${s} 1)`} opacity={0.92}>
            <path d="M0 -16 L26 -9 L15 -3 L30 3 L13 6 L22 14 L0 15 Z" fill={`url(#${uid}e)`} filter={`url(#${uid}f)`} />
          </g>
        ))}

      {/* มงกุฎ — เฉพาะ S */}
      {crown && (
        <path
          d={`M${cx - 20} ${cy - R - 6} L${cx - 12} ${cy - R - 20} L${cx - 4} ${cy - R - 9} L${cx} ${cy - R - 24} L${cx + 4} ${cy - R - 9} L${cx + 12} ${cy - R - 20} L${cx + 20} ${cy - R - 6} Z`}
          fill={`url(#${uid}e)`}
          filter={`url(#${uid}f)`}
        />
      )}

      {/* ขอบนอก */}
      <polygon points={hexPoints(cx, cy, R)} fill={`url(#${uid}e)`} filter={`url(#${uid}f)`} />
      {/* แผ่นใน */}
      <polygon points={hexPoints(cx, cy, R - 4.5)} fill={`url(#${uid}p)`} />
      {/* เส้นในบางๆ ให้ดูเป็นโลหะสองชั้น */}
      <polygon
        points={hexPoints(cx, cy, R - 9)}
        fill="none"
        stroke={c1}
        strokeOpacity="0.42"
        strokeWidth="1"
      />

      {/* แสงสะท้อนมุมบนซ้าย — ทำให้ดูเป็นวัสดุมีผิว ไม่ใช่รูปแบน */}
      <polygon points={hexPoints(cx, cy, R - 5)} fill="#ffffff" opacity="0.05" clipPath={`url(#${uid}c)`} />
      <clipPath id={`${uid}c`}>
        <rect x="0" y="0" width={W} height={cy - 6} />
      </clipPath>

      {/* ขีดข้างซ้ายขวา — D ขึ้นไป จำนวนเพิ่มตามระดับ */}
      {idx >= 1 &&
        [-1, 1].map((s) =>
          Array.from({ length: Math.min(3, idx) }, (_, i) => (
            <rect
              key={`${s}-${i}`}
              x={cx + s * (R - 2) - (s < 0 ? 3 : 0)}
              y={cy - 10 + i * 8}
              width="3"
              height="5"
              fill={c1}
              opacity={0.75}
            />
          )),
        )}

      {/* ตัวอักษรแรงค์ */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="46"
        fontWeight="700"
        fill="#fff"
        style={{
          fontFamily: "'Chakra Petch', sans-serif",
          filter: `drop-shadow(0 0 10px ${c1})`,
          letterSpacing: "0.02em",
        }}
      >
        {rank ?? "?"}
      </text>

      {/* ดาวใต้ตรา — บอกระดับแบบที่เกมใช้ อ่านเร็วกว่าตัวอักษรอย่างเดียว */}
      <g transform={`translate(${cx} ${cy + R + 16})`}>
        {Array.from({ length: 5 }, (_, i) => {
          const on = i < stars;
          const x = (i - 2) * 13;
          return (
            <polygon
              key={i}
              points="0,-5.4 1.6,-1.7 5.5,-1.7 2.4,0.8 3.6,4.6 0,2.3 -3.6,4.6 -2.4,0.8 -5.5,-1.7 -1.6,-1.7"
              transform={`translate(${x} 0)`}
              fill={on ? c1 : "#1b2338"}
              stroke={on ? "none" : "#232c44"}
              strokeWidth="0.8"
              style={on ? { filter: `drop-shadow(0 0 4px ${c1})` } : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
}
