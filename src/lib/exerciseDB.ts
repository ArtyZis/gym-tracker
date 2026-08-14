// คลังท่าออกกำลังกาย — ข้อมูลครบพอให้ตัววิเคราะห์ตัดสินได้ว่า "ผู้ใช้ทำท่านี้ได้จริงไหม"
//
// โครงสร้าง:
//   name    ชื่ออังกฤษมาตรฐาน — ใช้เป็น id จับคู่ประวัติ ห้ามแก้ทีหลัง ประวัติจะหลุด
//   th      ชื่อไทยสั้น (แสดงใต้ชื่ออังกฤษ ให้รู้ว่าคือท่าอะไร)
//   alias   คำค้นสำรอง (ไม่แสดงบนจอ)
//   equip   อุปกรณ์ที่ "ต้องมีครบทุกชิ้น" ถึงจะทำท่านี้ได้ — หัวใจของการกรองคำแนะนำ
//   pri/sec กล้ามเนื้อหลัก/รอง — นับแบบ fractional: primary 1.0 เซต, secondary 0.5 เซต
//   pattern รูปแบบการเคลื่อนไหว ใช้ตรวจสมดุลที่ระดับแพทเทิร์น
//   fatigue ต้นทุนความล้า ใช้ประเมินเวลาต่อเซตและจัดลำดับท่า
//   avoid   อาการบาดเจ็บที่ควรเลี่ยงท่านี้ (ใส่เฉพาะที่ชัดเจน — ใส่มั่วจะกรองจนไม่เหลือท่า)
//
// ค้นหาได้จาก: ชื่ออังกฤษ · ชื่อไทย · alias · ชื่อกล้ามเนื้อ · ชื่ออุปกรณ์
// เวลาพักไม่เก็บที่นี่ — suggestRest() คำนวณจากชนิดท่า+ช่วงเรปให้เอง

import type { ExType } from "./store";
import type { EquipTag, FatigueCost, InjuryKey, MuscleKey, Pattern } from "./muscles";
import { EQUIP_TH, EQUIP_EN, MUSCLE_ALIAS, MUSCLE_EN, MUSCLE_TH } from "./muscles";
import { isEN } from "./i18n";

// re-export ให้ component ที่ทำงานกับท่า import จากที่เดียวจบ
export { EQUIP_TH, MUSCLE_TH } from "./muscles";
export type { EquipTag, MuscleKey, Pattern } from "./muscles";

export interface ExTemplate {
  name: string;
  th: string;
  alias?: string;
  equip: EquipTag[];
  pri: MuscleKey[];
  sec?: MuscleKey[];
  pattern: Pattern;
  fatigue: FatigueCost;
  type: ExType;
  sets: number;
  rmin: number;
  rmax: number;
  amrap?: boolean;
  avoid?: InjuryKey[];
  tip: string;
  tipEn?: string;
}

/**
 * คำแนะนำท่าตามภาษาปัจจุบัน — ไม่มี tipEn ให้ตกกลับเป็นไทย
 *
 * ทำไม tipEn เป็น optional: ท่าที่เพิ่มใหม่ทีหลังจะได้ไม่พังตอนยังไม่ได้แปล
 * เห็นเป็นไทยชั่วคราวยังดีกว่าเห็นเป็นช่องว่าง
 */
export const tipOf = (tpl: ExTemplate): string => (isEN() ? (tpl.tipEn ?? tpl.tip) : tpl.tip);

/** ชื่อท่าที่จะแสดงใต้ชื่ออังกฤษ — โหมดอังกฤษไม่ต้องมี เพราะชื่อหลักเป็นอังกฤษอยู่แล้ว */
export const subName = (tpl: ExTemplate): string => (isEN() ? "" : tpl.th);

