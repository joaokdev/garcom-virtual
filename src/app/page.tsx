import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "superadmin") redirect("/admin/dashboard");
  redirect(`/r/${user.restaurantId}`);
}
