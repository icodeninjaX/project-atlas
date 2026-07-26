import { z } from "zod";

const publicSupabaseSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(1),
});

export function getPublicSupabaseConfig() {
  const result = publicSupabaseSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return result.success ? result.data : null;
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  try {
    return new URL(configured ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}
