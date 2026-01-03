import { supabaseClient } from "@/lib/supabase";

export type LogLevel = "info" | "error";

export async function logClientMessage(
  message: string,
  logLevel: LogLevel = "error",
  entryUuid?: string
): Promise<string | null> {
  try {
    const supabase = supabaseClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return null;
    }

    const { data, error } = await supabase
      .from("logging")
      .insert({
        user_id: session.user.id,
        message,
        log_level: logLevel,
        ...(entryUuid && { entry_uuid: entryUuid }),
      })
      .select("id")
      .single();

    return data?.id || null;
  } catch (err) {
    return null;
  }
}
