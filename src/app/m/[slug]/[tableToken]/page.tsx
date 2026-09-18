import type { Metadata } from "next";
import { getRestaurantBySlug, getTableByToken } from "@/lib/db/repositories/restaurants";
import { getMenuForRestaurant } from "@/lib/db/repositories/menu";
import { CustomerApp } from "@/components/CustomerApp";
import { InvalidTableScreen } from "@/components/layout/InvalidTableScreen";
import { translate } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ slug: string; tableToken: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  return {
    title: restaurant ? `${restaurant.name} — Cardápio digital` : "Quizio — Cardápio digital",
  };
}

export default async function TableMenuPage({ params }: PageProps) {
  const { slug, tableToken } = await params;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return <InvalidTableScreen message={translate("pt-BR", "errors.restaurantNotFound")} />;
  }

  const table = await getTableByToken(restaurant.id, tableToken);
  if (!table) {
    return <InvalidTableScreen message={translate("pt-BR", "errors.invalidTable")} />;
  }

  const menu = await getMenuForRestaurant(restaurant.id);

  return <CustomerApp restaurant={restaurant} table={table} initialMenu={menu} />;
}
