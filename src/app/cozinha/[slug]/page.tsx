import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { validateSession } from "@/lib/db/repositories/auth";
import { PinLogin } from "@/components/kitchen/PinLogin";
import { KitchenApp } from "./KitchenApp";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  return { title: restaurant ? `Cozinha — ${restaurant.name}` : "Cozinha — Quizio" };
}

export default async function KitchenPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const cookieStore = await cookies();
  const session = cookieStore.get(`comanda-kitchen-${restaurant.id}`);
  const authenticated = session?.value ? await validateSession(session.value, restaurant.id, "kitchen") : false;

  if (!authenticated) {
    return <PinLogin slug={slug} type="kitchen" restaurantName={restaurant.name} />;
  }

  return <KitchenApp slug={slug} restaurantName={restaurant.name} logoIcon={restaurant.logoIcon} />;
}
