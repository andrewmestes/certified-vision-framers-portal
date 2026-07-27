import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Resource, ApiResponse } from "@/types";

// GET all resources (public - only published)
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json<ApiResponse<Resource[]>>({
      success: true,
      data: data || [],
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch resources",
      },
      { status: 500 }
    );
  }
}

// POST new resource (admin only)
export async function POST(req: NextRequest) {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: framer } = await supabaseAdmin
      .from("certified_framers")
      .select("is_admin")
      .eq("email", user.email)
      .single();

    if (!framer?.is_admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { title, description, category, file_url, file_type, google_drive_id } = body;

    if (!title || !category || !file_url || !file_type) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create resource
    const { data, error } = await supabaseAdmin
      .from("resources")
      .insert({
        title,
        description,
        category,
        file_url,
        file_type,
        google_drive_id,
        created_by: framer.id || user.id,
      })
      .select();

    if (error) throw error;

    return NextResponse.json<ApiResponse<Resource>>(
      {
        success: true,
        data: data?.[0],
        message: "Resource created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create resource",
      },
      { status: 500 }
    );
  }
}
