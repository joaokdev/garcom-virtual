"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Header } from "@/components/layout/Header";
import { MenuHero } from "@/components/menu/MenuHero";
import { Signature } from "@/components/brand/Signature";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { SearchBar } from "@/components/menu/SearchBar";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { RecommendedSection } from "@/components/menu/RecommendedSection";
import { ItemDetailSheet } from "@/components/menu/ItemDetailSheet";
import { CartFab } from "@/components/cart/CartFab";
import { CartSheet } from "@/components/cart/CartSheet";
import { OrderConfirmationDialog } from "@/components/order/OrderConfirmationDialog";
import { OrderHistorySheet } from "@/components/order/OrderHistorySheet";
import { WaiterCallDialog } from "@/components/layout/WaiterCallDialog";
import { BillRequestSheet } from "@/components/layout/BillRequestSheet";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { Toaster } from "@/components/ui/Toaster";
import { useToastStore } from "@/store/toast-store";
import { useCartStore, useCartLines } from "@/store/cart-store";
import { computeCartItemCount, computeCartSubtotalCents } from "@/lib/cart";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getReadableForeground } from "@/lib/utils";
import {
  callWaiter,
  fetchRecommendations,
  requestBill,
  submitOrder,
} from "@/lib/api-client";
import { CustomerGate } from "@/components/CustomerGate";
import {
  getTableSession,
  clearTableSession,
  type TableSession,
} from "@/lib/table-session";
import type { CartLine, MenuCategoryWithItems, MenuItem, OrderRecord, Restaurant, RestaurantTableInfo } from "@/types";

