import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-auth";
import { getRestaurantById, listTablesForRestaurant } from "@/lib/db/repositories/restaurants";
import { listRestaurantWaiterCommissions } from "@/lib/db/repositories/commission";
import { RestaurantHubClient } from "@/components/hub/RestaurantHubClient";
interface PageProps {
  params: Promise<{ restaurantId: string }>;
}

export default async function RestaurantHubPage({ params }: PageProps) {
  const { restaurantId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Superadmin pode ver qualquer restaurante; manager/waiter só o seu
  if (
    currentUser.role !== "superadmin" &&
    currentUser.restaurantId !== restaurantId
  ) {
    redirect("/login");
  }

  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) notFound();

  // Garçom tem uma experiência própria e não deve ver o hub administrativo
  // (gestão de funcionários, módulos de admin/financeiro etc.).
  if (currentUser.role === "waiter") {
    redirect(`/garcom/${restaurant.slug}`);
  }

  const tables = await listTablesForRestaurant(restaurantId);
  const waiters = await listRestaurantWaiterCommissions(restaurantId);

  return (
    <RestaurantHubClient
      restaurant={restaurant}
      tables={tables}
      waiters={waiters}
      currentUser={{ id: currentUser.id, role: currentUser.role, displayName: currentUser.displayName }}
    />
  );
}
