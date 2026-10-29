/**
 * Ilustrasi peta petualangan. Dekoratif, jadi disembunyikan dari pembaca layar
 * (informasi tetap tersedia sebagai teks di sekitarnya).
 */
export function HeroMap() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_12px_32px_-20px_rgba(20,48,74,0.35)]">
        <div className="relative aspect-[4/3] w-full">
          <svg viewBox="0 0 400 300" className="absolute inset-0 size-full">
            <rect width="400" height="300" fill="#FFF8EE" />
            <g fill="#E7DFD1" opacity="0.7">
              {Array.from({ length: 8 }).map((_, row) =>
                Array.from({ length: 11 }).map((__, column) => (
                  <circle key={`${row}-${column}`} cx={20 + column * 36} cy={20 + row * 36} r="1.4" />
                )),
              )}
            </g>
            <path
              d="M48 246C92 246 96 196 140 188s52 24 88 4 26-56 58-72 44-14 62-38"
              fill="none"
              stroke="#0F766E"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="12 10"
            />
            <g fill="#F2A93B">
              <path d="M318 44l4.2 8.6 9.5 1.4-6.9 6.7 1.6 9.4-8.4-4.5-8.4 4.5 1.6-9.4-6.9-6.7 9.5-1.4z" />
              <circle cx="356" cy="112" r="3.5" />
              <circle cx="92" cy="120" r="3" />
            </g>
            <g fill="#2E8B57">
              <path d="M120 64c8 0 14 6 14 14 0 10-14 22-14 22s-14-12-14-22c0-8 6-14 14-14z" opacity="0.25" />
            </g>
          </svg>

          <div className="absolute left-[6%] top-[72%] flex -translate-y-1/2 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 shadow-xs">
            <span className="text-lg">🛒</span>
            <span className="text-xs font-black text-ink">Pasar</span>
          </div>
          <div className="absolute left-[38%] top-[56%] flex -translate-y-1/2 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 shadow-xs">
            <span className="text-lg">🧁</span>
            <span className="text-xs font-black text-ink">Dapur</span>
          </div>
          <div className="absolute left-[62%] top-[34%] flex -translate-y-1/2 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 shadow-xs">
            <span className="text-lg">📐</span>
            <span className="text-xs font-black text-ink">Taman</span>
          </div>
          <div className="absolute right-[6%] top-[8%] flex items-center gap-1.5 rounded-xl bg-ink px-3 py-1.5 text-xs font-black text-white shadow-xs">
            🏁 Selesai!
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line bg-paper px-4 py-2.5 text-xs font-bold text-ink">
          <span className="flex items-center gap-1.5 text-primary-strong">
            <span className="inline-block size-2 rounded-full bg-primary" />
            Petualangan Tematik
          </span>
          <span className="flex items-center gap-1.5 text-[#7a4a00]">
            <span className="inline-block size-2 rounded-full bg-sun" />
            +20 XP Tiap Selesai
          </span>
        </div>
      </div>
    </div>
  );
}
