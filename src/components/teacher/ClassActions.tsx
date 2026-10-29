"use client";

import { useRef } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { archiveClassAction, deleteClassAction, restoreClassAction } from "@/app/actions/teacher";
import { Button } from "@/components/ui/Button";
import { gradeLabel } from "@/lib/curriculum";

export function ClassActions({
  classId,
  name,
  gradeLevel,
  studentCount,
  archived,
}: {
  classId: string;
  name: string;
  gradeLevel: number | null;
  studentCount: number;
  archived: boolean;
}) {
  const archiveRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const canDelete = studentCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {archived ? (
        <form action={restoreClassAction}>
          <input type="hidden" name="classId" value={classId} />
          <Button type="submit" variant="secondary" size="sm">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Pulihkan kelas
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => archiveRef.current?.showModal()}
        >
          <Archive className="size-3.5" aria-hidden="true" />
          Arsipkan
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => deleteRef.current?.showModal()}
        className="text-[#7d2418] hover:bg-coral-soft"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Hapus
      </Button>

      <dialog
        ref={archiveRef}
        className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-line bg-surface p-0 backdrop:bg-ink/50"
        aria-labelledby={`arsip-${classId}`}
      >
        <form action={archiveClassAction} className="space-y-3 p-5 sm:p-6">
          <input type="hidden" name="classId" value={classId} />
          <h3 id={`arsip-${classId}`} className="text-lg font-black">
            Arsipkan &ldquo;{name}&rdquo;?
          </h3>
          <p className="text-sm text-muted">
            Kelas ini ({gradeLabel(gradeLevel)}) akan hilang dari daftar kelas aktif dan siswanya tidak bisa lagi
            bergabung dengan kode ini. Anggota yang ada ({studentCount} siswa) tetap tercatat untuk laporan, dan
            riwayat belajar mereka tidak berubah. Misi mata pelajaran kelas ini tidak lagi dibuka melalui
            keanggotaan kelas tersebut.
          </p>
          <p className="text-sm text-muted">
            Kamu dapat memulihkan kelas ini nanti; anggota lama tetap menjadi anggota.
          </p>
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
        aria-labelledby={`hapus-${classId}`}
      >
        <form action={deleteClassAction} className="space-y-3 p-5 sm:p-6">
          <input type="hidden" name="classId" value={classId} />
          <h3 id={`hapus-${classId}`} className="text-lg font-black">
            Hapus permanen &ldquo;{name}&rdquo;?
          </h3>
          {canDelete ? (
            <p className="text-sm text-muted">
              Kelas ini belum punya siswa, jadi aman dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          ) : (
            <p className="rounded-2xl bg-sun-soft px-3 py-2 text-sm text-[#7a4a00]">
              Kelas ini masih punya {studentCount} siswa. Menghapus permanen akan menghilangkan catatan kelas.
              Gunakan <strong>Arsipkan</strong> agar riwayat siswa tetap utuh.
            </p>
          )}
          <p className="text-sm text-muted">
            Akun siswa, progres belajar mandiri, misi, dan bank soal tidak ikut terhapus.
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => deleteRef.current?.close()}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={!canDelete}
              title={canDelete ? undefined : "Arsipkan kelas yang sudah punya siswa"}
            >
              Hapus permanen
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
