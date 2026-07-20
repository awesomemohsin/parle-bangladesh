import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CircleCampaignSetting } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const campaignSetting = await CircleCampaignSetting.findOne({ key: 'circle_campaign' }).lean();
    if (campaignSetting && campaignSetting.isActive === false) {
      return NextResponse.json({ error: "Circle Network campaign is currently inactive." }, { status: 400 });
    }

    const body = await request.json();
    const { billingId, contactNumber } = body;

    if (!billingId || !contactNumber) {
      return NextResponse.json({ error: "Billing ID and Contact Number are required." }, { status: 400 });
    }

    const cleanPhone = contactNumber.trim();

    // Call Circle Network API
    const res = await fetch("https://billing.circlenetworkbd.net/api/client-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        CLIENT_SEARCH_SECRET: process.env.CLIENT_SEARCH_SECRET || "t2YMzy1oFnlX1jZkPEoRj74p6M8SszbIY",
        search_by: cleanPhone
      })
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: "No client found with this contact number." }, { status: 404 });
      }
      return NextResponse.json({ error: "Billing server error. Please try again later." }, { status: 500 });
    }

    const data = await res.json();
    if (!data || !data.data) {
      return NextResponse.json({ error: "No client found." }, { status: 404 });
    }

    const client = data.data;

    // Check if ID or Username matches
    const inputIdClean = billingId.trim().toLowerCase();
    const clientUsernameClean = (client.username || "").trim().toLowerCase();
    const clientIdClean = (client.id || "").toString().trim().toLowerCase();

    if (inputIdClean !== clientUsernameClean && inputIdClean !== clientIdClean) {
      return NextResponse.json({ error: "Customer ID does not match the record for this number." }, { status: 400 });
    }

    // Check user_status is active
    if (client.user_status !== 'active') {
      return NextResponse.json({ error: "This user is not active on Circle Network." }, { status: 400 });
    }

    // Success - return verified client details
    return NextResponse.json({
      success: true,
      client: {
        id: (client.id !== undefined && client.id !== null) ? String(client.id) : (client.username || billingId),
        username: client.username,
        contact_number: client.contact_number || cleanPhone,
        package_name: client.package_name
      }
    });

  } catch (error: any) {
    console.error("verify-circle-user API error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
