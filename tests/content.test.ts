import { describe, expect, it } from "vitest";
import { seedMissions, seedVariants } from "../db/seed/content";
import { parseNumericAnswer } from "@/lib/normalize";
import { isChoiceAnswerCorrect } from "@/lib/normalize";

/* ---------------------- aritmetika rasional eksak ---------------------- */

type Frac = { n: bigint; d: bigint };

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x;
}

function frac(n: bigint, d: bigint = 1n): Frac {
  if (d === 0n) throw new Error("pembagi nol");
  const sign = d < 0n ? -1n : 1n;
  const divisor = gcd(n, d) || 1n;
  return { n: (n * sign) / divisor, d: (d * sign) / divisor };
}

const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
const toNumber = (a: Frac) => Number(a.n) / Number(a.d);

function tokenize(source: string): string[] {
  const tokens = source.match(/\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!tokens) throw new Error(`ekspresi tidak valid: ${source}`);
  return tokens;
}

function parseExpression(source: string): Frac {
  const tokens = tokenize(source);
  let index = 0;

  function peek(): string | undefined {
    return tokens[index];
  }

  function parseNumber(): Frac {
    const token = tokens[index];
    if (!token || !/^\d/.test(token)) throw new Error(`angka diharapkan, dapat ${token}`);
    index += 1;
    if (token.includes(".")) {
      const [whole, decimal] = token.split(".");
      return frac(BigInt(whole + decimal), 10n ** BigInt(decimal.length));
    }
    return frac(BigInt(token));
  }

  function parseFactor(): Frac {
    const token = peek();
    if (token === "-") {
      index += 1;
      return mul(frac(-1n), parseFactor());
    }
    if (token === "+") {
      index += 1;
      return parseFactor();
    }
    if (token === "(") {
      index += 1;
      const value = parseSum();
      if (peek() !== ")") throw new Error("tanda kurung tidak seimbang");
      index += 1;
      return value;
    }
    return parseNumber();
  }

  function parseProduct(): Frac {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const operator = tokens[index];
      index += 1;
      const right = parseFactor();
      value = operator === "*" ? mul(value, right) : div(value, right);
    }
    return value;
  }

  function parseSum(): Frac {
    let value = parseProduct();
    while (peek() === "+" || peek() === "-") {
      const operator = tokens[index];
      index += 1;
      const right = parseProduct();
      value = operator === "+" ? add(value, right) : sub(value, right);
    }
    return value;
  }

  const result = parseSum();
  if (index !== tokens.length) throw new Error(`token tersisa: ${tokens.slice(index).join(" ")}`);
  return result;
}

/** Mengubah token angka/pecahan dari teks jawaban menjadi rasional eksak. */
function decimalFrac(token: string): Frac {
  let body = token;
  if (body.includes(".") && !body.includes(",")) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(body)) {
      return frac(BigInt(body.replace(/\./g, "")));
    }
    const [whole, decimal] = body.split(".");
    return frac(BigInt((whole || "0") + decimal), 10n ** BigInt(decimal.length));
  }
  if (body.includes(",")) {
    const [whole, decimal] = body.split(",");
    return frac(BigInt((whole || "0") + decimal), 10n ** BigInt(decimal.length));
  }
  return frac(BigInt(body));
}

/** Mengambil nilai pertama dari teks jawaban, mis. "Rp6.250", "1,25 kg", atau "3/4 gelas". */
function extractAnswerValue(answer: string): Frac | null {
  const cleaned = answer.toLowerCase().replace(/^rp\.?\s*/, "");
  const match = cleaned.match(/\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?/);
  if (!match) return null;

  const token = match[0];
  if (token.includes("/")) {
    const [numerator, denominator] = token.split("/");
    return div(decimalFrac(numerator), decimalFrac(denominator));
  }
  return decimalFrac(token);
}

