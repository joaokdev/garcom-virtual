"use client";

import { motion } from "framer-motion";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import type { Restaurant } from "@/types";

export function MenuHero({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div
      className="relative overflow-hidden px-5 pb-7 pt-7 sm:px-6"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--brand) 9%, var(--color-stone)) 0%, var(--color-stone) 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <RestaurantMark name={restaurant.name} logoIcon={restaurant.logoIcon} size="lg" className="shadow-[var(--shadow-card)]" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 font-display text-[1.8rem] font-bold leading-[1.1] text-ink sm:text-3xl"
      >
        {restaurant.name}
      </motion.h1>
      {restaurant.tagline && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-ink-soft"
        >
          {restaurant.tagline}
        </motion.p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left" }}
        className="mt-5 h-[3px] w-10 rounded-full bg-brand"
      />
    </div>
  );
}
