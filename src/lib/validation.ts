import { z } from "zod";

export const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().min(1),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        notes: z.string().max(300).optional(),
        selectedChoices: z
          .array(
            z.object({
              groupId: z.string().min(1),
              choiceId: z.string().min(1),
            })
          )
          .max(50),
      })
    )
    .min(1)
    .max(50),
});

export const waiterCallSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().min(1),
  reason: z.string().max(100).optional(),
});

export const billRequestSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().min(1),
  paymentPreference: z.enum(["cash", "card", "pix", "none"]).optional(),
});

export const feedbackSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().optional(),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const productInputSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  priceCents: z.number().int().min(0).max(100_000_00),
  imageUrl: z.string().max(6_000_000).nullable().default(null),
  isAvailable: z.boolean().default(true),
  isChefRecommendation: z.boolean().default(false),
  prepTimeMinutes: z.number().int().min(1).max(180).default(15),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export const categoryNameSchema = z.object({
  name: z.string().min(1).max(60),
});

export const categoryReorderSchema = z.object({
  categoryId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});
