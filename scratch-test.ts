import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("UserChallenges")
    .select(`
      *,
      challenge:Challenges (id, name, points_reward, org_id),
      user:User (id, full_name, user_name, email)
    `)
    .eq("status", "PendingReview")
    .order("completed_at", { ascending: false });

  console.log("Error:", error);
  console.log("Data:", data);
}

main();
