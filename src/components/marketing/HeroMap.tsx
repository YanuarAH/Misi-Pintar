/**
 * Ilustrasi peta petualangan. Dekoratif, jadi disembunyikan dari pembaca layar
 * (informasi tetap tersedia sebagai teks di sekitarnya).
 */
export function HeroMap() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_18px_40px_-28px_rgba(20,48,74,0.6)]">
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

        <div className="absolute left-[6%] top-[72%] flex -translate-y-1/2 items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm">
          <span className="text-xl">🛒</span>
          <span className="text-xs font-black text-ink">Pasar</span>
        </div>
        <div className="absolute left-[38%] top-[56%] flex -translate-y-1/2 items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm">
          <span className="text-xl">🧁</span>
          <span className="text-xs font-black text-ink">Dapur</span>
        </div>
        <div className="absolute left-[62%] top-[34%] flex -translate-y-1/2 items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm">
          <span className="text-xl">📐</span>
          <span className="text-xs font-black text-ink">Taman</span>
        </div>
        <div className="absolute right-[6%] top-[8%] flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-black text-white shadow-sm">
          🏁 Selesai!
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 rotate-[-4deg] rounded-2xl border border-sun/50 bg-sun-soft px-3.5 py-2 text-xs font-black text-ink shadow-sm">
        + 20 XP setiap misi selesai
      </div>
      <div className="absolute -right-2 top-6 rotate-[5deg] rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs font-black text-primary shadow-sm">
        ⭐ Lencana baru!
      </div>
    </div>
  );
}
