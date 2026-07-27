import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    // Sign in via Supabase (server-side)
    const { data, error } = await supabaseAdmin.auth.admin.createSession({
      user_id: "",
      session_data: {
        access_token: "",
        refresh_token: "",
      },
    });

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Use standard auth flow instead
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          session: signInData.session,
          user: signInData.user,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      },
      { status: 500 }
    );
  }
}
