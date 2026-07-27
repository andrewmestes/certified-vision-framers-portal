import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create auth account via Supabase (server-side)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Add to certified_framers table
    const { error: dbError } = await supabaseAdmin
      .from("certified_framers")
      .insert({
        email,
        name,
      })
      .select();

    if (dbError && !dbError.message.includes("duplicate")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: dbError.message },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: "Account created. Please sign in.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Signup failed",
      },
      { status: 500 }
    );
  }
}
