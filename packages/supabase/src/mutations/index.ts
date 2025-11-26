import { nanoid } from "nanoid";
import type { Client } from "../types";
import { remove } from "../utils/storage";

type UpdateTeamPlanData = {
  id: string;
  plan?: "trial" | "starter" | "pro";
  email?: string | null;
  canceled_at?: string | null;
  subscription_status?:
    | "active"
    | "canceled"
    | "past_due"
    | "unpaid"
    | "trialing"
    | "incomplete"
    | "incomplete_expired"
    | null;
};

export async function updateTeamPlan(
  supabase: Client,
  data: UpdateTeamPlanData,
) {
  const { id, ...rest } = data;

  return supabase
    .from("teams")
    .update(rest)
    .eq("id", id)
    .select("users_on_team(user_id)")
    .single();
}

type DeleteBankConnectionParams = {
  id: string;
};

export async function deleteBankConnection(
  supabase: Client,
  params: DeleteBankConnectionParams,
) {
  return supabase
    .from("bank_connections")
    .delete()
    .eq("id", params.id)
    .select("reference_id, provider, access_token")
    .single();
}
