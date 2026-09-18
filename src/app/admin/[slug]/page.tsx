import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { validateSession } from "@/lib/db/repositories/auth";
import { PinLogin } from "@/components/kitchen/PinLogin";
import { AdminApp } from "@/components/admin/AdminApp";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  return { title: restaurant ? `Gestão de Produtos — ${restaurant.name}` : "Gestão de Produtos — Quizio" };
}

export default async function AdminPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const cookieStore = await cookies();
  const session = cookieStore.get(`comanda-admin-${restaurant.id}`);
  const authenticated = session?.value ? await validateSession(session.value, restaurant.id, "admin") : false;

  if (!authenticated) {
    return <PinLogin slug={slug} type="admin" restaurantName={restaurant.name} />;
  }

  return (
    <AdminApp
      slug={slug}
      restaurantName={restaurant.name}
      primaryColor={restaurant.primaryColor}
      accentColor={restaurant.accentColor}
      logoIcon={restaurant.logoIcon}
    />
  );
}
