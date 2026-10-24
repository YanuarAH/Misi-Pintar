"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/guru/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/guru/misi", label: "Misi & soal", icon: BookOpen },
  { href: "/guru/kelas", label: "Kelas & siswa", icon: Users },
];

export function TeacherNav({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi guru"
      className={cn(
        orientation === "vertical" ? "space-y-1" : "flex items-stretch border-t border-line",
      )}
    >
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              orientation === "vertical"
                ? "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold"
                : "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
              active ? "bg-primary-soft text-primary-strong" : "text-muted hover:bg-paper hover:text-ink",
            )}
          >
            <link.icon className="size-4.5" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
