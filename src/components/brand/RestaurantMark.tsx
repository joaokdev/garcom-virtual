import { cn } from "@/lib/utils";
import { RESTAURANT_ICONS, type RestaurantIconKey } from "@/components/brand/restaurant-icons";

/**
 * Selo de identidade visual do restaurante. Se o restaurante tiver um
 * ícone de marca cadastrado (logoIcon), renderiza essa silhueta autoral.
 * Caso contrário, recorre ao monograma tipográfico (inicial do nome)
 * — sempre sóbrio, nunca emoji/clipart.
 */
export function RestaurantMark({
  name,
  logoIcon,
  size = "md",
  className,
}: {
  name: string;
  logoIcon?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  const Icon = logoIcon ? RESTAURANT_ICONS[logoIcon as RestaurantIconKey] : undefined;

  const sizeClasses = {
    sm: "h-9 w-9 rounded-[var(--radius-md)]",
    md: "h-12 w-12 rounded-[var(--radius-lg)]",
    lg: "h-16 w-16 rounded-[1.25rem]",
  }[size];

  const iconSizeClasses = {
    sm: "h-[19px] w-[19px]",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  const textSizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  }[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-brand text-brand-foreground",
        sizeClasses,
        !Icon && cn("font-display font-bold", textSizeClasses),
        className
      )}
      aria-hidden="true"
    >
      {Icon ? <Icon className={iconSizeClasses} /> : initial}
    </div>
  );
}
