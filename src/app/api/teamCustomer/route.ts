// app/api/teamCustomer/route.ts
import { NextResponse } from "next/server";

const SHOP    = process.env.SHOP!;
const TOKEN   = process.env.ADMIN_TOKEN!;
const API_VER = "2023-10";

async function findCustomerByEmail(email: string): Promise<number | null> {
  const res = await fetch(
    `https://${SHOP}/admin/api/${API_VER}/customers/search.json?query=email:${encodeURIComponent(
      email
    )}`,
    {
      headers: { "X-Shopify-Access-Token": TOKEN },
    }
  );
  if (!res.ok) return null;
  const body = await res.json();
  if (Array.isArray(body.customers) && body.customers.length > 0) {
    return body.customers[0].id;
  }
  return null;
}

async function updateCustomerTags(id: number, newTag: string) {
  // 1) fetch existing customer to get its current tags
  const getRes = await fetch(
    `https://${SHOP}/admin/api/${API_VER}/customers/${id}.json`,
    { headers: { "X-Shopify-Access-Token": TOKEN } }
  );
  if (!getRes.ok) throw new Error("Failed to fetch existing customer");
  const { customer } = await getRes.json();

  // 2) build deduped tags array
  const existingTags: string[] = customer.tags
    .split(",")
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0);

  if (!existingTags.includes(newTag)) {
    existingTags.push(newTag);
    // 3) push update back to Shopify
    await fetch(
      `https://${SHOP}/admin/api/${API_VER}/customers/${id}.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": TOKEN,
        },
        body: JSON.stringify({
          customer: { id, tags: existingTags.join(",") },
        }),
      }
    );
  }
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const email = formData.get("email");
  const team  = formData.get("team");

  // 1) Validate
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json(
      { success: false, message: { errors: { email: ["is required"] } } },
      { status: 400 }
    );
  }
  if (typeof team !== "string" || !team.trim()) {
    return NextResponse.json(
      { success: false, message: { errors: { team: ["is required"] } } },
      { status: 400 }
    );
  }

  const cleanEmail = email.trim();
  const cleanTag   = `team-${team.trim()}`;

  try {
    // 2) See if customer already exists
    const existingId = await findCustomerByEmail(cleanEmail);

    if (existingId) {
      // 3a) just update their tags
      await updateCustomerTags(existingId, cleanTag);
    } else {
      // 3b) create a brand-new customer
      const createRes = await fetch(
        `https://${SHOP}/admin/api/${API_VER}/customers.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": TOKEN,
          },
          body: JSON.stringify({
            customer: {
              email: cleanEmail,
              tags: [cleanTag],
            },
          }),
        }
      );
      if (!createRes.ok) {
        const err = await createRes.json();
        console.error("Shopify create error:", err);
        return NextResponse.json({ success: false, message: err }, { status: 502 });
      }
    }

    return NextResponse.json(
      { success: true, message: "You’ve been tagged to your team! ✅" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Internal Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
