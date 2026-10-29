"use client";

import { useRef } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { archiveMissionAction, deleteMissionAction, restoreMissionAction } from "@/app/actions/teacher";
import { Button } from "@/components/ui/Button";

export function MissionActions({
  missionId,
  title,
  archived,
  isPublished,
  attemptCount,
  questionCount,
}: {
  missionId: string;
  title: string;
  archived: boolean;
  isPublished: boolean;
  attemptCount: number;
  questionCount: number;
}) {
  const archiveRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const canDelete = attemptCount === 0;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {archived ? (
        <>
          <form action={restoreMissionAction}>
            <input type="hidden" name="missionId" value={missionId} />
            <Button type="submit" variant="secondary" size="sm">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Pulihkan
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[#7d2418] hover:bg-coral-soft"
            onClick={() => deleteRef.current?.showModal()}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Hapus
          </Button>
        </>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => archiveRef.current?.showModal()}>
          <Archive className="size-3.5" aria-hidden="true" />
          Arsipkan
        </Button>
      )}

      <dialog
        ref={archiveRef}
        className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-line bg-surface p-0 backdrop:bg-ink/50"
        aria-labelledby={`arsip-misi-${missionId}`}
      >
        <form action={archiveMissionAction} className="space-y-3 p-5 sm:p-6">
          <input type="hidden" name="missionId" value={missionId} />
          <h3 id={`arsip-misi-${missionId}`} className="text-lg font-black">
            Arsipkan &ldquo;{title}&rdquo;?
          </h3>
          <p className="text-sm text-muted">
            Misi ini berisi {questionCount} soal. Setelah diarsipkan, misi tidak tampil lagi di daftar belajar siswa
            dan tidak lagi muncul otomatis pada kelas yang cocok.
            {isPublished ? " Status terbitnya dicabut otomatis." : ""}
          </p>
          <p className="text-sm text-muted">
            {attemptCount > 0
              ? `Riwayat pengerjaan ${attemptCount} percobaan siswa tetap tersimpan dan bisa dibuka di laporan.`
              : "Belum ada siswa yang mengerjakan misi ini."}
          </p>
          <p className="text-sm text-muted">Kamu dapat memulihkan misi ini kapan saja dari tab Arsip.</p>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => archiveRef.current?.close()}>
              Batal
            </Button>
            <Button type="submit">Ya, arsipkan</Button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={deleteRef}
        className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-line bg-surface p-0 backdrop:bg-ink/50"
        aria-labelledby={`hapus-misi-${missionId}`}
      >
        <form action={deleteMissionAction} className="space-y-3 p-5 sm:p-6">
          <input type="hidden" name="missionId" value={missionId} />
          <h3 id={`hapus-misi-${missionId}`} className="text-lg font-black">
            Hapus permanen &ldquo;{title}&rdquo;?
          </h3>
          {canDelete ? (
            <p className="text-sm text-muted">
              Misi ini tidak punya riwayat pengerjaan siswa. Menghapusnya juga
              menghapus {questionCount} soal di dalamnya. Tindakan ini tidak dapat dibatalkan.
            </p>
          ) : (
            <p className="rounded-2xl bg-sun-soft px-3 py-2 text-sm text-[#7a4a00]">
              Misi ini tidak bisa dihapus permanen karena masih punya {attemptCount} riwayat pengerjaan. Biarkan
              diarsipkan agar riwayat belajar siswa tidak hilang.
            </p>
          )}
          <p className="text-sm text-muted">
            Akun siswa, kelas belajar, dan progres belajar mandiri tidak ikut terhapus.
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => deleteRef.current?.close()}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={!canDelete}
              title={canDelete ? undefined : "Misi dengan riwayat pengerjaan hanya boleh diarsipkan"}
            >
              Hapus permanen
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
