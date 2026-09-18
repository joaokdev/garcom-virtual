import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { getCurrentUser } from "@/lib/user-auth";
import { WaiterApp } from "@/components/waiter/WaiterApp";
import { WaiterLoginPage } from "@/components/waiter/WaiterLoginPage";

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  return { title: r ? `Garçom — ${r.name}` : "Garçom — Quizio" };
}

export default async function WaiterPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const user = await getCurrentUser();

  // Verifica se o usuário logado é um garçom deste restaurante
  const hasRole =
    !!user &&
    (user.role === "superadmin" ||
      (user.role === "waiter" && user.restaurantId === restaurant.id) ||
      (user.role === "manager" && user.restaurantId === restaurant.id));

  if (!user || !hasRole) {
    return (
      <WaiterLoginPage
        restaurantName={restaurant.name}
        restaurantSlug={slug}
        primaryColor={restaurant.primaryColor}
        logoIcon={restaurant.logoIcon}
      />
    );
  }

  return (
    <WaiterApp
      slug={slug}
      restaurantName={restaurant.name}
      logoIcon={restaurant.logoIcon}
      currentUser={{ role: user.role, displayName: user.displayName }}
    />
  );
}
