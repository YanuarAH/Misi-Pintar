/**
 * Daftar topik pembelajaran. Kunci disimpan di `questions.topic`, label dipakai UI.
 * Urutan di sini menentukan urutan tampilan peta kemampuan.
 */
export const TOPICS = [
  { key: "penjumlahan-pengurangan", label: "Penjumlahan & pengurangan", missionSlug: "pasar-pintar" },
  { key: "perkalian-pembagian", label: "Perkalian & pembagian", missionSlug: "pasar-pintar" },
  { key: "desimal", label: "Bilangan desimal", missionSlug: "pasar-pintar" },
  { key: "persen-diskon", label: "Persen & diskon", missionSlug: "pasar-pintar" },
  { key: "pecahan-banding", label: "Membandingkan pecahan", missionSlug: "koki-pecahan" },
  { key: "pecahan-operasi", label: "Menjumlah & mengurang pecahan", missionSlug: "koki-pecahan" },
  { key: "pecahan-satuan", label: "Pecahan & satuan ukur", missionSlug: "koki-pecahan" },
  { key: "keliling", label: "Keliling", missionSlug: "arsitek-mini" },
  { key: "luas", label: "Luas", missionSlug: "arsitek-mini" },
  { key: "volume", label: "Volume", missionSlug: "arsitek-mini" },
  { key: "satuan", label: "Satuan pengukuran", missionSlug: "arsitek-mini" },
  { key: "makhluk-hidup", label: "Makhluk hidup & lingkungan", missionSlug: "detektif-makhluk-hidup" },
  { key: "wujud-zat", label: "Wujud zat & perubahannya", missionSlug: "detektif-makhluk-hidup" },
  { key: "membaca-teks", label: "Membaca & memahami teks", missionSlug: "petualangan-membaca" },
  { key: "kosa-kata-inggris", label: "Kosakata bahasa Inggris", missionSlug: "my-daily-words" },
  { key: "tubuh-manusia", label: "Tubuh manusia & kesehatan", missionSlug: null },
  { key: "energi-listrik", label: "Energi & listrik", missionSlug: null },
  { key: "bumi-lingkungan", label: "Bumi & lingkungan", missionSlug: null },
  { key: "umum", label: "Topik umum", missionSlug: null },
] as const;

export type TopicKey = (typeof TOPICS)[number]["key"];

export const TOPIC_KEYS = TOPICS.map((topic) => topic.key) as TopicKey[];

const TOPIC_MAP = new Map(TOPICS.map((topic) => [topic.key, topic]));

export function topicLabel(key: string): string {
  return TOPIC_MAP.get(key as TopicKey)?.label ?? "Topik umum";
}

export function topicMission(key: string): string | null {
  return TOPIC_MAP.get(key as TopicKey)?.missionSlug ?? null;
}

/** Topik yang boleh dipilih guru saat menulis soal. */
export const SELECTABLE_TOPICS = TOPICS.map((topic) => ({ key: topic.key, label: topic.label }));

/** Urutan tampilan: sesuai urutan kurikulum di atas, topik tak dikenal paling akhir. */
export function topicOrder(key: string): number {
  const index = TOPIC_KEYS.indexOf(key as TopicKey);
  return index === -1 ? TOPIC_KEYS.length : index;
}

export type MasteryLevel = "kuat" | "berkembang" | "perlu-latihan" | "belum-ada";

/** Ambang sederhana dan transparan; dipakai juga di UI sebagai teks, bukan warna saja. */
export function masteryLevel(accuracy: number | null, answers: number): MasteryLevel {
  if (!answers || accuracy === null) return "belum-ada";
  if (accuracy >= 80) return "kuat";
  if (accuracy >= 60) return "berkembang";
  return "perlu-latihan";
}

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  kuat: "Sudah kuat",
  berkembang: "Berkembang",
  "perlu-latihan": "Perlu latihan tambahan",
  "belum-ada": "Belum dicoba",
};
