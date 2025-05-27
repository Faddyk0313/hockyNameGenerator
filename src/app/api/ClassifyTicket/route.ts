import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("data",data)
    const { ticket_id, subject, latest_comment } = data;

    // 1️⃣ Validate input
    if (!ticket_id || !subject || !latest_comment) {
      return NextResponse.json(
        { error: "Missing required fields: ticket_id, subject, latest_comment" },
        { status: 400 }
      );
    }

    // 2️⃣ Call OpenAI to classify
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      store: true,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are a classifier.  Return exactly one word: Shipping, Return, Billing, Product, Other.
          `,
        },
        { role: "user", content: `${subject}\n\n${latest_comment}` },
      ],
    });

    const content = completion.choices[0].message.content;

    if (!content) {
  return NextResponse.json(
    { error: "No classification returned from OpenAI." },
    { status: 500 }
  );
}

const topic = content.trim();
const tag = topic.toLowerCase();                      // "shipping"

    // 3️⃣ Prepare Zendesk creds & URL
    const subdomain     = process.env.ZENDESK_SUBDOMAIN!;
    const email         = process.env.ZENDESK_EMAIL!;
    const token         = process.env.ZENDESK_API_TOKEN!;
    const topicFieldId  = Number(process.env.ZD_TOPIC_FIELD_ID!); // from your dropdown field

    const zendeskUrl = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticket_id}.json`;
    const authHeader = Buffer
      .from(`${email}/token:${token}`)
      .toString("base64");

    // 4️⃣ Update the ticket in Zendesk
    const updateRes = await fetch(zendeskUrl, {
      method: "PUT",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        ticket: {
          tags: [tag],
          custom_fields: [
            { id: topicFieldId, value: tag }
          ],
        },
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Zendesk update failed:", errText);
      return NextResponse.json(
        { error: "Zendesk update failed", details: errText },
        { status: 500 }
      );
    }

    // 5️⃣ Success!
    return NextResponse.json(
      { success: true, topic, tag },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error in classify-ticket:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
