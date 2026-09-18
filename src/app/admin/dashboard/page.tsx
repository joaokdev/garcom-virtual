import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/user-auth";
import { listActiveRestaurants } from "@/lib/db/repositories/restaurants";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Signature } from "@/components/brand/Signature";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { ChefHat, LayoutGrid, Plus, Store, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect(`/r/${user.restaurantId}`);

  const restaurants = await listActiveRestaurants();

  return (
    <div className="min-h-screen bg-stone">
      <header className="material-thin sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Wordmark iconClassName="h-7 w-7" textClassName="text-xl" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">{user.displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-ink">Restaurantes</h1>
          <Link
            href="/hub"
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:brightness-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Novo restaurante
          </Link>
        </div>

        <div className="space-y-3">
          {restaurants.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]"
              style={{ "--brand": r.primaryColor } as React.CSSProperties}
            >
              <div className="flex items-center gap-4 border-b border-line p-4">
                <RestaurantMark name={r.name} logoIcon={r.logoIcon} size="md" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-ink">{r.name}</h2>
                  {r.tagline && <p className="text-sm text-ink-soft">{r.tagline}</p>}
                  <p className="font-mono text-[11px] text-ink-faint">/{r.slug}</p>
                </div>
                <Link
                  href={`/r/${r.id}`}
                  className="rounded-[var(--radius-md)] border border-line px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-stone active:scale-95"
                >
                  Gerenciar
                </Link>
              </div>

              <div className="grid grid-cols-4 divide-x divide-line">
                {[
                  { label: "Produtos", icon: Store, href: `/admin/${r.slug}` },
                  { label: "Cozinha", icon: ChefHat, href: `/cozinha/${r.slug}` },
                  { label: "Garçom", icon: LayoutGrid, href: `/garcom/${r.slug}` },
                  { label: "Financeiro", icon: Wallet, href: `/financeiro/${r.slug}` },
                ].map(({ label, icon: Icon, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex flex-col items-center gap-1 py-3 text-ink-faint transition hover:bg-stone hover:text-ink"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-semibold">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {restaurants.length === 0 && (
            <div className="rounded-[var(--radius-lg)] bg-paper p-10 text-center shadow-[var(--shadow-card)]">
              <p className="text-sm text-ink-soft">Nenhum restaurante. Clique em &ldquo;Novo restaurante&rdquo; para começar.</p>
            </div>
          )}
        </div>

        <Signature />
      </div>
    </div>
  );
}