// prettier-ignore
export const EXERCISE_DB: ExTemplate[] = [
  // ══════════ อก ══════════
  { name: "Barbell Bench Press", th: "เบนช์เพรส", alias: "นอนดันบาร์ ดันอก", equip: ["barbell","bench","rack"], pri: ["chest"], sec: ["triceps","front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "สะบักหุบล็อกไว้ ลดบาร์แตะอกช่วงหัวนม ศอกทำมุม ~45° กับลำตัว", tipEn: "Shoulder blades pinned back, bar touches at nipple line, elbows ~45° from the torso." },
  { name: "Incline Barbell Press", th: "เบนช์เอียง (อกบน)", alias: "อินไคลน์ บาร์", equip: ["barbell","bench","rack"], pri: ["chest"], sec: ["front_delts","triceps"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, avoid: ["shoulder"], tip: "ปรับเบาะ 30-45° ชันเกินจะกลายเป็นเล่นไหล่", tipEn: "Set the bench 30-45° — any steeper and it turns into a shoulder press." },
  { name: "Decline Barbell Press", th: "เบนช์หัวลง (อกล่าง)", alias: "ดีไคลน์", equip: ["barbell","bench","rack"], pri: ["chest"], sec: ["triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "เน้นอกส่วนล่าง ช่วงเคลื่อนไหวสั้นกว่า ยกได้หนักกว่าท่าราบ", tipEn: "Hits the lower chest. Shorter range of motion, so you can go heavier than flat." },
  { name: "Dumbbell Bench Press", th: "เบนช์ดัมเบล", alias: "นอนดันดัมเบล", equip: ["dumbbell","bench"], pri: ["chest"], sec: ["triceps","front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 12, tip: "ช่วงยืดกว้างกว่าบาร์เบล ลงช้าให้อกยืดสุด", tipEn: "Deeper stretch than a barbell — lower slowly and let the chest open all the way." },
  { name: "Incline DB Press", th: "ดัมเบลเอียง (อกบน)", alias: "อินไคลน์ดัมเบล", equip: ["dumbbell","bench"], pri: ["chest"], sec: ["front_delts","triceps"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, tip: "เน้นอกบน อย่าให้ดัมเบลชนกันด้านบน คงแรงตึงไว้", tipEn: "Upper chest focus. Don't clank the dumbbells together at the top; keep tension on." },
  { name: "Dumbbell Fly", th: "ฟลายดัมเบล (กางอก)", alias: "กางอก บินอก", equip: ["dumbbell","bench"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["shoulder"], tip: "งอศอกเล็กน้อยค้างไว้ตลอด นึกภาพกอดต้นไม้ ห้ามงอ-เหยียดศอก", tipEn: "Slight elbow bend held throughout — think hugging a tree, never bend and extend the elbow." },
  { name: "Incline Dumbbell Fly", th: "ฟลายเอียง", alias: "กางอกบน", equip: ["dumbbell","bench"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, avoid: ["shoulder"], tip: "เน้นอกบนช่วงยืด ใช้น้ำหนักเบากว่าท่าราบ", tipEn: "Upper chest in the stretched position. Go lighter than the flat version." },
  { name: "Cable Fly", th: "เคเบิลฟลาย (ไขว้สาย)", alias: "ครอสโอเวอร์ ไขว้อก", equip: ["cable"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ทั้งช่วง บีบอกค้าง 1 วิตอนสายไขว้กัน", tipEn: "Constant tension through the whole range. Squeeze for a second where the cables cross." },
  { name: "Low Cable Fly", th: "เคเบิลฟลายล่างขึ้นบน", alias: "ไขว้อกบน", equip: ["cable"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ดึงจากล่างขึ้นบน เน้นอกส่วนบน", tipEn: "Pull from low to high to bias the upper chest." },
  { name: "Pec Deck", th: "เครื่องหนีบอก", alias: "เพคเดค บัตเตอร์ฟลาย", equip: ["machine"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "เหมาะเป็นท่าปิดท้าย ควบคุมจังหวะกลับช้าๆ", tipEn: "A good finisher — control the way back slowly." },
  { name: "Chest Press Machine", th: "เครื่องดันอก", alias: "เชสเพรส", equip: ["machine"], pri: ["chest"], sec: ["triceps","front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปรับเบาะให้มือระดับกลางอก ปลอดภัยกว่าฟรีเวทเมื่อเล่นคนเดียว", tipEn: "Set the seat so the handles sit mid-chest. Safer than free weights when training alone." },
  { name: "Landmine Press", th: "แลนด์ไมน์เพรส", alias: "ดันบาร์เอียง", equip: ["barbell"], pri: ["chest","front_delts"], sec: ["triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปลายบาร์ปักมุมห้อง ดันขึ้นเฉียง เป็นมิตรกับหัวไหล่", tipEn: "Wedge the bar end in a corner and press up at an angle — very shoulder-friendly." },
  { name: "Push-up", th: "วิดพื้น", alias: "ดันพื้น", equip: ["bodyweight"], pri: ["chest"], sec: ["triceps","front_delts","core"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 25, avoid: ["wrist"], tip: "ลำตัวตรงเป็นเส้นเดียว เกร็งท้อง อย่าให้สะโพกตก", tipEn: "Body in one straight line, brace the abs, don't let the hips sag." },
  { name: "Wide Push-up", th: "วิดพื้นมือกว้าง", alias: "ดันพื้นกว้าง", equip: ["bodyweight"], pri: ["chest"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["wrist","shoulder"], tip: "มือกว้างกว่าไหล่ ~1.5 เท่า เน้นอกด้านนอก", tipEn: "Hands about 1.5× shoulder width to bias the outer chest." },
  { name: "Decline Push-up", th: "วิดพื้นเท้าสูง", alias: "ดันพื้นยกขา", equip: ["bodyweight"], pri: ["chest"], sec: ["front_delts","triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["wrist"], tip: "ยกเท้าสูงเพื่อเน้นอกบน ยิ่งสูงยิ่งหนัก", tipEn: "Feet elevated to hit the upper chest — the higher the feet, the harder it gets." },
  { name: "Dip", th: "ดิป (ยันตัวบนบาร์คู่)", alias: "ยันตัว", equip: ["other","bodyweight"], pri: ["chest","triceps"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "high", type: "bodyweight", sets: 3, rmin: 6, rmax: 15, avoid: ["shoulder"], tip: "โน้มตัวไปหน้าเน้นอก ตั้งตัวตรงเน้นไตรเซป", tipEn: "Lean forward for chest, stay upright for triceps." },

  // ══════════ หลัง ══════════
  { name: "Deadlift", th: "เดดลิฟต์", alias: "ดึงพื้น ยกบาร์จากพื้น", equip: ["barbell"], pri: ["back","glutes","hamstrings"], sec: ["forearms","quads"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 3, rmax: 6, avoid: ["lower_back"], tip: "หลังตรงตลอด ดันพื้นด้วยขา บาร์ชิดหน้าแข้ง — ท่าหนักสุด พักให้เต็ม", tipEn: "Flat back throughout, push the floor away with your legs, bar close to the shins — the heaviest lift here, rest fully." },
  { name: "Sumo Deadlift", th: "เดดลิฟต์ขากว้าง", alias: "ซูโม่", equip: ["barbell"], pri: ["glutes","back"], sec: ["quads","hamstrings","forearms"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 4, rmax: 6, avoid: ["lower_back"], tip: "ยืนกว้าง จับในวงขา ลำตัวตั้งกว่าเดดปกติ เป็นมิตรกับหลังล่างกว่า", tipEn: "Wide stance, hands inside the legs, more upright than conventional — easier on the lower back." },
  { name: "Rack Pull", th: "แร็คพูล (เดดครึ่งบน)", alias: "ดึงจากแร็ค", equip: ["barbell","rack"], pri: ["back"], sec: ["glutes","forearms"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "เริ่มจากระดับเข่า เน้นช่วงบนของเดดลิฟต์ ยกหนักกว่าปกติได้", tipEn: "Start from knee height to train the top half of the deadlift — you can go heavier than usual." },
  { name: "Barbell Row", th: "โรว์บาร์เบล (ดึงหลัง)", alias: "เบนโอเวอร์โรว์", equip: ["barbell"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, avoid: ["lower_back"], tip: "โน้มตัว ~45° ดึงบาร์เข้าท้องน้อย บีบสะบักสุด", tipEn: "Torso at ~45°, pull the bar to your lower stomach, squeeze the shoulder blades hard." },
  { name: "Pendlay Row", th: "เพนด์เลย์โรว์", alias: "โรว์วางพื้น", equip: ["barbell"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "วางบาร์แตะพื้นทุกครั้ง ระเบิดแรงขึ้นเร็ว หลังขนานพื้น", tipEn: "Reset the bar on the floor every rep, explode up, back parallel to the ground." },
  { name: "T-Bar Row", th: "ทีบาร์โรว์", alias: "โรว์ทีบาร์ ดึงหลังเครื่อง", equip: ["machine"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "หน้าอกดันแผ่นรอง ตัดการโกงด้วยหลังล่าง เน้นหลังกลาง", tipEn: "Chest against the pad kills lower-back cheating — pure mid-back work." },
  { name: "Dumbbell Row", th: "โรว์ดัมเบลข้างเดียว", alias: "ดึงดัมเบล", equip: ["dumbbell","bench"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดึงข้อศอกไปด้านหลัง อย่าบิดลำตัวช่วย", tipEn: "Drive the elbow back and don't twist the torso to help." },
  { name: "Seated Cable Row", th: "โรว์เคเบิลนั่งดึง", alias: "ดึงเคเบิลนั่ง", equip: ["cable"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "อกตั้ง ดึงเข้าท้อง ปล่อยกลับให้สะบักยืดสุด", tipEn: "Chest tall, pull to the stomach, let the shoulder blades stretch on the way out." },
  { name: "Chest Supported Row", th: "โรว์พิงอก", alias: "โรว์เบาะเอียง", equip: ["machine","bench"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "อกแนบเบาะ ตัดหลังล่างออกจากสมการ เล่นหลังล้วน", tipEn: "Chest on the pad takes the lower back out of the equation — back only." },
  { name: "Machine Row", th: "เครื่องดึงหลัง", alias: "โรว์เครื่อง", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "เหมาะคนเริ่มต้น ฟอร์มถูกง่ายกว่าฟรีเวท", tipEn: "Good for beginners — much easier to get the form right than free weights." },
  { name: "Lat Pulldown", th: "แลทพูลดาวน์ (ดึงบนลงล่าง)", alias: "ดึงบาร์ลง ดึงบน", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดึงข้อศอกลงหาสะโพก อย่าเอนหลังมากเกิน", tipEn: "Drive the elbows down toward your hips, don't lean back too far." },
  { name: "Close Grip Pulldown", th: "พูลดาวน์จับแคบ", alias: "ดึงบนมือชิด", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "จับแคบ/หงายมือ เน้นแลทช่วงล่างและไบเซป", tipEn: "Narrow or supinated grip biases the lower lats and biceps." },
  { name: "Pull-up", th: "พูลอัพ (ดึงข้อคว่ำมือ)", alias: "ดึงข้อ โหนบาร์ พูลอัป", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true, tip: "จับกว้างกว่าไหล่เล็กน้อย ดึงจนคางพ้นบาร์ ลงช้าจนแขนตรงสุด", tipEn: "Grip slightly wider than shoulders, chin over the bar, lower slowly to full arm extension." },
  { name: "Wide Grip Pull-up", th: "พูลอัพจับกว้าง (ดึงข้อ)", alias: "ดึงข้อ โหนบาร์", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true, tip: "เริ่มจากแขวนสุด ดึงจนคางพ้นบาร์ ลงช้า", tipEn: "Start from a dead hang, pull until the chin clears the bar, lower slowly." },
  { name: "Chin-up", th: "ชินอัพ (ดึงข้อหงายมือ)", alias: "ดึงข้อหงาย", equip: ["pullup_bar","bodyweight"], pri: ["back","biceps"], sec: ["forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["elbow"], tip: "หงายมือ ได้ไบเซปเยอะกว่าพูลอัพ", tipEn: "Underhand grip brings in a lot more biceps than a pull-up." },
  { name: "Neutral Grip Pull-up", th: "ดึงข้อมือหันเข้า", alias: "พูลอัพนิวทรัล", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "ฝ่ามือหันเข้าหากัน เป็นมิตรกับข้อไหล่ที่สุด", tipEn: "Palms facing each other — the friendliest version for your shoulders." },
  { name: "Australian Row", th: "โรว์นอน (ดึงตัวใต้บาร์)", alias: "อินเวอร์เต็ดโรว์", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "ท่าเริ่มต้นก่อนไปพูลอัพ ยิ่งตัวขนานพื้นยิ่งหนัก", tipEn: "The stepping stone to pull-ups — the more horizontal you are, the harder it gets." },
  { name: "Straight Arm Pulldown", th: "ดึงแขนตรง", alias: "พูลดาวน์แขนตรง", equip: ["cable"], pri: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แขนตรงตลอด เน้นแลทล้วน ไม่ใช้ไบเซป", tipEn: "Arms locked straight — lats only, no biceps." },
  { name: "Dumbbell Pullover", th: "พูลโอเวอร์", alias: "ยกดัมเบลข้ามหัว", equip: ["dumbbell","bench"], pri: ["back"], sec: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["shoulder"], tip: "ยืดซี่โครงและแลท ควบคุมช่วงลงหลังศีรษะ", tipEn: "Stretches the ribcage and lats. Control the lowering phase behind your head." },
  { name: "Cable Pullover", th: "พูลโอเวอร์เคเบิล (แขนตรง)", alias: "สเตรทอาร์มพูลโอเวอร์ ดึงแขนตรงสาย", equip: ["cable"], pri: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แขนตรงตลอด แรงตึงคงที่ทุกช่วง เน้นแลทล้วนไม่ใช้ไบเซป", tipEn: "Arms stay straight, tension is constant throughout — lats only, no biceps." },
  { name: "Barbell Shrug", th: "ชรักบาร์เบล (ยักไหล่)", alias: "ยักไหล่ ทราพีเซียส", equip: ["barbell"], pri: ["back"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ยักตรงขึ้น ค้าง 1 วิ ไม่ต้องหมุนไหล่", tipEn: "Shrug straight up, hold a second at the top — no shoulder rolling." },
  { name: "Dumbbell Shrug", th: "ชรักดัมเบล", alias: "ยักไหล่ดัมเบล", equip: ["dumbbell"], pri: ["back"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 20, tip: "ช่วงเคลื่อนไหวอิสระกว่าบาร์ ยักให้สุด", tipEn: "Freer range than a bar — shrug all the way up." },

  // ══════════ ไหล่ ══════════
  { name: "Overhead Press", th: "โอเวอร์เฮดเพรส (ดันบ่า)", alias: "ดันบาร์เหนือหัว มิลิทารีเพรส", equip: ["barbell","rack"], pri: ["front_delts"], sec: ["triceps","side_delts","core"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "เกร็งก้นและท้อง ดันขึ้นตรงหัว หลังไม่แอ่น", tipEn: "Squeeze glutes and abs, press straight overhead, don't arch the back." },
  { name: "Overhead Press (DB)", th: "ดันไหล่ดัมเบล", alias: "ดันดัมเบลเหนือหัว shoulder press dumbbell shoulder press seated shoulder press", equip: ["dumbbell"], pri: ["front_delts"], sec: ["triceps","side_delts"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["shoulder"], tip: "ช่วงเคลื่อนไหวอิสระกว่าบาร์ เหมาะกับคนไหล่ติด", tipEn: "Freer path than a barbell — better if your shoulders are stiff." },
  { name: "Arnold Press", th: "อาร์โนลด์เพรส", alias: "ดันไหล่หมุนข้อมือ", equip: ["dumbbell"], pri: ["front_delts","side_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["shoulder"], tip: "หมุนข้อมือระหว่างดัน โดนไหล่ทั้งหน้าและกลาง", tipEn: "Rotate the wrists as you press to hit both front and side delts." },
  { name: "Push Press", th: "พุชเพรส (ใช้ขาช่วย)", alias: "ดันบ่าใช้ขา", equip: ["barbell","rack"], pri: ["front_delts"], sec: ["triceps","quads"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "ย่อเข่าเล็กน้อยแล้วระเบิดขึ้น ใช้น้ำหนักมากกว่าเพรสปกติได้", tipEn: "Small dip with the knees then explode up — lets you handle more than a strict press." },
  { name: "Lateral Raise", th: "กางข้าง (ไหล่กลาง)", alias: "ยกข้าง ไซด์เรส", equip: ["dumbbell"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "ยกแค่ระดับไหล่ เอียงนิ้วก้อยขึ้นนิด ใช้น้ำหนักเบาแต่คุมให้นิ่ง", tipEn: "Only to shoulder height, pinky tilted slightly up. Go light and control it." },
  { name: "Cable Lateral Raise", th: "กางข้างเคเบิล", alias: "ยกข้างสาย", equip: ["cable"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ตลอดช่วง ดีกว่าดัมเบลตรงช่วงล่าง", tipEn: "Constant tension across the range — better than dumbbells at the bottom." },
  { name: "Machine Lateral Raise", th: "เครื่องกางไหล่", alias: "ไหล่กลางเครื่อง", equip: ["machine"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คุมฟอร์มง่าย เหมาะเล่นหนักตอนล้าแล้ว", tipEn: "Easy to keep form, so you can push hard even when fatigued." },
  { name: "Front Raise", th: "ยกหน้า (ไหล่หน้า)", alias: "ฟรอนต์เรส", equip: ["dumbbell"], pri: ["front_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ไหล่หน้ามักได้พอแล้วจากท่าดันอก ไม่ต้องเล่นเยอะ", tipEn: "Front delts usually get plenty from pressing already — you don't need much of this." },
  { name: "Face Pull", th: "เฟซพูล (ดึงเข้าหน้า)", alias: "ดึงหน้า ไหล่หลัง", equip: ["cable"], pri: ["rear_delts"], sec: ["back"], pattern: "horizontal_pull", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "ดึงเข้าหาหน้าผาก กางศอกออก แก้ไหล่ห่อได้ดีมาก", tipEn: "Pull toward your forehead with elbows flared — excellent for rounded shoulders." },
  { name: "Rear Delt Fly", th: "กางหลัง (ไหล่หลัง)", alias: "รีเวิร์สฟลาย ไหล่หลัง", equip: ["dumbbell"], pri: ["rear_delts"], sec: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "โน้มตัวขนานพื้น ยกออกข้าง ไม่ใช่ขึ้นบน", tipEn: "Torso parallel to the floor, raise out to the sides, not upward." },
  { name: "Reverse Pec Deck", th: "เครื่องกางหลัง", alias: "เพคเดคกลับด้าน ไหล่หลังเครื่อง", equip: ["machine"], pri: ["rear_delts"], sec: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "นั่งกลับด้านกับท่าหนีบอก เน้นไหล่หลังล้วน", tipEn: "Sit facing the pad — rear delts only." },
  { name: "Upright Row", th: "อัพไรท์โรว์ (ดึงตั้ง)", alias: "ดึงบาร์ขึ้นตรง", equip: ["barbell"], pri: ["side_delts"], sec: ["back","biceps"], pattern: "isolation", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["shoulder"], tip: "จับกว้างหน่อยลดการบีบข้อไหล่ ดึงแค่ระดับอก", tipEn: "A slightly wider grip eases the shoulder impingement. Only pull to chest height." },
  { name: "Shoulder Press Machine", th: "เครื่องดันไหล่", alias: "ไหล่เครื่อง", equip: ["machine"], pri: ["front_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปรับเบาะให้มือจับระดับหู ปลอดภัยเมื่อเล่นหนักคนเดียว", tipEn: "Set the seat so the handles are at ear height. Safe for heavy solo work." },
  { name: "Pike Push-up", th: "วิดพื้นก้นโด่ง", alias: "ไพค์ วิดพื้นไหล่", equip: ["bodyweight"], pri: ["front_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, avoid: ["wrist","shoulder"], tip: "ยกก้นสูง ศีรษะลงระหว่างมือ — ท่าไหล่แบบไม่ใช้อุปกรณ์", tipEn: "Hips high, head lowers between the hands — a shoulder press with no equipment." },

  // ══════════ ไบเซป ══════════
  { name: "Barbell Curl", th: "ม้วนบาร์เบล", alias: "เคิร์ลบาร์ ม้วนแขน", equip: ["barbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["wrist","elbow"], tip: "ข้อศอกแนบลำตัว ห้ามเหวี่ยงหลัง", tipEn: "Elbows against your sides, no swinging from the back." },
  { name: "EZ Bar Curl", th: "ม้วนบาร์หยัก", alias: "อีซี่บาร์", equip: ["barbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "บาร์หยักลดแรงบิดข้อมือ เหมาะคนข้อมือเจ็บจากบาร์ตรง", tipEn: "The bend cuts wrist torque — better if a straight bar bothers your wrists." },
  { name: "Dumbbell Curl", th: "ม้วนดัมเบล", alias: "เคิร์ลดัมเบล", equip: ["dumbbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "หงายข้อมือตอนขึ้นสุด บีบไบเซปค้าง", tipEn: "Supinate the wrist at the top and squeeze the biceps." },
  { name: "Incline DB Curl", th: "ม้วนเอียง (ยืดไบเซป)", alias: "อินไคลน์เคิร์ล", equip: ["dumbbell","bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "เบาะเอียง 45° แขนห้อยหลังลำตัว = ยืดไบเซปสุด", tipEn: "Bench at 45° with arms hanging behind you = maximum biceps stretch." },
  { name: "Hammer Curl", th: "ม้วนค้อน", alias: "แฮมเมอร์เคิร์ล", equip: ["dumbbell"], pri: ["biceps","forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "จับแนวตั้งเหมือนถือค้อน โดนแขนท่อนล่างด้วย", tipEn: "Neutral grip like holding a hammer — hits the forearms too." },
  { name: "Preacher Curl", th: "ม้วนพาดเบาะ", alias: "พรีชเชอร์", equip: ["barbell","bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["elbow"], tip: "แขนพาดเบาะตลอด ตัดการโกง เน้นช่วงล่าง", tipEn: "Arms stay on the pad the whole time, no cheating, strong in the bottom range." },
  { name: "Cable Curl", th: "ม้วนเคเบิล", alias: "เคิร์ลสาย", equip: ["cable"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงไม่หายตอนขึ้นสุด เหมาะปิดท้าย", tipEn: "Tension doesn't disappear at the top — a good finisher." },
  { name: "Concentration Curl", th: "ม้วนพาดเข่า", alias: "คอนเซนเทรชั่น", equip: ["dumbbell"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ศอกยันต้นขา บีบสุดตอนบน เน้นพีคไบเซป", tipEn: "Elbow braced on the thigh, squeeze hard at the top for the biceps peak." },
  { name: "Spider Curl", th: "ม้วนคว่ำหน้า", alias: "สไปเดอร์เคิร์ล", equip: ["dumbbell","bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "นอนคว่ำบนเบาะเอียง แขนห้อยตรง ตัดการโกงหมด", tipEn: "Face down on an incline bench with arms hanging straight — no cheating possible." },
  { name: "Machine Curl", th: "เครื่องม้วนแขน", alias: "เคิร์ลเครื่อง", equip: ["machine"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คุมฟอร์มง่าย ดันถึงจุดล้าได้ปลอดภัย", tipEn: "Easy to hold form, so you can safely push to failure." },

  // ══════════ ไตรเซป ══════════
  { name: "Close Grip Bench Press", th: "เบนช์จับแคบ", alias: "โคลสกริป ดันแคบ", equip: ["barbell","bench","rack"], pri: ["triceps"], sec: ["chest","front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["elbow"], tip: "จับกว้างเท่าไหล่ ศอกแนบลำตัว — ท่าไตรเซปที่ยกหนักได้สุด", tipEn: "Shoulder-width grip, elbows tucked — the heaviest triceps lift there is." },
  { name: "Tricep Pushdown", th: "กดไตรเซป", alias: "พุชดาวน์ กดสาย", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ศอกล็อกข้างลำตัว เหยียดสุดแล้วบีบ 1 วิ", tipEn: "Elbows locked at your sides, full extension, squeeze for a second." },
  { name: "Rope Pushdown", th: "กดไตรเซปด้วยเชือก", alias: "พุชดาวน์เชือก", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "กางเชือกออกตอนล่างสุด บีบไตรเซปให้สุด", tipEn: "Spread the rope at the bottom and squeeze the triceps all the way." },
  { name: "Overhead Tricep Extension", th: "เหยียดไตรเซปเหนือหัว", alias: "เอ็กซ์เทนชั่นเหนือหัว", equip: ["dumbbell"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["elbow"], tip: "แขนอยู่เหนือหัว = ยืดหัวยาวของไตรเซปสุด", tipEn: "Arms overhead puts the long head of the triceps in full stretch." },
  { name: "Cable Overhead Extension", th: "เหยียดไตรเซปเคเบิลเหนือหัว", alias: "โอเวอร์เฮดเคเบิล", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ในช่วงยืด ดีกว่าดัมเบล", tipEn: "Constant tension in the stretched position — better than dumbbells here." },
  { name: "Skull Crusher", th: "สกัลครัชเชอร์", alias: "ไลอิ้งเอ็กซ์เทนชั่น", equip: ["barbell","bench"], pri: ["triceps"], pattern: "isolation", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["elbow"], tip: "ลดบาร์ลงหลังหน้าผาก ไม่ใช่ที่จมูก ศอกนิ่ง", tipEn: "Lower the bar behind your forehead, not to your nose, and keep the elbows still." },
  { name: "Tricep Kickback", th: "คิกแบ็ก (เตะหลัง)", alias: "เตะไตรเซป", equip: ["dumbbell"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ต้นแขนขนานพื้นนิ่ง เหยียดแค่ข้อศอก", tipEn: "Upper arm parallel to the floor and locked — only the elbow moves." },
  { name: "Machine Tricep Extension", th: "เครื่องเหยียดไตรเซป", alias: "ไตรเซปเครื่อง", equip: ["machine"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "เหมาะดันถึงจุดล้าโดยไม่ต้องกลัวฟอร์มพัง", tipEn: "Great for pushing to failure without worrying about form breaking down." },
  { name: "Diamond Push-up", th: "วิดพื้นมือชิด (เพชร)", alias: "ไดมอนด์ วิดพื้นไตรเซป", equip: ["bodyweight"], pri: ["triceps"], sec: ["chest"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 20, avoid: ["wrist","elbow"], tip: "มือชิดเป็นสามเหลี่ยม ศอกแนบตัว", tipEn: "Hands together in a triangle, elbows tucked." },
  { name: "Bench Dip", th: "ดิปเก้าอี้", alias: "ยันเก้าอี้", equip: ["bench","bodyweight"], pri: ["triceps"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 20, avoid: ["shoulder"], tip: "มือวางขอบเบาะ ลงจนศอก 90° อย่าลงลึกจนไหล่เจ็บ", tipEn: "Hands on the bench edge, lower to 90° at the elbow — don't go so deep it hurts the shoulder." },

  // ══════════ ต้นขาหน้า ══════════
  { name: "Barbell Squat", th: "สควอทบาร์เบล", alias: "แบกบาร์ย่อ สควอทหลัง", equip: ["barbell","rack"], pri: ["quads"], sec: ["glutes","hamstrings","core"], pattern: "squat", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["lower_back","knee"], tip: "เท้ากว้างเท่าไหล่ ย่อจนต้นขาขนานพื้น เข่าไปทางปลายเท้า", tipEn: "Feet shoulder-width, descend until the thighs are parallel, knees track over the toes." },
  { name: "Front Squat", th: "ฟรอนต์สควอท (แบกหน้า)", alias: "สควอทหน้า", equip: ["barbell","rack"], pri: ["quads"], sec: ["glutes","core"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["wrist","knee"], tip: "บาร์วางหน้าไหล่ ศอกชี้ขึ้น ลำตัวตั้งตรงกว่าสควอทหลัง", tipEn: "Bar racked on the front delts, elbows up, torso far more upright than a back squat." },
  { name: "Box Squat", th: "สควอทนั่งกล่อง", alias: "บ็อกซ์สควอท", equip: ["barbell","rack","bench"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "นั่งแตะกล่องแล้วดันขึ้น ฝึกความลึกให้สม่ำเสมอ", tipEn: "Sit to the box and drive up — trains a consistent depth every rep." },
  { name: "Smith Machine Squat", th: "สควอทสมิธแมชชีน", alias: "สควอทเครื่อง", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["knee"], tip: "บาร์วิ่งในราง ทรงตัวง่าย เหมาะเล่นหนักคนเดียว", tipEn: "The bar runs on rails so balance is easy — good for going heavy alone." },
  { name: "Leg Press", th: "เลกเพรส (เครื่องดันขา)", alias: "ดันขา", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "อย่าเหยียดเข่าล็อกสุด หลังล่างแนบเบาะตลอด", tipEn: "Don't lock the knees out, and keep the lower back flat against the pad." },
  { name: "Hack Squat", th: "แฮคสควอท", alias: "สควอทเครื่องเอียง", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["knee"], tip: "เน้นต้นขาหน้าหนักกว่าสควอทปกติ ลงลึกได้ปลอดภัย", tipEn: "Hammers the quads harder than a regular squat, and you can go deep safely." },
  { name: "Bulgarian Split Squat", th: "บัลแกเรียนสควอท (ขาเดียว)", alias: "ย่อขาเดียวเท้าหลังสูง", equip: ["bodyweight","bench"], pri: ["quads","glutes"], sec: ["hamstrings"], pattern: "lunge", fatigue: "high", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "เท้าหลังวางสูง ลงตรงๆ — โหดกว่าที่คิด เริ่มจากน้ำหนักตัวก่อน", tipEn: "Rear foot elevated, drop straight down — brutal, start with bodyweight." },
  { name: "Walking Lunge", th: "ลันจ์เดิน", alias: "เดินย่อขา", equip: ["dumbbell"], pri: ["quads","glutes"], sec: ["hamstrings"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["knee"], tip: "ก้าวยาวพอให้เข่าหน้าไม่เลยปลายเท้า ลำตัวตั้งตรง", tipEn: "Step long enough that the front knee doesn't pass the toes. Stay upright." },
  { name: "Reverse Lunge", th: "ลันจ์ถอยหลัง", alias: "ย่อถอยหลัง", equip: ["dumbbell"], pri: ["quads","glutes"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ก้าวถอยหลัง เป็นมิตรกับเข่ากว่าลันจ์เดินหน้า", tipEn: "Stepping backward is easier on the knees than a forward lunge." },
  { name: "Goblet Squat", th: "ก็อบเลตสควอท (อุ้มดัมเบล)", alias: "สควอทอุ้มหน้าอก", equip: ["dumbbell"], pri: ["quads"], sec: ["glutes","core"], pattern: "squat", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "อุ้มดัมเบลหน้าอก เหมาะฝึกฟอร์มสควอทให้ถูกก่อนใช้บาร์", tipEn: "Hold a dumbbell at the chest — great for grooving squat form before you touch a bar." },
  { name: "Step-up", th: "สเต็ปอัพ (ก้าวขึ้นกล่อง)", alias: "ก้าวขึ้นม้า", equip: ["dumbbell","bench"], pri: ["quads","glutes"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ดันด้วยส้นเท้าขาบน อย่าถีบขาล่างช่วย", tipEn: "Drive through the heel of the top leg, don't push off with the bottom one." },
  { name: "Leg Extension", th: "เลกเอ็กซ์เทนชั่น (เหยียดขา)", alias: "เหยียดเข่าเครื่อง", equip: ["machine"], pri: ["quads"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, avoid: ["knee"], tip: "ท่า isolation ปิดท้าย บีบค้างตอนเหยียดสุด 1 วิ", tipEn: "An isolation finisher — squeeze for a second at full extension." },
  { name: "Sissy Squat", th: "ซิสซี่สควอท", alias: "สควอทเอนหลัง", equip: ["bodyweight"], pri: ["quads"], pattern: "isolation", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "เอนตัวไปหลังพร้อมย่อ ยืดต้นขาหน้าสุด ใช้มือจับที่ยึดช่วย", tipEn: "Lean back as you descend for a huge quad stretch. Hold something for balance." },
  { name: "Wall Sit", th: "นั่งพิงกำแพง", alias: "วอลล์ซิท", equip: ["bodyweight"], pri: ["quads"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "ต้นขาขนานพื้น ค้างไว้ — ฝึกความทนของต้นขาหน้า", tipEn: "Thighs parallel to the floor and hold — builds quad endurance." },

  // ══════════ หลังขา / ก้น ══════════
  { name: "Romanian Deadlift", th: "อาร์ดีแอล (เดดขาตึง)", alias: "หลังขา บานพับสะโพก", equip: ["barbell"], pri: ["hamstrings","glutes"], sec: ["back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "ดันสะโพกไปหลัง เข่างอนิดเดียว รู้สึกตึงหลังขา อย่าย่อเป็นสควอท", tipEn: "Push the hips back with only a slight knee bend. You should feel the hamstrings stretch — don't turn it into a squat." },
  { name: "Stiff Leg Deadlift", th: "เดดขาเหยียด", alias: "สติฟเลก", equip: ["barbell"], pri: ["hamstrings"], sec: ["glutes","back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "ขาตรงกว่า RDL ยืดหลังขาสุด ใช้น้ำหนักเบากว่า", tipEn: "Straighter legs than an RDL for a deeper hamstring stretch. Use less weight." },
  { name: "Dumbbell RDL", th: "อาร์ดีแอลดัมเบล", alias: "เดดขาตึงดัมเบล หลังขา", equip: ["dumbbell"], pri: ["hamstrings","glutes"], pattern: "hip_hinge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["lower_back"], tip: "เวอร์ชันเบากว่าบาร์เบล เหมาะเล่นที่บ้าน", tipEn: "A lighter version of the barbell RDL — good for home training." },
  { name: "Barbell Hip Thrust", th: "ฮิปทรัส (ดันสะโพก)", alias: "ดันก้น สะโพก", equip: ["barbell","bench"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "สะบักพาดเบาะ ดันจนลำตัวขนานพื้น บีบก้นค้าง 1 วิ", tipEn: "Shoulder blades on the bench, drive up until the torso is parallel, squeeze the glutes for a second." },
  { name: "Dumbbell Hip Thrust", th: "ฮิปทรัสดัมเบล", alias: "ดันสะโพกดัมเบล", equip: ["dumbbell","bench"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "วางดัมเบลบนสะโพก เวอร์ชันเบากว่าบาร์เบล", tipEn: "Dumbbell across the hips — the lighter version of the barbell thrust." },
  { name: "Lying Leg Curl", th: "เลกเคิร์ลนอน (งอขา)", alias: "งอขานอน หลังขาเครื่อง", equip: ["machine"], pri: ["hamstrings"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ควบคุมขากลับช้าๆ ช่วงลงสำคัญกว่าช่วงงอ", tipEn: "Control the way back down — the lowering matters more than the curl." },
  { name: "Seated Leg Curl", th: "เลกเคิร์ลนั่ง", alias: "งอขานั่ง", equip: ["machine"], pri: ["hamstrings"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "งานวิจัยชี้ว่าโดนหลังขาดีกว่าท่านอนเล็กน้อย", tipEn: "Research suggests it hits the hamstrings slightly better than the lying version." },
  { name: "Good Morning", th: "กู้ดมอร์นิ่ง", alias: "ก้มแบกบาร์", equip: ["barbell","rack"], pri: ["hamstrings"], sec: ["glutes","back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["lower_back"], tip: "ใช้น้ำหนักเบา หลังตรงตลอด เน้นบานพับสะโพก", tipEn: "Go light, keep the back flat, and focus on hinging at the hip." },
  { name: "Glute Bridge", th: "สะพานก้น", alias: "ยกสะโพกพื้น", equip: ["bodyweight"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 15, rmax: 20, tip: "เวอร์ชันพื้นของฮิปทรัส บีบก้นสุดด้านบน", tipEn: "The floor version of a hip thrust — squeeze the glutes hard at the top." },
  { name: "Single Leg Glute Bridge", th: "สะพานก้นขาเดียว", alias: "ยกสะโพกขาเดียว", equip: ["bodyweight"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, tip: "ทำทีละข้าง แก้ก้นข้างที่อ่อนกว่า", tipEn: "One side at a time to fix the weaker glute." },
  { name: "Nordic Curl", th: "นอร์ดิกเคิร์ล", alias: "ล้มหน้าเข่าคุก", equip: ["bodyweight"], pri: ["hamstrings"], pattern: "isolation", fatigue: "high", type: "bodyweight", sets: 3, rmin: 5, rmax: 10, avoid: ["knee"], tip: "โคตรหนัก ใช้มือช่วยรับตอนลง ป้องกันหลังขาฉีกได้ดีมาก", tipEn: "Brutally hard — catch yourself with your hands on the way down. Excellent hamstring-tear insurance." },
  { name: "Back Extension", th: "แบ็กเอ็กซ์เทนชั่น (หลังล่าง)", alias: "ไฮเปอร์เอ็กซ์เทนชั่น", equip: ["other","bodyweight"], pri: ["glutes","hamstrings"], sec: ["back"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, avoid: ["lower_back"], tip: "ขึ้นแค่ลำตัวตรง อย่าแอ่นเกิน", tipEn: "Come up only to a straight torso, don't hyperextend." },
  { name: "Cable Pull Through", th: "พูลทรูเคเบิล", alias: "ดึงสายลอดขา", equip: ["cable"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ฝึกบานพับสะโพกได้ดี แรงตึงคงที่ ปลอดภัยกับหลัง", tipEn: "Great for learning the hip hinge — constant tension and easy on the back." },
  { name: "Cable Kickback", th: "เตะก้นเคเบิล", alias: "กลูทคิกแบ็ก", equip: ["cable"], pri: ["glutes"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "เตะไปหลังพร้อมบีบก้น ลำตัวนิ่ง อย่าแอ่นหลัง", tipEn: "Kick back and squeeze the glute, torso still, no arching the back." },
  { name: "Hip Abduction Machine", th: "เครื่องกางสะโพก", alias: "กางขาเครื่อง ก้นข้าง", equip: ["machine"], pri: ["glutes"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "โน้มตัวไปหน้าเล็กน้อยจะโดนก้นด้านข้างมากขึ้น", tipEn: "Lean forward slightly to hit more of the side glute." },

  // ══════════ น่อง ══════════
  { name: "Standing Calf Raise", th: "เขย่งน่องยืน", alias: "ยกส้นยืน", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "ลงให้ส้นต่ำสุด ขึ้นสุด ค้างบน 1 วิ — น่องต้องการช่วงยืดเต็ม", tipEn: "All the way down, all the way up, hold a second at the top — calves need the full stretch." },
  { name: "Seated Calf Raise", th: "เขย่งน่องนั่ง", alias: "ยกส้นนั่ง", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "เข่างอ = เน้นน่องมัดล่าง (soleus) ควรมีคู่กับท่ายืน", tipEn: "Bent knee biases the soleus — pair it with a standing version." },
  { name: "Leg Press Calf Raise", th: "เขย่งน่องบนเลกเพรส", alias: "ดันน่องเครื่อง", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "ใช้เครื่องเลกเพรส ดันด้วยปลายเท้า เข่าเหยียดเกือบตรง", tipEn: "On the leg press, push through the toes with the knees nearly straight." },
  { name: "Calf Raise", th: "เขย่งน่อง (น้ำหนักตัว)", alias: "ยกส้นเท้า", equip: ["bodyweight"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "bodyweight", sets: 4, rmin: 15, rmax: 25, tip: "ยืนขอบขั้นบันไดให้ส้นห้อย เพิ่มช่วงยืด", tipEn: "Stand on a step edge with the heels hanging off for more stretch." },
  { name: "Single Leg Calf Raise", th: "เขย่งน่องขาเดียว", alias: "ยกส้นขาเดียว", equip: ["bodyweight"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 20, tip: "ทีละข้างหนักกว่าเท่าตัว แก้น่องสองข้างไม่เท่ากัน", tipEn: "One leg is more than twice as hard — fixes side-to-side imbalance." },

  // ══════════ แกนกลาง ══════════
  { name: "Plank", th: "แพลงก์ (ไม้กระดาน)", alias: "ท่าแพลงค์", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "ลำตัวเป็นเส้นตรง เกร็งก้นและท้อง อย่าให้สะโพกตกหรือโด่ง", tipEn: "Body in a straight line, squeeze glutes and abs, hips neither sagging nor piked." },
  { name: "Side Plank", th: "แพลงก์ข้าง", alias: "แพลงค์ตะแคง", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "เน้นข้างลำตัว ทำทั้งสองข้างเท่ากัน", tipEn: "Targets the obliques — do both sides equally." },
  { name: "Hollow Body Hold", th: "ฮอลโลว์โฮลด์", alias: "ค้างตัวเรือ", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "หลังล่างแนบพื้นตลอด ยกไหล่และขาพ้นพื้น", tipEn: "Lower back pressed to the floor the whole time, shoulders and legs lifted." },
  { name: "Hanging Knee Raise", th: "ห้อยยกเข่า", alias: "โหนบาร์ยกเข่า", equip: ["pullup_bar","bodyweight"], pri: ["core"], sec: ["forearms"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "ม้วนสะโพกขึ้นด้วย ไม่ใช่แค่ยกเข่า อย่าแกว่ง", tipEn: "Curl the pelvis up too, not just the knees — and don't swing." },
  { name: "Hanging Leg Raise", th: "ห้อยยกขาตรง", alias: "โหนบาร์ยกขา", equip: ["pullup_bar","bodyweight"], pri: ["core"], sec: ["forearms"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, tip: "เวอร์ชันยากของยกเข่า ขาตรงตลอด", tipEn: "The hard version of knee raises — legs stay straight." },
  { name: "Toes to Bar", th: "ยกเท้าแตะบาร์", alias: "ทูสทูบาร์", equip: ["pullup_bar","bodyweight"], pri: ["core"], sec: ["forearms","back"], pattern: "core", fatigue: "high", type: "bodyweight", sets: 3, rmin: 5, rmax: 12, tip: "ขั้นสูงสุดของยกขา ต้องมีแรงบีบมือและแกนกลางแข็งแรง", tipEn: "The top of the leg-raise progression — needs real grip and core strength." },
  { name: "Lying Leg Raise", th: "นอนยกขา", alias: "ยกขาพื้น", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 20, avoid: ["lower_back"], tip: "มือสอดใต้ก้น หลังล่างแนบพื้น ลงช้าอย่าให้ขาแตะพื้น", tipEn: "Hands under the glutes, lower back flat, lower slowly without touching the floor." },
  { name: "Cable Crunch", th: "เคเบิลครันช์ (ม้วนท้อง)", alias: "ม้วนท้องเคเบิล", equip: ["cable"], pri: ["core"], pattern: "core", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ม้วนกระดูกสันหลังลง ไม่ใช่ก้มสะโพก — ท้องเพิ่มน้ำหนักได้เหมือนกล้ามอื่น", tipEn: "Curl the spine down, don't hinge at the hips — abs respond to added weight like any other muscle." },
  { name: "Crunch", th: "ครันช์ (ม้วนท้อง)", alias: "ซิทอัพ ลุกนั่ง", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 15, rmax: 25, tip: "ยกแค่สะบักพ้นพื้น ไม่ต้องขึ้นสุด อย่าดึงคอ", tipEn: "Lift only until the shoulder blades clear the floor. Don't pull on your neck." },
  { name: "Bicycle Crunch", th: "ปั่นจักรยานอากาศ", alias: "ครันช์บิดตัว", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, tip: "ศอกแตะเข่าฝั่งตรงข้าม ช้าๆ ให้รู้สึกท้องข้าง", tipEn: "Elbow to the opposite knee, slowly, until you feel the obliques." },
  { name: "Russian Twist", th: "รัสเซียนทวิสต์ (บิดตัว)", alias: "บิดเอว", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, avoid: ["lower_back"], tip: "บิดจากลำตัว ไม่ใช่แค่แกว่งแขน", tipEn: "Rotate from the torso, not just by swinging the arms." },
  { name: "Ab Wheel Rollout", th: "ล้อหน้าท้อง", alias: "แอบวีล ลูกกลิ้ง", equip: ["other"], pri: ["core"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "เกร็งท้องห้ามให้หลังแอ่น เริ่มจากคุกเข่าระยะสั้นก่อน", tipEn: "Brace the abs so the back never arches. Start from your knees with a short range." },
  { name: "Dead Bug", th: "เดดบัก", alias: "แมลงตาย", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "หลังล่างแนบพื้นตลอด ปลอดภัยกับหลัง เหมาะคนเริ่มต้น", tipEn: "Lower back stays flat the whole time — very back-safe and great for beginners." },
  { name: "Mountain Climber", th: "ไต่เขา", alias: "เมาน์เทนไคลม์เบอร์", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "moderate", type: "time", sets: 3, rmin: 30, rmax: 45, avoid: ["wrist"], tip: "สะโพกนิ่ง สลับเข่าเข้าอก เร็วแต่คุมฟอร์ม", tipEn: "Hips steady, alternate knees to the chest — fast but controlled." },
  { name: "Pallof Press", th: "พาลอฟเพรส (ต้านบิด)", alias: "ดันต้านแรงบิด", equip: ["cable"], pri: ["core"], pattern: "core", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ยืนข้างเคเบิล ดันออกหน้าโดยไม่ให้ลำตัวบิด — ฝึกความมั่นคง", tipEn: "Stand side-on to the cable and press out without letting the torso rotate — anti-rotation work." },

  // ══════════ ปลายแขน ══════════
  { name: "Wrist Curl (DB)", th: "ม้วนข้อมือ", alias: "ริสต์เคิร์ล", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, avoid: ["wrist"], tip: "พาดแขนบนเข่า ปล่อยข้อมือลงสุดแล้วม้วนขึ้น", tipEn: "Forearms on your knees, let the wrists drop fully, then curl up." },
  { name: "Reverse Wrist Curl (DB)", th: "ม้วนข้อมือคว่ำ", alias: "ริสต์เคิร์ลกลับ", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, avoid: ["wrist"], tip: "คว่ำมือ เน้นด้านบนปลายแขน ใช้น้ำหนักเบามาก", tipEn: "Palms down for the top of the forearm. Use very light weight." },
  { name: "Reverse Curl", th: "ม้วนคว่ำมือ", alias: "รีเวิร์สเคิร์ล", equip: ["barbell"], pri: ["forearms"], sec: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คว่ำมือม้วนขึ้น โดนปลายแขนด้านบนและไบเซปมัดล่าง", tipEn: "Overhand curl — hits the top of the forearm and the brachialis." },
  { name: "Pronation Curl", th: "ม้วนบิดข้อมือ", alias: "โปรเนชั่น", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["wrist"], tip: "บิดข้อมือคว่ำ-หงายทวนแรง เสริมกล้ามหมุนปลายแขน", tipEn: "Rotate the wrist against resistance to build the forearm rotators." },
  { name: "Farmer's Walk", th: "ฟาร์เมอร์วอล์ก (หิ้วเดิน)", alias: "หิ้วดัมเบลเดิน", equip: ["dumbbell"], pri: ["forearms"], sec: ["core","back"], pattern: "isolation", fatigue: "moderate", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "หิ้วหนักเดิน ไหล่ตั้ง — สร้างแรงบีบมือและแกนกลางไปพร้อมกัน", tipEn: "Carry heavy and walk tall — builds grip and core at the same time." },
  { name: "Dead Hang", th: "ห้อยบาร์", alias: "โหนบาร์ค้าง", equip: ["pullup_bar","bodyweight"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 60, tip: "ห้อยนิ่งๆ สร้างแรงบีบและยืดหัวไหล่", tipEn: "Just hang — builds grip and decompresses the shoulders." },
  { name: "Towel Pull-up", th: "ดึงข้อผ้าขนหนู", alias: "โหนผ้า", equip: ["pullup_bar","bodyweight"], pri: ["forearms","back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "พาดผ้าบนบาร์แล้วจับ — แรงบีบโหดกว่าจับบาร์มาก", tipEn: "Drape a towel over the bar and grip that — far harder on the grip than the bar." },
  { name: "Wrist Isometric Hold", th: "เกร็งข้อมือค้าง", alias: "ค้างข้อมือ", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 30, avoid: ["wrist"], tip: "ถือค้างในมุมที่อ่อนแรง ฝึกความทนของข้อมือ", tipEn: "Hold in the position where you're weakest to build wrist endurance." },
];

// ── ค่าเริ่มต้นตามอุปกรณ์ ──
// ดัมเบลนับน้ำหนักต่อข้าง (ถือข้างละอัน) ที่เหลือนับน้ำหนักรวม
export function unitFor(t: ExTemplate): string | undefined {
  if (t.type === "time") return "วิ";
  if (t.type === "bodyweight") return undefined;
  return t.equip.includes("dumbbell") ? "kg/ข้าง" : "kg";
}

// ระยะขยับน้ำหนักที่เล็กที่สุดที่ทำได้จริงกับอุปกรณ์นั้น
export function incFor(t: ExTemplate): number | undefined {
  if (t.type !== "weight") return undefined;
  if (t.equip.includes("dumbbell")) return 1; // ดัมเบลไทยมักขยับทีละ 1-2 kg ต่อข้าง
  if (t.equip.includes("machine") || t.equip.includes("cable")) return 5; // แผ่นเครื่องมักล็อกที่ 5
  if (t.equip.includes("band")) return 1;
  return 2.5; // บาร์เบล = แผ่นเล็กสุดข้างละ 1.25
}

// ท่าที่ใช้เครื่อง/เคเบิล — น้ำหนักรวม ไม่ใช่ต่อข้าง และไม่ต้อง warm-up ramp แบบฟรีเวท
export const isMachineEx = (t: ExTemplate): boolean => t.equip.includes("machine") || t.equip.includes("cable");

// นับเซตแบบ fractional ตามสเปค: primary 1.0 · secondary 0.5
export function musclesOf(t: ExTemplate): { m: MuscleKey; w: number }[] {
  return [...t.pri.map((m) => ({ m, w: 1 })), ...(t.sec ?? []).map((m) => ({ m, w: 0.5 }))];
}

// ══════════ เทียบชื่อท่า ══════════
//
// ผู้ใช้พิมพ์ชื่อท่าไม่ตรงกับคลังเป็นเรื่องปกติมาก และภาษาฟิตเนสมีคำพ้องเยอะ:
//   "Barbell Deadlift" / "Barbell Back Squat" — เติมชื่ออุปกรณ์ที่ชัดอยู่แล้ว
//   "Weighted Dips" / "Cable Tricep Pushdown" — เติมคำขยาย
//   "Single-Arm DB Row" — ใช้ตัวย่อ + ขีดกลาง
// ถ้าเทียบแบบตรงตัวอย่างเดียว ท่าพวกนี้จะจับคู่คลังไม่ได้เลย แล้วระบบต้องไป "เดา"
// กล้ามเนื้อ/ความล้า/tier ทั้งที่ข้อมูลจริงมีอยู่ในคลัง — วิเคราะห์เพี้ยนทั้งกระดาน

// ตัวย่อ/คำพ้องที่เจอบ่อยในชื่อท่า
const WORD_ALIAS: Record<string, string> = {
  db: "dumbbell", dbs: "dumbbell", bb: "barbell", ez: "ezbar",
  ohp: "overhead press", bw: "bodyweight",
  // รูปพหูพจน์ -> เอกพจน์ (คลังใช้เอกพจน์ทั้งหมด)
  dips: "dip", curls: "curl", rows: "row", presses: "press", press_es: "press",
  raises: "raise", extensions: "extension", flyes: "fly", flies: "fly", flys: "fly",
  pulldowns: "pulldown", pushdowns: "pushdown", squats: "squat", lunges: "lunge",
  crunches: "crunch", planks: "plank", pullovers: "pullover", shrugs: "shrug",
};

// คำพ้องระดับวลี — ชื่อที่วงการเรียกต่างกันแต่เป็นลิฟต์เดียวกัน
// ใส่เฉพาะที่เป็นท่าเดียวกันจริงๆ ไม่ใช่ท่าใกล้เคียง (ใส่มั่วจะจับคู่ผิดแล้ววิเคราะห์เพี้ยนหนักกว่าเดิม)
const PHRASE_ALIAS: [RegExp, string][] = [
  [/\bshoulder press\b/g, "overhead press"], // ดันไหล่ = ดันเหนือหัว
  [/\bmilitary press\b/g, "overhead press"],
  [/\bbarbell back squat\b/g, "barbell squat"], // back squat = squat ปกติ (ตรงข้าม front squat)
];

// แตกชื่อท่าเป็นชุดคำมาตรฐาน — ตัดวงเล็บ ขีดกลาง ตัวย่อ พหูพจน์ ออกให้หมด
export function nameTokens(name: string): string[] {
  let cleaned = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // ตัดหมายเหตุในวงเล็บ เช่น "Chin-up (มือหงาย แคบ)"
    .replace(/[-_/,]/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, " ");
  for (const [re, to] of PHRASE_ALIAS) cleaned = cleaned.replace(re, to);
  const out: string[] = [];
  for (const raw of cleaned.split(/\s+/)) {
    if (!raw) continue;
    const mapped = WORD_ALIAS[raw] ?? raw;
    for (const w of mapped.split(" ")) if (w) out.push(w);
  }
  return out;
}

const tokenKey = (name: string) => nameTokens(name).slice().sort().join(" ");

// index สร้างครั้งเดียวตอนโหลด — findTemplate ถูกเรียกบ่อยมาก (ทุกท่า ทุกครั้งที่วิเคราะห์)
const EXACT_INDEX = new Map<string, ExTemplate>();
const TOKEN_INDEX = new Map<string, ExTemplate>();
for (const t of EXERCISE_DB) {
  EXACT_INDEX.set(t.name.trim().toLowerCase(), t);
  const k = tokenKey(t.name);
  if (!TOKEN_INDEX.has(k)) TOKEN_INDEX.set(k, t);
}

// คำที่ใช้ค้นได้ทั้งหมดของท่านั้น
//
// รวมทั้งไทยและอังกฤษเสมอ ไม่ขึ้นกับภาษาที่ตั้งไว้ — คนไทยที่สลับ UI เป็นอังกฤษ
// ยังพิมพ์ "อก" ค้นอยู่ และคนที่ใช้ไทยก็พิมพ์ "chest" ได้ ตัดตามภาษาจะทำให้ค้นไม่เจอ
// ทั้งที่ก่อนหน้านี้เจอ ซึ่งเป็นการถอยหลังที่ผู้ใช้ไม่เข้าใจว่าทำไม
const searchFields = (t: ExTemplate) => ({
  en: t.name.toLowerCase(),
  th: t.th.toLowerCase(),
  alias: (t.alias ?? "").toLowerCase(),
  muscle: t.pri.map((m) => `${MUSCLE_TH[m]} ${MUSCLE_EN[m]} ${MUSCLE_ALIAS[m]}`).join(" ").toLowerCase(),
  equip: t.equip.map((e) => `${EQUIP_TH[e]} ${EQUIP_EN[e]}`).join(" ").toLowerCase(),
});

// ค้นหาท่า — ไทย/อังกฤษ/ชื่อเล่น/กล้ามเนื้อ/อุปกรณ์
// จัดลำดับให้ผลที่ "ตรงใจ" ขึ้นก่อน: ค้น "อก" ต้องได้ท่าอก ไม่ใช่ "บ็อกซ์สควอท"
export function searchExercises(query: string, limit = 60): ExTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_DB.slice(0, limit);

  // แยกคำด้วย เพราะการเทียบ substring ทั้งประโยคทำให้ค้น "Barbell Deadlift" ไม่เจอ "Deadlift" เลย
  // (ผู้ใช้พิมพ์ละเอียดกว่าชื่อในคลังเป็นเรื่องปกติ)
  const qTokens = nameTokens(q);

  const scored: { t: ExTemplate; score: number }[] = [];
  for (const t of EXERCISE_DB) {
    const f = searchFields(t);
    let score = 0;
    if (f.muscle.includes(q) || f.equip.includes(q)) score = 6;
    else if (f.en.startsWith(q) || f.th.startsWith(q)) score = 5;
    else if (f.en.includes(q) || f.th.includes(q)) score = 4;
    else if (f.alias.includes(q)) score = 3;
    else if (qTokens.length) {
      // ให้คะแนนตามสัดส่วนคำที่ตรงกัน — ยิ่งตรงหลายคำยิ่งขึ้นก่อน
      const tTokens = nameTokens(t.name);
      const hit = qTokens.filter((w) => tTokens.includes(w)).length;
      if (hit) score = 2 * (hit / Math.max(qTokens.length, tTokens.length));
    }
    if (score) scored.push({ t, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
    .slice(0, limit)
    .map((s) => s.t);
}

export function findTemplate(name: string): ExTemplate | undefined {
  const n = name.trim().toLowerCase();

  // 1) ตรงตัวเป๊ะ — เร็วสุดและแม่นสุด
  const exact = EXACT_INDEX.get(n);
  if (exact) return exact;

  const qTokens = nameTokens(name);
  if (!qTokens.length) return undefined;

  // 2) ชุดคำเหมือนกันทั้งหมด (ต่างแค่ลำดับ/ขีดกลาง/ตัวย่อ/พหูพจน์)
  //    เช่น "Chest-Supported Row" = "Chest Supported Row" · "Single-Arm DB Row" ชุดคำ != "Dumbbell Row" (มี single/arm เกิน) ไปข้อ 3
  const sameSet = TOKEN_INDEX.get(qTokens.slice().sort().join(" "));
  if (sameSet) return sameSet;

  // 3) ชื่อในคลังเป็น "ส่วนย่อย" ของที่ผู้ใช้พิมพ์ — ผู้ใช้เขียนละเอียดกว่าคลัง
  //    "Barbell Back Squat" ⊃ "Barbell Squat" · "Weighted Dip" ⊃ "Dip" · "Cable Tricep Pushdown" ⊃ "Tricep Pushdown"
  //    เลือกตัวที่คำตรงกันมากที่สุด = เจาะจงที่สุด (ไม่งั้น "Incline Barbell Bench Press" จะไปแมตช์ "Bench Press" แทน "Incline Barbell Press")
  const qSet = new Set(qTokens);
  let best: ExTemplate | undefined;
  let bestLen = 0;
  for (const t of EXERCISE_DB) {
    const tTokens = nameTokens(t.name);
    if (tTokens.length <= bestLen) continue; // มีตัวเจาะจงกว่าอยู่แล้ว
    if (tTokens.every((w) => qSet.has(w))) {
      best = t;
      bestLen = tTokens.length;
    }
  }
  return best;
}

export const EXERCISE_COUNT = EXERCISE_DB.length;

// ── จัดอันดับท่า (tier) ──
// S = ท่าที่คุ้มค่าที่สุดต่อเวลาและความล้า: กระตุ้นกล้ามได้เยอะ เพิ่มน้ำหนักได้ต่อเนื่อง
//     ฟอร์มเรียนรู้ได้ และมีในยิมแทบทุกที่ — ควรเป็นแกนของโปรแกรม
// A = ท่าดี ใช้เสริมหรือใช้แทนเมื่อไม่มีอุปกรณ์ของ S
// B = ท่าเฉพาะทาง/เสริมเล็ก ใส่ได้ถ้าเวลาเหลือ
export type Tier = "S" | "A" | "B";

const TIER_S = new Set([
  // ดัน
  "Barbell Bench Press", "Incline Barbell Press", "Incline DB Press", "Dumbbell Bench Press",
  "Overhead Press", "Overhead Press (DB)", "Dip", "Push-up",
  // ดึง
  "Deadlift", "Barbell Row", "Dumbbell Row", "Seated Cable Row", "Lat Pulldown",
  "Wide Grip Pull-up", "Chin-up", "Chest Supported Row",
  // ขา
  "Barbell Squat", "Front Squat", "Leg Press", "Romanian Deadlift", "Bulgarian Split Squat",
  "Barbell Hip Thrust", "Lying Leg Curl", "Seated Leg Curl",
  // เจาะจงที่จำเป็นจริง (กล้ามมัดที่ compound ให้ไม่พอ)
  "Lateral Raise", "Cable Lateral Raise", "Face Pull", "Standing Calf Raise", "Seated Calf Raise",
  "Barbell Curl", "Dumbbell Curl", "Tricep Pushdown", "Overhead Tricep Extension",
  "Hanging Knee Raise", "Cable Crunch", "Plank",
]);

const TIER_A = new Set([
  "Decline Barbell Press", "Cable Fly", "Dumbbell Fly", "Pec Deck", "Chest Press Machine",
  "Pendlay Row", "T-Bar Row", "Machine Row", "Close Grip Pulldown", "Neutral Grip Pull-up",
  "Australian Row", "Straight Arm Pulldown", "Barbell Shrug",
  "Arnold Press", "Shoulder Press Machine", "Machine Lateral Raise", "Rear Delt Fly", "Reverse Pec Deck",
  "EZ Bar Curl", "Incline DB Curl", "Hammer Curl", "Preacher Curl", "Cable Curl",
  "Close Grip Bench Press", "Rope Pushdown", "Skull Crusher", "Cable Overhead Extension",
  "Hack Squat", "Smith Machine Squat", "Goblet Squat", "Walking Lunge", "Reverse Lunge",
  "Leg Extension", "Stiff Leg Deadlift", "Dumbbell RDL", "Good Morning", "Glute Bridge",
  "Cable Pull Through", "Nordic Curl", "Calf Raise", "Leg Press Calf Raise",
  "Hanging Leg Raise", "Lying Leg Raise", "Ab Wheel Rollout", "Crunch",
  "Wrist Curl (DB)", "Reverse Curl", "Farmer's Walk",
]);

export const tierOf = (name: string): Tier => (TIER_S.has(name) ? "S" : TIER_A.has(name) ? "A" : "B");
export const TIER_RANK: Record<Tier, number> = { S: 0, A: 1, B: 2 };
