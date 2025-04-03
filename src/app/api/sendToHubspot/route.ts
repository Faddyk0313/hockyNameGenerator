import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { firstName, lastName, email } = await req.json();

  try {
    const hubspotRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        properties: {
          firstname: firstName,
          lastname: lastName,
          email: email,
          lead_source_detail: "Hockey Name Generator",
        },
      }),
    });

    if (!hubspotRes.ok) {
      const errorData = await hubspotRes.json();
      console.error("HubSpot Error:", errorData);
      return NextResponse.json({ success: false, error: errorData }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
