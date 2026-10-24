import { describe, expect, it } from "vitest";
import {
  canonicalNumeric,
  isChoiceAnswerCorrect,
  isNumericAnswerCorrect,
  parseNumericAnswer,
} from "@/lib/normalize";

describe("normalisasi jawaban angka", () => {
  it("menerima angka polos dan pemisah ribuan khas Indonesia", () => {
    expect(parseNumericAnswer("25500")).toBe(25500);
    expect(parseNumericAnswer("25.500")).toBe(25500);
    expect(parseNumericAnswer("Rp25.500")).toBe(25500);
    expect(parseNumericAnswer("Rp 25.500 ")).toBe(25500);
    expect(parseNumericAnswer("2 500")).toBe(2500);
    expect(parseNumericAnswer("1.234.567")).toBe(1234567);
  });

  it("memperlakukan koma sebagai desimal", () => {
    expect(parseNumericAnswer("1,5")).toBe(1.5);
    expect(parseNumericAnswer("0,75")).toBe(0.75);
    expect(parseNumericAnswer("2,5")).toBe(2.5);
  });

  it("menerima titik desimal singkat", () => {
    expect(parseNumericAnswer("1.5")).toBe(1.5);
    expect(parseNumericAnswer("0.25")).toBe(0.25);
  });

  it("menangani campuran titik ribuan dan koma desimal", () => {
    expect(parseNumericAnswer("1.234,56")).toBe(1234.56);
    expect(parseNumericAnswer("Rp 1.234,56")).toBe(1234.56);
    expect(parseNumericAnswer("1,234.56")).toBe(1234.56);
  });

  it("menerima pecahan", () => {
    expect(parseNumericAnswer("3/4")).toBe(0.75);
    expect(parseNumericAnswer("5/6")).toBeCloseTo(5 / 6, 10);
    expect(parseNumericAnswer("-3/4")).toBe(-0.75);
  });

  it("menolak input yang tidak jelas atau bukan angka", () => {
    expect(parseNumericAnswer("")).toBeNull();
    expect(parseNumericAnswer("dua ribu")).toBeNull();
    expect(parseNumericAnswer("25rb")).toBeNull();
    expect(parseNumericAnswer("1,2,3")).toBeNull();
    expect(parseNumericAnswer("1/0")).toBeNull();
    expect(parseNumericAnswer("  ")).toBeNull();
    expect(parseNumericAnswer("12.34.56")).toBeNull();
  });

  it("tidak menerima jawaban yang hanya mirip teksnya", () => {
    expect(isNumericAnswerCorrect("25500", "2550")).toBe(false);
    expect(isNumericAnswerCorrect("25500", "255000")).toBe(false);
    expect(isNumericAnswerCorrect("2500", "2.500")).toBe(true);
    expect(isNumericAnswerCorrect("1.5", "1,5")).toBe(true);
    expect(isNumericAnswerCorrect("1.5", "15")).toBe(false);
    expect(isNumericAnswerCorrect("0.75", "3/4")).toBe(true);
    expect(isNumericAnswerCorrect("0.75", "75")).toBe(false);
  });

  it("menyimpan bentuk kanonik tanpa pemisah ribuan", () => {
    expect(canonicalNumeric(25500)).toBe("25500");
    expect(canonicalNumeric(1.75)).toBe("1.75");
    expect(canonicalNumeric(5 / 6)).toBe("0.833333");
  });
});

describe("jawaban pilihan ganda", () => {
  it("membandingkan tanpa peduli spasi dan huruf besar", () => {
    expect(isChoiceAnswerCorrect("Rp6.250", "  rp6.250 ")).toBe(true);
    expect(isChoiceAnswerCorrect("3/4 gelas", "3/4  gelas")).toBe(true);
    expect(isChoiceAnswerCorrect("Rp6.250", "Rp6.750")).toBe(false);
  });
});
