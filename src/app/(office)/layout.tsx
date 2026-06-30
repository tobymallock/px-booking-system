import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";

/**
 * Protected layout for office/admin pages. Confirms a Supabase session
 * exists and the corresponding User row has OFFICE or ADMIN role.
 * Instructor-role users are redirected — their view is built in a later
 * phase under a separate route group.
 */
export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const profile = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "OFFICE")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="p-6">{children}</div>
    </div>
  );
}
