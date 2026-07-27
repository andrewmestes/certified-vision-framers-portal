import { NextRequest, NextResponse } from "next/server";
import { verifyGHLWebhook, getGHLContact, syncGHLContact } from "@/lib/ghl";
import { ApiResponse } from "@/types";

/**
 * POST /api/webhooks/ghl
 * Receives webhook from GoHighLevel when a contact is tagged as "Certified Vision Framer"
 */
export async function POST(req: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = req.headers.get("x-ghl-signature") || "";

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature
    if (!verifyGHLWebhook(body, signature)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);

    // Check if this is a tag update webhook
    if (payload.type !== "contact.update") {
      return NextResponse.json<ApiResponse>(
        { success: true, message: "Event not processed" },
        { status: 200 }
      );
    }

    const fieldId = process.env.GHL_CUSTOM_FIELD_ID;
    if (!fieldId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "GHL_CUSTOM_FIELD_ID not configured" },
        { status: 500 }
      );
    }

    // Check if the custom field indicates certification
    const isCertified = payload.customField?.[fieldId] === true;

    if (!isCertified) {
      return NextResponse.json<ApiResponse>(
        { success: true, message: "Contact not certified" },
        { status: 200 }
      );
    }

    // Get full contact info from GHL
    const contact = await getGHLContact(payload.contactId);

    // Sync to portal
    await syncGHLContact({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: "Contact synced successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GHL webhook error:", error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/ghl
 * Health check for webhook setup
 */
export async function GET() {
  return NextResponse.json({
    status: "webhook endpoint active",
    endpoint: "/api/webhooks/ghl",
  });
}
