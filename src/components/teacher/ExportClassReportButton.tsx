"use client";

import { Download } from "lucide-react";
import type { RosterStudent } from "@/server/teacher";
import { formatDateTime } from "@/lib/format";
import { gradeLabel } from "@/lib/curriculum";

export function ExportClassReportButton({
  className,
  gradeLevel,
  subjectLabel,
  students,
}: {
  className: string;
  gradeLevel: number | null;
  subjectLabel: string | null;
  students: RosterStudent[];
}) {
  function handleExport() {
    if (students.length === 0) {
      alert("Belum ada siswa di kelas ini untuk diekspor.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const cleanClassName = className.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Baris metadata kelas
    const lines: string[] = [
      `"REKAP NILAI & AKTIVITAS KELAS - MISI PINTAR"`,
      `"Nama Kelas:","${className}"`,
      `"Tingkat:","${gradeLabel(gradeLevel)}"`,
      `"Mata Pelajaran:","${subjectLabel ?? "Semua"}"`,
      `"Tanggal Unduh:","${today}"`,
      `"Total Siswa:","${students.length}"`,
      "",
      // Header Kolom untuk Excel / e-Rapor
      `"No","Nama Siswa","Kode Siswa","Tingkat","Misi Selesai","Total Percobaan","Rata-rata Akurasi (%)","Status Belajar","Terakhir Aktif"`,
    ];

    // Data Siswa
    students.forEach((student, index) => {
      const accuracyStr = student.avgAccuracy !== null ? `${student.avgAccuracy}` : "-";
      const statusStr =
        student.avgAccuracy === null
          ? "Belum Mulai"
          : student.avgAccuracy >= 85
            ? "Sangat Mahir"
            : student.avgAccuracy >= 70
              ? "Cukup Baik"
              : "Perlu Bimbingan";

      const lastActiveStr = student.lastActiveAt ? formatDateTime(student.lastActiveAt) : "-";

      lines.push(
        [
          index + 1,
          `"${student.displayName.replace(/"/g, '""')}"`,
          `"${student.accessCode}"`,
          `"${student.gradeLevel ? `Kelas ${student.gradeLevel}` : "-"}"`,
          student.completedMissions,
          student.attempts,
          accuracyStr,
          `"${statusStr}"`,
          `"${lastActiveStr}"`,
        ].join(","),
      );
    });

    // Tambahkan BOM \uFEFF agar Microsoft Excel otomatis membaca UTF-8 dengan benar
    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `rekap_nilai_${cleanClassName}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-bold text-ink transition hover:bg-paper focus-visible:ring-2"
    >
      <Download className="size-4 text-primary" aria-hidden="true" />
      Ekspor Nilai (.csv)
    </button>
  );
}

