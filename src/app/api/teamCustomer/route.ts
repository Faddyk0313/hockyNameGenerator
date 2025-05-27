import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const email = formData.get("email");

  // 1. Validate
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json(
      { success: false, message: "Email is required" },
      { status: 400 }
    );
  }

  const cleanEmail = email.trim();

  try {
    // 2. Create (or update) Shopify customer with only email
    const shopifyRes = await fetch(
      `https://${process.env.SHOP}/admin/api/2023-10/customers.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.ADMIN_TOKEN ?? "",
        },
        body: JSON.stringify({
          customer: {
            email: cleanEmail,
            tags: [`team-${cleanTeam}`],   // ← tag by product.handle
          },
        }),
      }
    );

    if (!shopifyRes.ok) {
      const err = await shopifyRes.json();
      console.error("Shopify Error:", err);
      return NextResponse.json(
        { success: false, message: err },
        { status: 502 }
      );
    }

    // 4. All done!
    return NextResponse.json(
      {
        success: true,
        message:
          "Thanks! Check your inbox—we've registered your email and will be in touch shortly.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
