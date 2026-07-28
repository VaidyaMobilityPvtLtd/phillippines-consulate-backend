import { z } from "zod";

export const newsCategorySchema = z.enum(["Announcement", "Advisory", "Notice"]);

export const createNewsSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  category: newsCategorySchema,
  summary: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  published: z.boolean().optional().default(true),
});

export const updateNewsSchema = createNewsSchema.partial();

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;