export function CustomerApp({
  restaurant,
  table,
  initialMenu,
}: {
  restaurant: Restaurant;
  table: RestaurantTableInfo;
  initialMenu: MenuCategoryWithItems[];
}) {
  const { t, text } = useTranslation();
  const pushToast = useToastStore((s) => s.push);

  // Sessão do cliente atual nesta mesa.
  // null = nenhum cliente identificado → exibe o gate de entrada.
  const [session, setSession] = useState<TableSession | null>(() => {
    if (typeof window === "undefined") return null;
    return getTableSession(restaurant.id, table.id);
  });

  // O contextKey do carrinho usa o sessionId — não mais restaurantId:tableId.
  // Isso garante que cada cliente tem um carrinho completamente isolado.
  const contextKey = session?.sessionId ?? `${restaurant.id}:${table.id}:empty`;
  const cartLines = useCartLines(contextKey);
  const { addLine, updateQuantity, removeLine, clearContext } = useCartStore();

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [waiterDialogOpen, setWaiterDialogOpen] = useState(false);
  const [waiterLoading, setWaiterLoading] = useState(false);
  const [waiterPending, setWaiterPending] = useState(false);
  const [billSheetOpen, setBillSheetOpen] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [billPending, setBillPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(initialMenu[0]?.id ?? null);
  const [confirmation, setConfirmation] = useState<{ order: OrderRecord; estimatedMinutes: number } | null>(null);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetchRecommendations(restaurant.id)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [restaurant.id]);

  // Realça a categoria visível enquanto o cliente rola o cardápio.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveCategoryId(visible[0]!.target.getAttribute("data-category-id"));
        }
      },
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [initialMenu]);

  const brandStyle = useMemo<CSSProperties>(
    () => ({
      "--brand": restaurant.primaryColor,
      "--brand-foreground": getReadableForeground(restaurant.primaryColor),
      "--accent": restaurant.accentColor,
      "--accent-foreground": getReadableForeground(restaurant.accentColor),
    } as CSSProperties),
    [restaurant.primaryColor, restaurant.accentColor]
  );

  const filteredMenu = useMemo(() => {
    if (!searchQuery.trim()) return initialMenu;
    const query = searchQuery.trim().toLowerCase();
    return initialMenu
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            text(item.name).toLowerCase().includes(query) ||
            text(item.description).toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [initialMenu, searchQuery, text]);

  function scrollToCategory(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddToCart(line: Omit<CartLine, "cartLineId">) {
    addLine(contextKey, line);
    pushToast(t("cart.itemAdded", { name: line.name }), "success");
  }

  async function handleSubmitOrder(notes: string) {
    try {
      const estimatedMinutes = Math.max(...cartLines.map((l) => l.prepTimeMinutes), 10);
      const order = await submitOrder({ restaurantId: restaurant.id, tableId: table.id, notes, lines: cartLines });
      clearContext(contextKey);
      setCartOpen(false);
      setConfirmation({ order, estimatedMinutes });
    } catch {
      pushToast(t("errors.genericError"), "error");
    }
  }

  async function handleConfirmWaiterCall() {
    setWaiterLoading(true);
    try {
      const { alreadyExisted } = await callWaiter(restaurant.id, table.id);
      pushToast(t(alreadyExisted ? "waiterCall.alreadyCalled" : "waiterCall.sent"), "success");
      setWaiterPending(true);
      setWaiterDialogOpen(false);
    } catch {
      pushToast(t("errors.genericError"), "error");
    } finally {
      setWaiterLoading(false);
    }
  }

  async function handleConfirmBillRequest(preference: "cash" | "card" | "pix" | "none") {
    setBillLoading(true);
    try {
      const { alreadyExisted } = await requestBill(
        restaurant.id,
        table.id,
        preference === "none" ? undefined : preference
      );
      pushToast(t(alreadyExisted ? "billRequest.alreadyRequested" : "billRequest.sent"), "success");
      setBillPending(true);
      setBillSheetOpen(false);
      if (!alreadyExisted) {
        // Encerra a sessão após fechar a conta
        setTimeout(() => handleEndSession(), 800);
      }
    } catch {
      pushToast(t("errors.genericError"), "error");
    } finally {
      setBillLoading(false);
    }
  }

  function handleEndSession() {
    // Limpa a sessão da mesa — próximo cliente começa do zero.
    clearTableSession(restaurant.id, table.id);
    clearContext(contextKey);
    setSession(null);
    setBillPending(false);
    setWaiterPending(false);
  }




  // Gate de sessão — exibido enquanto nenhum cliente estiver identificado nesta mesa
  if (!session) {
    return (
      <CustomerGate
        restaurant={restaurant}
        table={table}
        onEnter={(newSession) => setSession(newSession)}
      />
    );
  }

  return (
    <div style={brandStyle} className="ambient-light min-h-screen bg-stone pb-32">
      <Toaster />

      <Header
        restaurant={restaurant}
        table={table}
        session={session}
        waiterCallPending={waiterPending}
        billRequestPending={billPending}
        onCallWaiter={() => setWaiterDialogOpen(true)}
        onRequestBill={() => setBillSheetOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <MenuHero restaurant={restaurant} />

      <div className="space-y-5 pt-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {!searchQuery && <RecommendedSection items={recommendations} onSelect={setSelectedItem} />}

        <div className="material-thin sticky top-[72px] z-20">
          <CategoryNav
            categories={filteredMenu}
            activeId={activeCategoryId}
            onSelect={scrollToCategory}
          />
        </div>

        {/* Em tablet paisagem / desktop as linhas do cardápio esticavam sem
            limite, deixando nome à esquerda e preço a meio metro de distância.
            Duas colunas a partir de lg mantêm a densidade legível e aproveitam
            a largura sem virar "desktop encolhido" (§36). */}
        <div className="mx-auto max-w-3xl space-y-9 px-5 pb-4 sm:px-6 lg:max-w-6xl">
          {filteredMenu.length === 0 && (
            <p className="py-16 text-center text-sm text-ink-soft">
              {t("menu.noResults", { query: searchQuery })}
            </p>
          )}

          {filteredMenu.map((category) => (
            <section
              key={category.id}
              ref={(el) => { sectionRefs.current[category.id] = el; }}
              data-category-id={category.id}
              className="scroll-mt-36"
            >
              <div className="flex items-baseline justify-between border-b border-line pb-2.5">
                <h2 className="font-display text-[1.4rem] font-bold text-ink">{text(category.name)}</h2>
                <span className="font-mono text-xs font-semibold text-ink-faint">
                  {category.items.length}
                </span>
              </div>
              <div className="divide-y divide-line/70 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
                {category.items.map((item) => (
                  <div key={item.id} className="lg:border-b lg:border-line/70">
                    <MenuItemCard item={item} onSelect={setSelectedItem} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="pb-6 pt-2">
          <Signature />
        </div>
      </div>

      <CartFab
        itemCount={computeCartItemCount(cartLines)}
        subtotalCents={computeCartSubtotalCents(cartLines)}
        onClick={() => setCartOpen(true)}
      />

      <ItemDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={handleAddToCart} />

      <CartSheet
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cartLines}
        serviceFeePct={restaurant.serviceFeePct}
        onUpdateQuantity={(id, qty) => updateQuantity(contextKey, id, qty)}
        onRemove={(id) => removeLine(contextKey, id)}
        onSubmit={handleSubmitOrder}
      />

      <OrderConfirmationDialog
        order={confirmation?.order ?? null}
        estimatedMinutes={confirmation?.estimatedMinutes ?? 15}
        onClose={() => setConfirmation(null)}
        onTrack={() => {
          setConfirmation(null);
          setHistoryOpen(true);
        }}
      />

      <OrderHistorySheet isOpen={historyOpen} onClose={() => setHistoryOpen(false)} restaurantId={restaurant.id} tableId={table.id} />

      <WaiterCallDialog
        isOpen={waiterDialogOpen}
        onClose={() => setWaiterDialogOpen(false)}
        onConfirm={handleConfirmWaiterCall}
        loading={waiterLoading}
      />

      <BillRequestSheet
        isOpen={billSheetOpen}
        onClose={() => setBillSheetOpen(false)}
        onConfirm={handleConfirmBillRequest}
        loading={billLoading}
      />

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
