import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("data",data)
    const { ticket_id, subject, latest_comment, ticket_description, ticket_requester_details } = data;

    // 1️⃣ Validate input
    if (!ticket_id ) {
      return NextResponse.json(
        { error: "Missing required fields: ticket_id" },
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
You are a smart classifier for Zendesk support tickets. Based on the overall meaning and context of the ticket — including the subject, comment, description, and requester details  — classify it into exactly one of the following topics:

Shipping, Returns, Billing, Other, Velcro Recall, Backorder.

Instructions:
- Use your understanding of the full context, not just keywords.
- If the ticket is clearly about Velcro issues or product recalls, return: Velcro Recall.
- If it discusses inventory issues, delays due to restocking, or mentions being out of stock, return: Backorder.
- If it clearly relates to product shipping, returns, or billing — classify accordingly.
- If none of the above apply, or the issue is unrelated or unclear, return: Other.

Return ONLY one of these: Shipping, Return, Billing, Other, Velcro Recall, Backorder.
Do not explain your choice. Only return the topic name.
`

        },
        { role: "user", content: `${subject}\n\n${latest_comment}\n\n${ticket_description}\n\n${ticket_requester_details}` },
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
    let tag = topic.toLowerCase();                      
    tag = topic.replace(" ","_")                      

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
