// คลังท่าออกกำลังกายหลักของโลก — ใช้ตอนเพิ่มท่า/เปลี่ยนท่า ให้ค้นเจอง่ายทั้งไทยและอังกฤษ
//
// แต่ละท่ามีข้อมูลพอให้ระบบตั้งค่าเริ่มต้นที่สมเหตุสมผลให้เลย ผู้ใช้ไม่ต้องกรอกเอง:
//   equip -> กำหนดหน่วย (kg / kg ต่อข้าง), ระยะขยับน้ำหนัก (inc), และธง machine
//   sets/rmin/rmax -> ช่วงที่งานวิจัยรองรับสำหรับท่านั้น (compound เรปต่ำ / isolation เรปสูง)
//   tip -> คำแนะนำสั้น ๆ เน้นจุดที่คนทำพลาดบ่อย
// เวลาพักไม่ต้องเก็บที่นี่ — suggestRest() ใน progression.ts คำนวณจากชนิดท่า+ช่วงเรปให้อยู่แล้ว

import type { ExType } from "./store";
import type { MuscleKey } from "./analyzer";

export type Equip = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "band" | "other";

export const EQUIP_TH: Record<Equip, string> = {
  barbell: "บาร์เบล",
  dumbbell: "ดัมเบล",
  machine: "เครื่อง",
  cable: "เคเบิล",
  bodyweight: "น้ำหนักตัว",
  band: "ยางยืด",
  other: "อื่นๆ",
};

export interface ExTemplate {
  name: string; // ชื่ออังกฤษมาตรฐาน (ใช้เป็น id จับคู่ประวัติ)
  th: string; // คำค้นภาษาไทย (ชื่อที่คนไทยเรียก — ใส่หลายคำได้ คั่นด้วยช่องว่าง)
  muscle: MuscleKey;
  equip: Equip;
  type: ExType;
  sets: number;
  rmin: number;
  rmax: number;
  amrap?: boolean;
  tip: string;
}

