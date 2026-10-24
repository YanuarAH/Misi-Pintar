import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { StudentHeader } from "@/components/layout/StudentHeader";

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: Promise<unknown>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  if (session.role !== "student") redirect("/guru/dashboard");

  const totals = await one<{ xp: string }>(
    { userId: session.id, role: "student" },
    "select coalesce(sum(xp_earned),0)::text as xp from attempts where student_id = $1 and completed_at is not null",
    [session.id],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <StudentHeader
        displayName={session.displayName}
        avatarKey={session.avatarKey}
        xp={Number(totals?.xp ?? 0)}
      />
      <main id="konten" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-5 sm:py-8">
        {children}
      </main>
    </div>
  );
}
