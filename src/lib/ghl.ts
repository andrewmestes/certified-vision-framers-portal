import axios from "axios";
import { supabaseAdmin } from "./supabase";

const GHL_API_URL = "https://services.leadconnectorhq.com/oauth/authorize";
const GHL_REST_API = "https://rest.gohighlevel.com/v1";

interface GHLContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  customFields?: Record<string, string>;
}

interface GHLWebhookPayload {
  type: string;
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
  customField?: Record<string, any>;
}

// Initialize GHL API client
const ghlClient = axios.create({
  baseURL: GHL_REST_API,
  headers: {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Sync a GHL contact to certified framers
 * Called when a contact is tagged as "Certified Vision Framer" in GHL
 */
export async function syncGHLContact(contact: GHLContact) {
  try {
    // Check if already in system
    const { data: existing } = await supabaseAdmin
      .from("certified_framers")
      .select("id")
      .eq("email", contact.email)
      .single();

    if (!existing) {
      // Create new certified framer
      await supabaseAdmin.from("certified_framers").insert({
        email: contact.email,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        ghl_contact_id: contact.id,
      });
    } else {
      // Update existing with GHL contact ID
      await supabaseAdmin
        .from("certified_framers")
        .update({ ghl_contact_id: contact.id })
        .eq("email", contact.email);
    }

    // Log successful sync
    await supabaseAdmin.from("ghl_sync_log").insert({
      ghl_contact_id: contact.id,
      status: "success",
      last_synced_at: new Date().toISOString(),
    });

    return { success: true, message: "Contact synced successfully" };
  } catch (error) {
    console.error("GHL sync error:", error);

    // Log failed sync
    await supabaseAdmin.from("ghl_sync_log").insert({
      ghl_contact_id: contact.id,
      status: "failed",
      last_synced_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

/**
 * Handle incoming GHL webhook
 * Verify signature and process contact update
 */
export function verifyGHLWebhook(
  body: string,
  signature: string
): boolean {
  // Implement HMAC-SHA256 verification
  // This prevents unauthorized webhook calls
  // TODO: Implement actual signature verification
  return signature === process.env.GHL_WEBHOOK_SECRET;
}

/**
 * Get contact from GHL API
 */
export async function getGHLContact(contactId: string): Promise<GHLContact> {
  try {
    const response = await ghlClient.get(`/contacts/${contactId}`);
    return response.data.contact;
  } catch (error) {
    console.error("Error fetching GHL contact:", error);
    throw error;
  }
}

/**
 * Update contact in GHL with portal login info
 * (Optional: notify contact they have portal access)
 */
export async function updateGHLContactWithPortalInfo(
  contactId: string,
  portalUrl: string
) {
  try {
    await ghlClient.put(`/contacts/${contactId}`, {
      customField: {
        [process.env.GHL_CUSTOM_FIELD_ID!]: `Portal Access: ${portalUrl}`,
      },
    });
  } catch (error) {
    console.error("Error updating GHL contact:", error);
    // Don't throw - this is optional
  }
}

/**
 * Search GHL contacts by email
 */
export async function searchGHLContactByEmail(
  email: string
): Promise<GHLContact | null> {
  try {
    const response = await ghlClient.get("/contacts/search", {
      params: { email },
    });
    return response.data.contacts?.[0] || null;
  } catch (error) {
    console.error("Error searching GHL contact:", error);
    return null;
  }
}

/**
 * Manual sync: Look up email in GHL and sync to portal
 * Admin can use this to manually add certified framers from GHL
 */
export async function manualSyncFromGHL(email: string) {
  const contact = await searchGHLContactByEmail(email);
  if (!contact) {
    throw new Error(`Contact not found in GHL for email: ${email}`);
  }
  return syncGHLContact(contact);
}

// TODO: Implement bi-directional sync
// When a new certified framer is added in portal,
// update them in GHL as well
export async function syncPortalToGHL(
  email: string,
  name: string,
  ghlContactId?: string
) {
  try {
    // If no GHL contact ID, search for them first
    let contactId = ghlContactId;
    if (!contactId) {
      const contact = await searchGHLContactByEmail(email);
      if (!contact) {
        console.warn(
          `No GHL contact found for ${email}. Skipping GHL sync.`
        );
        return;
      }
      contactId = contact.id;
    }

    // Update custom field in GHL to indicate certified
    await updateGHLContactWithPortalInfo(
      contactId,
      `${process.env.NEXT_PUBLIC_APP_URL}/resources`
    );
  } catch (error) {
    console.error("Error syncing to GHL:", error);
    // Don't throw - portal still works even if GHL sync fails
  }
}