describe("konten pembelajaran", () => {
  it("berisi 3 misi dengan 10 soal each dan urutan yang benar", () => {
    expect(seedMissions).toHaveLength(3);
    expect(seedMissions.map((mission) => mission.orderIndex)).toEqual([1, 2, 3]);
    for (const mission of seedMissions) {
      expect(mission.questions).toHaveLength(10);
      expect(mission.learningObjectives.length).toBeGreaterThanOrEqual(3);
      expect(mission.story.length).toBeGreaterThan(80);
      expect(mission.slug).toMatch(/^[a-z0-9-]+$/);
    }
    const total = seedMissions.reduce((sum, mission) => sum + mission.questions.length, 0);
    expect(total).toBe(30);
  });

  it("semua soal punya teks, penjelasan, petunjuk, dan tingkat kesulitan yang sah", () => {
    for (const mission of seedMissions) {
      for (const question of mission.questions) {
        expect(question.prompt.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(20);
        expect(question.hint.length).toBeGreaterThan(5);
        expect(["mudah", "sedang", "tantangan"]).toContain(question.difficulty);
      }
    }
  });

  it("setiap soal pilihan ganda punya pilihan unik dan jawaban yang termasuk pilihan", () => {
    for (const mission of seedMissions) {
      for (const question of mission.questions) {
        if (question.type !== "multiple_choice") continue;
        const options = question.options ?? [];
        expect(options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(options.map((option) => option.toLowerCase())).size).toBe(options.length);
        const matched = options.some((option) => isChoiceAnswerCorrect(option, question.answer));
        expect(matched, `${question.prompt} -> ${question.answer}`).toBe(true);
      }
    }
  });

  it("setiap soal angka punya jawaban numerik yang valid dan tanpa pilihan", () => {
    for (const mission of seedMissions) {
      for (const question of mission.questions) {
        if (question.type !== "numeric") continue;
        expect(parseNumericAnswer(question.answer)).not.toBeNull();
        expect(question.options ?? []).toHaveLength(0);
        expect(question.unitLabel?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("menghitung ulang setiap jawaban dengan aritmetika eksak", () => {
    let verified = 0;
    for (const mission of seedMissions) {
      for (const question of mission.questions) {
        if (!question.verification) continue;
        const expected = parseExpression(question.verification.expression);
        const actual = extractAnswerValue(question.answer);
        expect(actual, `${question.prompt} tidak punya angka pada jawaban`).not.toBeNull();
        const difference = sub(expected, actual!);
        expect(
          difference.n === 0n,
          `${mission.slug}: "${question.answer}" (${toNumber(actual!)}) vs ${question.verification.expression} = ${toNumber(expected)}`,
        ).toBe(true);
        verified += 1;
      }
    }
    expect(verified).toBeGreaterThanOrEqual(28);
  });

  it("memeriksa soal perbandingan yang tidak memakai ekspresi aritmetika langsung", () => {
    const fractionMission = seedMissions.find((mission) => mission.slug === "koki-pecahan");
    expect(fractionMission).toBeDefined();

    const compare = fractionMission!.questions.find((question) => question.prompt.includes("2/3 atau 3/5"));
    expect(compare?.answer).toBe("2/3");
    expect(2 / 3).toBeGreaterThan(3 / 5);

    const lessThanHalf = fractionMission!.questions.find((question) => question.prompt.includes("kurang dari 1/2"));
    expect(lessThanHalf?.answer).toBe("2/5");
    const values = (lessThanHalf!.options ?? []).map((option) => {
      const [numerator, denominator] = option.split("/").map(Number);
      return numerator / denominator;
    });
    expect(values.filter((value) => value < 0.5)).toHaveLength(1);

    const marketMission = seedMissions.find((mission) => mission.slug === "pasar-pintar");
    const unitPrice = marketMission!.questions.find((question) => question.prompt.includes("4 apel"));
    expect(unitPrice?.answer).toBe("2900");
    expect(11600 / 4).toBe(2900);
    expect(2900).toBeLessThan(9000 / 3);

    const unitQuestion = seedMissions
      .find((mission) => mission.slug === "arsitek-mini")!
      .questions.find((question) => question.prompt.includes("Satuan apa yang paling tepat"));
    expect(unitQuestion?.answer).toBe("meter persegi (m²)");
    expect(unitQuestion?.verification).toBeUndefined();
  });

  it("menyebar posisi jawaban benar agar tidak bisa ditebak dari pola", () => {
    const total: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const mission of seedMissions) {
      const positions: number[] = [];
      for (const question of mission.questions) {
        if (question.type !== "multiple_choice") continue;
        const index = (question.options ?? []).findIndex((option) => isChoiceAnswerCorrect(option, question.answer));
        expect(index, `${mission.slug}: jawaban "${question.answer}" tidak ada di pilihan`).toBeGreaterThanOrEqual(0);
        positions.push(index + 1);
        total[index + 1] += 1;
      }
      expect(new Set(positions).size, `${mission.slug} memakai posisi jawaban yang terlalu seragam`).toBeGreaterThanOrEqual(2);
    }

    for (const position of [1, 2, 3, 4]) {
      expect(total[position], `posisi ${position} terlalu jarang dipakai`).toBeGreaterThanOrEqual(2);
      expect(total[position], `posisi ${position} terlalu sering dipakai`).toBeLessThanOrEqual(5);
    }
  });
});

describe("bank soal varian", () => {
  const variants = Object.entries(seedVariants);

  it("setiap varian mengisi slot yang sudah ada di misinya", () => {
    expect(variants.length).toBeGreaterThanOrEqual(3);
    for (const [slug, list] of variants) {
      const mission = seedMissions.find((item) => item.slug === slug);
      expect(mission, `misi ${slug} tidak ditemukan`).toBeDefined();
      for (const variant of list) {
        expect(variant.slot).toBeGreaterThanOrEqual(1);
        expect(variant.slot).toBeLessThanOrEqual(mission!.questions.length);
        expect(variant.topic).toBe(mission!.questionTopics[variant.slot - 1]);
        expect(variant.prompt.length).toBeGreaterThan(20);
        expect(variant.explanation.length).toBeGreaterThan(20);
      }
    }
  });

  it("varian pilihan ganda punya pilihan unik yang memuat jawaban", () => {
    for (const [, list] of variants) {
      for (const variant of list) {
        if (variant.type !== "multiple_choice") continue;
        const options = variant.options ?? [];
        expect(options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(options.map((option) => option.toLowerCase())).size).toBe(options.length);
        expect(options.some((option) => isChoiceAnswerCorrect(option, variant.answer))).toBe(true);
      }
    }
  });

  it("varian angka punya jawaban numerik dan ekspresi verifikasi yang cocok", () => {
    for (const [, list] of variants) {
      for (const variant of list) {
        if (variant.type === "numeric") {
          expect(parseNumericAnswer(variant.answer)).not.toBeNull();
          expect(variant.options ?? []).toHaveLength(0);
        }
        if (!variant.verification) continue;
        const expected = parseExpression(variant.verification.expression);
        const actual = extractAnswerValue(variant.answer);
        expect(actual, `${variant.prompt} tidak punya angka pada jawaban`).not.toBeNull();
        const difference = sub(expected, actual!);
        expect(
          difference.n === 0n,
          `${variant.prompt}: "${variant.answer}" vs ${variant.verification.expression}`,
        ).toBe(true);
      }
    }
  });
});
