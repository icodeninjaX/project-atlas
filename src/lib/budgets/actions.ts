"use server";

import { revalidatePath } from "next/cache";
import { pesoInputToCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";
import { monthlyBudgetSchema } from "@/lib/validation/schemas";

export type BudgetActionState = { success: boolean; message: string };

export async function saveBudgetAction(
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  try {
    const items = [...formData.entries()]
      .filter(([key, value]) => key.startsWith("item:") && String(value).trim())
      .map(([key, value]) => ({
        categoryId: key.slice(5),
        plannedCentavos: pesoInputToCentavos(String(value)),
      }));
    const result = monthlyBudgetSchema.safeParse({
      monthStart: formData.get("monthStart"),
      expectedIncomeCentavos: pesoInputToCentavos(
        String(formData.get("expectedIncome") || "0"),
      ),
      notes: formData.get("notes"),
      items,
    });
    if (!result.success)
      return {
        success: false,
        message: result.error.issues[0]?.message ?? "Check the budget.",
      };
    const { error } = await supabase.rpc("save_monthly_budget", {
      p_month_start: result.data.monthStart,
      p_expected_income_centavos: result.data.expectedIncomeCentavos,
      p_notes: result.data.notes ?? null,
      p_items: result.data.items.map((item) => ({
        category_id: item.categoryId,
        planned_centavos: item.plannedCentavos,
      })),
    });
    if (error)
      return { success: false, message: "The budget could not be saved." };
  } catch {
    return { success: false, message: "Enter valid peso amounts." };
  }
  revalidatePath("/money/budget");
  revalidatePath("/money/runway");
  revalidatePath("/dashboard");
  return { success: true, message: "Monthly budget saved." };
}
