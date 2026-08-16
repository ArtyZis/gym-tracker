// บีบอัดโค้ดย้ายข้อมูล — โค้ดยาวเกินจนส่งไลน์ไม่ได้
//
// ปัญหาจริงที่เจอ: ผู้ใช้ที่ฝึกมา 3 สัปดาห์ได้โค้ดยาว 28,446 ตัวอักษร
// ไลน์ส่งข้อความได้ราว 10,000 ตัวอักษร -> โค้ดโดนตัด -> กู้ข้อมูลไม่ได้
// และยิ่งใช้นานยิ่งยาว คนที่ฝึกครบปีจะส่งไม่ได้แน่นอน
//
// สาเหตุ: เดิมเป็น JSON ดิบ -> base64 ตรงๆ ไม่บีบอัดเลย base64 บวกขนาดอีก 33%
// แถม JSON ซ้ำคำเดิมเยอะมาก ("weight" "reps" "at" ทุกเซต) = บีบได้ดีมาก
//
// ใช้ CompressionStream ที่เบราว์เซอร์มีในตัว (Safari 16.4+ / Chrome 80+)
// ไม่ต้องเพิ่ม dependency ตามข้อกำหนดเรื่อง bundle size
//
// ── รูปแบบโค้ด ──
//   "RFZ1:<base64 ของ gzip>"   แบบใหม่ บีบอัดแล้ว
//   "<base64 ของ JSON>"         แบบเก่า ไม่มีหัว — **ต้องอ่านได้ตลอดไป**
//
// เลือกใส่หัวนำหน้าแทนการเดาจากเนื้อ เพราะเดาผิดแม้ครั้งเดียว = ผู้ใช้กู้ข้อมูลไม่ได้
// และ "RFZ1" ไม่ใช่ base64 ที่ถูกต้องของ JSON ที่ขึ้นต้นด้วย "{" จึงชนกันไม่ได้

const PREFIX = "RFZ1:";

// btoa รับได้แค่ไบต์ latin1 — ข้อความไทยต้องผ่าน UTF-8 ก่อน (แพตเทิร์นเดิมทั้งโปรเจกต์)
const utf8ToB64 = (s: string): string => btoa(unescape(encodeURIComponent(s)));
const b64ToUtf8 = (s: string): string => decodeURIComponent(escape(atob(s)));

const bytesToB64 = (bytes: Uint8Array): string => {
  // แปลงทีละก้อน — สตริงยาวหลักแสนตัวทำให้ String.fromCharCode(...arr) สแตกล้น
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(out);
};

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const hasCompression = (): boolean => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

// รับ CompressionStream/DecompressionStream — ฝั่ง writable ของมันประกาศเป็น BufferSource
// จึงไม่ตรงกับ TransformStream<Uint8Array, Uint8Array> เป๊ะๆ ใช้ชนิดกว้างกว่าแทน
async function pipe(bytes: Uint8Array, stream: { readable: ReadableStream<Uint8Array>; writable: WritableStream<BufferSource> }): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart]);
  const buf = await new Response(blob.stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * สร้างโค้ดย้ายข้อมูล — บีบอัดถ้าเบราว์เซอร์รองรับ
 *
 * เบราว์เซอร์เก่าที่ไม่มี CompressionStream ได้โค้ดแบบเดิม (ยาวแต่ยังใช้ได้)
 * ดีกว่าขึ้น error แล้วย้ายข้อมูลไม่ได้เลย
 */
export async function encodeTransferCode(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  if (!hasCompression()) return utf8ToB64(json);
  try {
    const gz = await pipe(new TextEncoder().encode(json), new CompressionStream("gzip"));
    return PREFIX + bytesToB64(gz);
  } catch {
    return utf8ToB64(json); // บีบไม่ได้ก็ยังต้องได้โค้ด
  }
}

/**
 * ถอดโค้ดกลับเป็น JSON string — รับได้ทั้งแบบใหม่และแบบเก่า
 *
 * คืน null เมื่อถอดไม่ได้ ให้ผู้เรียกแจ้งผู้ใช้ (ห้าม throw ขึ้นไปทำแอปล้ม)
 */
export async function decodeTransferCode(code: string): Promise<string | null> {
  const c = code.trim();
  if (!c || c.length > 5_000_000) return null; // กัน payload ยักษ์ที่หน่วงเบราว์เซอร์
  try {
    if (!c.startsWith(PREFIX)) return b64ToUtf8(c); // โค้ดเก่า ไม่มีหัว
    if (!hasCompression()) return null; // โค้ดใหม่แต่เบราว์เซอร์เก่าเกิน — บอกไม่ได้ดีกว่าเดาผิด
    const raw = await pipe(b64ToBytes(c.slice(PREFIX.length)), new DecompressionStream("gzip"));
    return new TextDecoder().decode(raw);
  } catch {
    return null;
  }
}

export const isCompressedCode = (code: string): boolean => code.trim().startsWith(PREFIX);
