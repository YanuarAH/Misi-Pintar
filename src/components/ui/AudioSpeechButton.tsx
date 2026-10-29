"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Mendeteksi apakah teks cenderung merupakan kalimat/pertanyaan Bahasa Inggris
 * atau Bahasa Indonesia.
 */
function detectLanguage(text: string): "en-US" | "id-ID" {
  const englishWordPattern =
    /\b(the|is|are|am|was|were|what|where|when|which|who|why|how|this|that|these|those|choose|correct|fill|blank|sentence|following|read|dialogue|picture|word|meaning|have|has|had|do|does|did|can|could|will|would|should|must|you|your|he|she|it|they|them|their|we|our|my|me|morning|afternoon|evening|hello|goodbye|please|thank|welcome|school|teacher|student|classroom|book|pencil|family|father|mother|brother|sister|animal|color|number|food|water|drink|eat|play|go|come|in|on|at|under|near|behind|between|likes|loves|wants|hobby|wake|wakes|waking|woke|routine|sleep|bedroom|garage|garden|kitchen|ruler)\b/gi;

  const indonesianWordPattern =
    /\b(yang|di|dan|dari|ini|itu|dengan|untuk|pada|adalah|ke|dalam|bisa|ada|jika|karena|berapa|siapa|apa|mengapa|bagaimana|kapan|manakah|hitunglah|sebutkan|jelaskan|siswa|anak|guru|sekolah|kelas|soal|jawaban|rupiah|ribu|ratus|kembalian|harga|pecahan|luas|keliling|taman|pasar|pilihan)\b/gi;

  const englishMatches = text.match(englishWordPattern) || [];
  const indonesianMatches = text.match(indonesianWordPattern) || [];

  if (englishMatches.length > indonesianMatches.length && englishMatches.length >= 2) {
    return "en-US";
  }

  return "id-ID";
}

export function AudioSpeechButton({
  text,
  label = "Dengarkan suara",
  size = "md",
  className,
}: {
  text: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Bersihkan suara bila teks berganti atau komponen unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Abaikan error saat unmount
        }
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Abaikan error
      }
      setSpeaking(false);
      setNotice(null);
    }
  }, [text]);

  function toggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNotice("Fitur suara tidak tersedia di peramban ini.");
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    // Jika sedang berbicara, hentikan
    if (speaking) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Abaikan error
      }
      setSpeaking(false);
      return;
    }

    try {
      // Resume audio engine mobile (Chrome Android & Safari iOS)
      if (typeof window.speechSynthesis.resume === "function") {
        window.speechSynthesis.resume();
      }

      const targetLang = detectLanguage(text);

      // Bersihkan teks untuk artikulasi yang jelas
      let cleanText = text
        .replace(/_{2,}/g, targetLang === "en-US" ? "blank" : "titik-titik")
        .replace(/•/g, "")
        .replace(/\bOption\s+([A-F]):/gi, "Option $1.")
        .replace(/\bPilihan\s+([A-F]):/gi, "Pilihan $1.")
        .trim();

      if (targetLang === "id-ID") {
        cleanText = cleanText
          .replace(/Rp([0-9.]+)/g, "$1 rupiah")
          .replace(/(\d+)\/(\d+)/g, "$1 per $2");
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = targetLang;
      utterance.rate = targetLang === "en-US" ? 0.9 : 0.95;
      utterance.pitch = 1.0;

      // Cari suara yang cocok jika daftar suara sudah dimuat oleh browser
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices && availableVoices.length > 0) {
          if (targetLang === "en-US") {
            const match = availableVoices.find(
              (v) =>
                v.lang.startsWith("en-") ||
                v.lang === "en" ||
                v.lang.includes("US") ||
                v.lang.includes("GB") ||
                v.name.toLowerCase().includes("english"),
            );
            if (match) utterance.voice = match;
          } else {
            const match = availableVoices.find(
              (v) =>
                v.lang.startsWith("id") ||
                v.lang.includes("ID") ||
                v.name.toLowerCase().includes("indonesia"),
            );
            if (match) utterance.voice = match;
          }
        }
      } catch {
        // Gunakan default bawaan browser jika pencarian voice gagal
      }

      utterance.onstart = () => {
        setSpeaking(true);
        setNotice(null);
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (e) => {
        setSpeaking(false);
        // Error 'canceled' atau 'interrupted' wajar saat user berpindah soal atau klik stop
        if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
          setNotice("Suara tidak dapat dimainkan di perangkat ini.");
          setTimeout(() => setNotice(null), 3000);
        }
      };

      // Simpan di ref agar tidak di-garbage-collect oleh Chromium Android
      utteranceRef.current = utterance;
      setSpeaking(true);

      // Jalankan pembacaan
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
      setNotice("Suara belum dapat dimainkan.");
      setTimeout(() => setNotice(null), 3000);
    }
  }

  const isEnglish = detectLanguage(text) === "en-US";
  const dynamicLabel = isEnglish ? "Listen to audio" : label;

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={toggleSpeech}
        aria-label={speaking ? (isEnglish ? "Stop audio" : "Hentikan suara") : dynamicLabel}
        title={speaking ? (isEnglish ? "Stop audio" : "Hentikan suara") : dynamicLabel}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink shadow-sm transition hover:bg-paper focus-visible:ring-2 active:scale-95",
          size === "sm" ? "size-10 sm:size-9" : "size-11",
          speaking && "border-primary bg-primary-soft text-primary animate-pulse ring-2 ring-primary/30",
          className,
        )}
      >
        {speaking ? (
          <VolumeX className={size === "sm" ? "size-4 sm:size-3.5" : "size-5"} aria-hidden="true" />
        ) : (
          <Volume2 className={size === "sm" ? "size-4 sm:size-3.5" : "size-5"} aria-hidden="true" />
        )}
      </button>
      {notice ? (
        <span
          role="status"
          className="absolute -bottom-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink/90 px-2 py-1 text-[11px] font-medium text-white shadow-md"
        >
          {notice}
        </span>
      ) : null}
    </div>
  );
}
