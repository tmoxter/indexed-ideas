import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractBearerToken, authenticateUser } from "@/server/logic/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, error: authError } = await authenticateUser(
      token,
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await adminSupabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[user-settings] Error fetching settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Return default values if no settings exist yet
    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          similarity_threshold: 2,
          region_scope: "region",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[user-settings] Error during settings fetch:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, error: authError } = await authenticateUser(
      token,
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { similarity_threshold, region_scope } = body;

    if (
      similarity_threshold === undefined ||
      ![1, 2, 3, 4].includes(similarity_threshold)
    ) {
      return NextResponse.json(
        { error: "Invalid similarity_threshold. Must be 1, 2, 3, or 4." },
        { status: 400 }
      );
    }

    if (
      !region_scope ||
      !["city", "country", "region", "worldwide"].includes(region_scope)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid region_scope. Must be 'city', 'country', 'region', or 'worldwide'.",
        },
        { status: 400 }
      );
    }

    console.log(`[user-settings] Updating settings for user ID: ${user.id}`, {
      similarity_threshold,
      region_scope,
    });

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await adminSupabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          similarity_threshold,
          region_scope,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[user-settings] Error upserting settings:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      data,
    });
  } catch (error) {
    console.error("[user-settings] Error during settings update:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