// prettier-ignore
export const EXERCISE_DB: ExTemplate[] = [
  // ── อก (chest) ──
  { name: "Barbell Bench Press", th: "เบนช์เพรส บาร์เบล อก นอนดัน", muscle: "chest", equip: "barbell", type: "weight", sets: 4, rmin: 5, rmax: 8, tip: "สะบักหุบล็อกไว้ ลดบาร์แตะอกช่วงหัวนม ข้อศอกทำมุม ~45° กับลำตัว" },
  { name: "Incline Barbell Press", th: "อกบน เอียง บาร์เบล", muscle: "chest", equip: "barbell", type: "weight", sets: 4, rmin: 6, rmax: 10, tip: "ปรับเบาะ 30-45° ถ้าชันเกินจะกลายเป็นเล่นไหล่" },
  { name: "Dumbbell Bench Press", th: "เบนช์ ดัมเบล อก", muscle: "chest", equip: "dumbbell", type: "weight", sets: 4, rmin: 6, rmax: 12, tip: "ช่วงยืดกว้างกว่าบาร์เบล ลงช้าๆ ให้รู้สึกอกยืดสุด" },
  { name: "Incline DB Press", th: "อกบน ดัมเบล เอียง", muscle: "chest", equip: "dumbbell", type: "weight", sets: 4, rmin: 6, rmax: 10, tip: "เน้นอกส่วนบน อย่าให้ดัมเบลชนกันด้านบน คงแรงตึงไว้" },
  { name: "Dumbbell Fly", th: "ฟลาย ดัมเบล กางอก", muscle: "chest", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "งอศอกเล็กน้อยค้างไว้ตลอด นึกภาพกอดต้นไม้ ห้ามงอ-เหยียดศอก" },
  { name: "Cable Fly", th: "เคเบิลฟลาย ไขว้สาย อก", muscle: "chest", equip: "cable", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ทั้งช่วง บีบอกค้าง 1 วิตอนสายไขว้กัน" },
  { name: "Pec Deck", th: "เพคเดค เครื่องหนีบอก", muscle: "chest", equip: "machine", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "เหมาะเป็นท่าปิดท้าย ควบคุมจังหวะกลับช้าๆ" },
  { name: "Chest Press Machine", th: "เครื่องดันอก", muscle: "chest", equip: "machine", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปรับเบาะให้มือระดับกลางอก ปลอดภัยกว่าฟรีเวทเมื่อเล่นคนเดียว" },
  { name: "Push-up", th: "วิดพื้น ดันพื้น", muscle: "chest", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 10, rmax: 25, tip: "ลำตัวตรงเป็นเส้นเดียว เกร็งท้อง อย่าให้สะโพกตก" },
  { name: "Wide Push-up", th: "วิดพื้นกว้าง", muscle: "chest", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "มือกว้างกว่าไหล่ ~1.5 เท่า เน้นอกด้านนอก" },
  { name: "Decline Push-up", th: "วิดพื้นเท้าสูง", muscle: "chest", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "ยกเท้าสูงขึ้นเพื่อเน้นอกบน ยิ่งสูงยิ่งหนัก" },
  { name: "Dip", th: "ดิป ยันตัว", muscle: "chest", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 6, rmax: 15, tip: "โน้มตัวไปหน้าเน้นอก ตั้งตัวตรงเน้นไตรเซป" },

  // ── หลัง (back) ──
  { name: "Deadlift", th: "เดดลิฟต์ ดึงพื้น", muscle: "back", equip: "barbell", type: "weight", sets: 3, rmin: 3, rmax: 6, tip: "หลังตรงตลอด ดันพื้นด้วยขา บาร์ชิดหน้าแข้ง — ท่าหนักสุด พักให้เต็ม" },
  { name: "Barbell Row", th: "โรว์ บาร์เบล ดึงหลัง", muscle: "back", equip: "barbell", type: "weight", sets: 4, rmin: 6, rmax: 10, tip: "โน้มตัว ~45° ดึงบาร์เข้าท้องน้อย บีบสะบักสุด" },
  { name: "Pendlay Row", th: "เพนด์เลย์โรว์", muscle: "back", equip: "barbell", type: "weight", sets: 4, rmin: 5, rmax: 8, tip: "วางบาร์แตะพื้นทุกครั้ง ระเบิดแรงขึ้นเร็ว หลังขนานพื้น" },
  { name: "T-Bar Row", th: "ทีบาร์โรว์", muscle: "back", equip: "machine", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "หน้าอกดันแผ่นรอง ลดการโกงด้วยหลังล่าง" },
  { name: "Dumbbell Row", th: "โรว์ ดัมเบล ข้างเดียว", muscle: "back", equip: "dumbbell", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดึงข้อศอกไปด้านหลัง อย่าบิดลำตัวช่วย" },
  { name: "Seated Cable Row", th: "โรว์เคเบิล นั่งดึง", muscle: "back", equip: "cable", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "อกตั้ง ดึงเข้าท้อง ปล่อยกลับให้สะบักยืดสุด" },
  { name: "Chest Supported Row", th: "โรว์พิงอก", muscle: "back", equip: "machine", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "อกแนบเบาะ ตัดหลังล่างออกจากสมการ เล่นหลังล้วน" },
  { name: "Lat Pulldown", th: "แลทพูลดาวน์ ดึงบน", muscle: "back", equip: "machine", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดึงข้อศอกลงหาสะโพก อย่าเอนหลังมากเกิน" },
  { name: "Wide Grip Pull-up", th: "พูลอัพ ดึงข้อ จับกว้าง", muscle: "back", equip: "bodyweight", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true, tip: "เริ่มจากแขวนสุด ดึงจนคางพ้นบาร์ ลงช้า" },
  { name: "Chin-up", th: "ชินอัพ ดึงข้อหงายมือ", muscle: "back", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "หงายมือ ได้ไบเซปเยอะกว่าพูลอัพ" },
  { name: "Australian Row", th: "โรว์นอน ดึงตัวใต้บาร์", muscle: "back", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "ท่าเริ่มต้นก่อนไปพูลอัพ ยิ่งตัวขนานพื้นยิ่งหนัก" },
  { name: "Straight Arm Pulldown", th: "ดึงแขนตรง", muscle: "back", equip: "cable", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แขนตรงตลอด เน้นแลทล้วน ไม่ใช้ไบเซป" },
  { name: "Dumbbell Pullover", th: "พูลโอเวอร์", muscle: "back", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ยืดซี่โครงและแลท ควบคุมช่วงลงหลังศีรษะ" },
  { name: "Barbell Shrug", th: "ชรัก ยักไหล่ ทราพ", muscle: "back", equip: "barbell", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ยักตรงขึ้น ค้าง 1 วิ ไม่ต้องหมุนไหล่" },

  // ── ไหล่ (shoulders) ──
  { name: "Overhead Press", th: "โอเวอร์เฮดเพรส ดันบ่า บาร์เบล", muscle: "shoulders", equip: "barbell", type: "weight", sets: 4, rmin: 5, rmax: 8, tip: "เกร็งก้นและท้อง ดันขึ้นตรงหัว หลังไม่แอ่น" },
  { name: "Overhead Press (DB)", th: "ดันไหล่ ดัมเบล", muscle: "shoulders", equip: "dumbbell", type: "weight", sets: 3, rmin: 6, rmax: 10, tip: "ช่วงเคลื่อนไหวอิสระกว่าบาร์ เหมาะกับคนไหล่ติด" },
  { name: "Arnold Press", th: "อาร์โนลด์เพรส", muscle: "shoulders", equip: "dumbbell", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "หมุนข้อมือระหว่างดัน โดนไหล่ทั้งหน้าและกลาง" },
  { name: "Lateral Raise", th: "กางข้าง ยกข้าง ไหล่กลาง", muscle: "shoulders", equip: "dumbbell", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "ยกแค่ระดับไหล่ เอียงนิ้วก้อยขึ้นนิด ใช้น้ำหนักเบาแต่คุมให้นิ่ง" },
  { name: "Cable Lateral Raise", th: "กางข้างเคเบิล", muscle: "shoulders", equip: "cable", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ตลอดช่วง ดีกว่าดัมเบลตรงช่วงล่าง" },
  { name: "Face Pull", th: "เฟซพูล ดึงหน้า ไหล่หลัง", muscle: "shoulders", equip: "cable", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "ดึงเข้าหาหน้าผาก กางศอกออก แก้ไหล่ห่อได้ดีมาก" },
  { name: "Rear Delt Fly", th: "ไหล่หลัง กางหลัง", muscle: "shoulders", equip: "dumbbell", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "โน้มตัวขนานพื้น ยกออกข้าง ไม่ใช่ขึ้นบน" },
  { name: "Upright Row", th: "อัพไรท์โรว์ ดึงตั้ง", muscle: "shoulders", equip: "barbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "จับกว้างหน่อยลดการบีบข้อไหล่ ดึงแค่ระดับอก" },
  { name: "Shoulder Press Machine", th: "เครื่องดันไหล่", muscle: "shoulders", equip: "machine", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปรับเบาะให้มือจับระดับหู ปลอดภัยเมื่อเล่นหนักคนเดียว" },
  { name: "Pike Push-up", th: "วิดพื้นก้นโด่ง", muscle: "shoulders", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, tip: "ยกก้นสูง ศีรษะลงระหว่างมือ — ท่าไหล่แบบไม่ใช้อุปกรณ์" },

  // ── ไบเซป (biceps) ──
  { name: "Barbell Curl", th: "ม้วนบาร์ ไบเซป", muscle: "biceps", equip: "barbell", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ข้อศอกแนบลำตัว ห้ามเหวี่ยงหลัง" },
  { name: "Dumbbell Curl", th: "ม้วนดัมเบล", muscle: "biceps", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "หงายข้อมือตอนขึ้นสุด บีบไบเซปค้าง" },
  { name: "Incline DB Curl", th: "ม้วนเอียง ไบเซปยืด", muscle: "biceps", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "เบาะเอียง 45° แขนห้อยหลังลำตัว = ยืดไบเซปสุด" },
  { name: "Hammer Curl", th: "แฮมเมอร์เคิร์ล ม้วนค้อน", muscle: "biceps", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "จับแนวตั้งเหมือนถือค้อน โดนแขนท่อนล่างด้วย" },
  { name: "Preacher Curl", th: "พรีชเชอร์ ม้วนพาดเบาะ", muscle: "biceps", equip: "barbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "แขนพาดเบาะตลอด ตัดการโกง เน้นช่วงล่าง" },
  { name: "Cable Curl", th: "ม้วนเคเบิล", muscle: "biceps", equip: "cable", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงไม่หายตอนขึ้นสุด เหมาะปิดท้าย" },
  { name: "Concentration Curl", th: "ม้วนพาดเข่า", muscle: "biceps", equip: "dumbbell", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ศอกยันต้นขา บีบสุดตอนบน เน้นพีคไบเซป" },

  // ── ไตรเซป (triceps) ──
  { name: "Close Grip Bench Press", th: "เบนช์จับแคบ ไตรเซป", muscle: "triceps", equip: "barbell", type: "weight", sets: 3, rmin: 6, rmax: 10, tip: "จับกว้างเท่าไหล่ ศอกแนบลำตัว — ท่าไตรเซปที่ยกหนักได้สุด" },
  { name: "Tricep Pushdown", th: "กดไตรเซป พุชดาวน์", muscle: "triceps", equip: "cable", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ศอกล็อกข้างลำตัว เหยียดสุดแล้วบีบ 1 วิ" },
  { name: "Overhead Tricep Extension", th: "เหยียดไตรเซปเหนือหัว", muscle: "triceps", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "แขนอยู่เหนือหัว = ยืดหัวยาวของไตรเซปสุด" },
  { name: "Skull Crusher", th: "สกัลครัชเชอร์", muscle: "triceps", equip: "barbell", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ลดบาร์ลงหลังหน้าผาก ไม่ใช่ที่จมูก ศอกนิ่ง" },
  { name: "Tricep Kickback", th: "คิกแบ็ก เตะหลัง", muscle: "triceps", equip: "dumbbell", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ต้นแขนขนานพื้นนิ่ง เหยียดแค่ข้อศอก" },
  { name: "Diamond Push-up", th: "วิดพื้นเพชร มือชิด", muscle: "triceps", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 8, rmax: 20, tip: "มือชิดเป็นสามเหลี่ยม ศอกแนบตัว" },
  { name: "Bench Dip", th: "ดิปเก้าอี้", muscle: "triceps", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 10, rmax: 20, tip: "มือวางขอบเบาะ ลงจนศอก 90° อย่าลงลึกเกินจนไหล่เจ็บ" },

  // ── ต้นขาหน้า (quads) ──
  { name: "Barbell Squat", th: "สควอท บาร์เบล ย่อขา", muscle: "quads", equip: "barbell", type: "weight", sets: 4, rmin: 5, rmax: 8, tip: "เท้ากว้างเท่าไหล่ ย่อจนต้นขาขนานพื้น เข่าไปทางปลายเท้า" },
  { name: "Front Squat", th: "ฟรอนต์สควอท แบกหน้า", muscle: "quads", equip: "barbell", type: "weight", sets: 3, rmin: 6, rmax: 10, tip: "บาร์วางหน้าไหล่ ศอกชี้ขึ้น ลำตัวตั้งตรงกว่าสควอทหลัง" },
  { name: "Leg Press", th: "เลกเพรส เครื่องดันขา", muscle: "quads", equip: "machine", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "อย่าเหยียดเข่าล็อกสุด หลังล่างแนบเบาะตลอด" },
  { name: "Hack Squat", th: "แฮคสควอท", muscle: "quads", equip: "machine", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "เน้นต้นขาหน้าหนักกว่าสควอทปกติ ลงลึกได้ปลอดภัย" },
  { name: "Bulgarian Split Squat", th: "บัลแกเรียน ขาเดียว", muscle: "quads", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "เท้าหลังวางสูง ลงตรงๆ — โหดกว่าที่คิด เริ่มจากน้ำหนักตัวก่อน" },
  { name: "Walking Lunge", th: "ลันจ์ เดินย่อ", muscle: "quads", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ก้าวยาวพอให้เข่าหน้าไม่เลยปลายเท้า ลำตัวตั้งตรง" },
  { name: "Leg Extension", th: "เลกเอ็กซ์เทนชั่น เหยียดขา", muscle: "quads", equip: "machine", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ท่า isolation ปิดท้าย บีบค้างตอนเหยียดสุด 1 วิ" },
  { name: "Goblet Squat", th: "ก็อบเลตสควอท อุ้มดัมเบล", muscle: "quads", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "อุ้มดัมเบลหน้าอก เหมาะฝึกฟอร์มสควอทให้ถูกก่อนใช้บาร์" },
  { name: "Step-up", th: "สเต็ปอัพ ก้าวขึ้นกล่อง", muscle: "quads", equip: "dumbbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ดันด้วยส้นเท้าขาบน อย่าถีบขาล่างช่วย" },

  // ── สะโพก/หลังขา (glutes_hams) ──
  { name: "Romanian Deadlift", th: "อาร์ดีแอล หลังขา", muscle: "glutes_hams", equip: "barbell", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดันสะโพกไปหลัง เข่างอนิดเดียว รู้สึกตึงหลังขา อย่าย่อเป็นสควอท" },
  { name: "Barbell Hip Thrust", th: "ฮิปทรัส ดันสะโพก ก้น", muscle: "glutes_hams", equip: "barbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "สะบักพาดเบาะ ดันจนลำตัวขนานพื้น บีบก้นค้าง 1 วิ" },
  { name: "Lying Leg Curl", th: "เลกเคิร์ล งอขา นอน", muscle: "glutes_hams", equip: "machine", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ควบคุมขากลับช้าๆ ช่วงลงสำคัญกว่าช่วงงอ" },
  { name: "Seated Leg Curl", th: "เลกเคิร์ล นั่งงอขา", muscle: "glutes_hams", equip: "machine", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "งานวิจัยชี้ว่าโดนหลังขาดีกว่าท่านอนเล็กน้อย" },
  { name: "Good Morning", th: "กู้ดมอร์นิ่ง", muscle: "glutes_hams", equip: "barbell", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ใช้น้ำหนักเบา หลังตรงตลอด เน้นบานพับสะโพก" },
  { name: "Glute Bridge", th: "สะพานก้น ยกสะโพก", muscle: "glutes_hams", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 15, rmax: 20, tip: "เวอร์ชันพื้นของฮิปทรัส บีบก้นสุดด้านบน" },
  { name: "Back Extension", th: "แบ็กเอ็กซ์เทนชั่น หลังล่าง", muscle: "glutes_hams", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, tip: "ขึ้นแค่ลำตัวตรง อย่าแอ่นเกิน" },
  { name: "Cable Pull Through", th: "พูลทรู เคเบิล", muscle: "glutes_hams", equip: "cable", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ฝึกบานพับสะโพกได้ดี แรงตึงคงที่ ปลอดภัยกับหลัง" },
  { name: "Nordic Curl", th: "นอร์ดิก เคิร์ล", muscle: "glutes_hams", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 5, rmax: 10, tip: "โคตรหนัก ใช้มือช่วยรับตอนลง ป้องกันหลังขาฉีกได้ดีมาก" },

  // ── น่อง (calves) ──
  { name: "Standing Calf Raise", th: "เขย่งน่อง ยืน", muscle: "calves", equip: "machine", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "ลงให้ส้นต่ำสุด ขึ้นสุด ค้างบน 1 วิ — น่องต้องการช่วงยืดเต็ม" },
  { name: "Seated Calf Raise", th: "เขย่งน่อง นั่ง", muscle: "calves", equip: "machine", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "เข่างอ = เน้นน่องมัดล่าง (soleus) ควรมีคู่กับท่ายืน" },
  { name: "Calf Raise", th: "เขย่งน่อง น้ำหนักตัว", muscle: "calves", equip: "bodyweight", type: "bodyweight", sets: 4, rmin: 15, rmax: 25, tip: "ยืนขอบขั้นบันไดให้ส้นห้อย เพิ่มช่วงยืด" },

  // ── แกนกลาง (core) ──
  { name: "Plank", th: "แพลงก์ ท่าไม้กระดาน", muscle: "core", equip: "bodyweight", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "ลำตัวเป็นเส้นตรง เกร็งก้นและท้อง อย่าให้สะโพกตกหรือโด่ง" },
  { name: "Side Plank", th: "แพลงก์ข้าง", muscle: "core", equip: "bodyweight", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "เน้นข้างลำตัว ทำทั้งสองข้างเท่ากัน" },
  { name: "Hanging Knee Raise", th: "ห้อยยกเข่า", muscle: "core", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "ม้วนสะโพกขึ้นด้วย ไม่ใช่แค่ยกเข่า อย่าแกว่ง" },
  { name: "Hanging Leg Raise", th: "ห้อยยกขาตรง", muscle: "core", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, tip: "เวอร์ชันยากของยกเข่า ขาตรงตลอด" },
  { name: "Cable Crunch", th: "เคเบิลครันช์ ม้วนท้อง", muscle: "core", equip: "cable", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ม้วนกระดูกสันหลังลง ไม่ใช่ก้มสะโพก — ท้องเพิ่มน้ำหนักได้เหมือนกล้ามอื่น" },
  { name: "Crunch", th: "ครันช์ ซิทอัพ ท้อง", muscle: "core", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 15, rmax: 25, tip: "ยกแค่สะบักพ้นพื้น ไม่ต้องขึ้นสุด อย่าดึงคอ" },
  { name: "Russian Twist", th: "บิดตัว รัสเซียนทวิสต์", muscle: "core", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, tip: "บิดจากลำตัว ไม่ใช่แค่แกว่งแขน" },
  { name: "Ab Wheel Rollout", th: "ล้อหน้าท้อง", muscle: "core", equip: "other", type: "bodyweight", sets: 3, rmin: 8, rmax: 12, tip: "เกร็งท้องห้ามให้หลังแอ่น เริ่มจากคุกเข่าระยะสั้นก่อน" },
  { name: "Dead Bug", th: "เดดบัก", muscle: "core", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "หลังล่างแนบพื้นตลอด ปลอดภัยกับหลัง เหมาะคนเริ่มต้น" },

  // ── ปลายแขน (forearms) ──
  { name: "Wrist Curl (DB)", th: "ม้วนข้อมือ", muscle: "forearms", equip: "dumbbell", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "พาดแขนบนเข่า ปล่อยข้อมือลงสุดแล้วม้วนขึ้น" },
  { name: "Reverse Wrist Curl (DB)", th: "ม้วนข้อมือกลับ", muscle: "forearms", equip: "dumbbell", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "คว่ำมือ เน้นด้านบนปลายแขน ใช้น้ำหนักเบามาก" },
  { name: "Reverse Curl", th: "ม้วนคว่ำมือ", muscle: "forearms", equip: "barbell", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คว่ำมือม้วนขึ้น โดนปลายแขนด้านบนและไบเซปมัดล่าง" },
  { name: "Farmer's Walk", th: "ฟาร์เมอร์วอล์ก หิ้วเดิน", muscle: "forearms", equip: "dumbbell", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "หิ้วหนักเดิน ไหล่ตั้ง — สร้างแรงบีบมือและแกนกลางไปพร้อมกัน" },
  { name: "Dead Hang", th: "ห้อยบาร์", muscle: "forearms", equip: "bodyweight", type: "time", sets: 3, rmin: 20, rmax: 60, tip: "ห้อยนิ่งๆ สร้างแรงบีบและยืดหัวไหล่" },
  { name: "Towel Pull-up", th: "ดึงข้อผ้าขนหนู", muscle: "forearms", equip: "bodyweight", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "พาดผ้าบนบาร์แล้วจับ — แรงบีบโหดกว่าจับบาร์มาก" },
];

// ── ค่าเริ่มต้นตามอุปกรณ์ ──
// ดัมเบลนับน้ำหนักต่อข้าง (ผู้ใช้ถือข้างละอัน) ที่เหลือนับน้ำหนักรวม
export function unitFor(equip: Equip, type: ExType): string | undefined {
  if (type === "time") return "วิ";
  if (type === "bodyweight") return undefined;
  return equip === "dumbbell" ? "kg/ข้าง" : "kg";
}

// ระยะขยับน้ำหนักที่เล็กที่สุดที่ทำได้จริงกับอุปกรณ์นั้น
export function incFor(equip: Equip): number {
  if (equip === "dumbbell") return 1; // ดัมเบลไทยมักขยับทีละ 1-2 kg ต่อข้าง
  if (equip === "machine" || equip === "cable") return 5; // แผ่นเครื่องมักล็อกที่ 5
  if (equip === "band") return 1;
  return 2.5; // บาร์เบล = แผ่นเล็กสุดข้างละ 1.25
}

export const isMachine = (equip: Equip): boolean => equip === "machine" || equip === "cable";

// ค้นหาท่า — รองรับทั้งไทยและอังกฤษ เรียงท่าที่ตรงต้นชื่อขึ้นก่อน
export function searchExercises(query: string, limit = 60): ExTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_DB.slice(0, limit);

  const scored: { t: ExTemplate; score: number }[] = [];
  for (const t of EXERCISE_DB) {
    const en = t.name.toLowerCase();
    const th = t.th;
    let score = -1;
    if (en.startsWith(q) || th.startsWith(q)) score = 3;
    else if (en.includes(q) || th.includes(q)) score = 2;
    else if (EQUIP_TH[t.equip].includes(q)) score = 1;
    if (score >= 0) scored.push({ t, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name)).slice(0, limit).map((s) => s.t);
}

export const findTemplate = (name: string): ExTemplate | undefined =>
  EXERCISE_DB.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
