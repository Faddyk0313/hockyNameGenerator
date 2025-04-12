import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const {
    first_name, last_name, email, phone,
    address1, address2, city, province, country, zip,
    partner_type, website, tax_id, business_description
  } = await req.json();

  let safeWebsite = website?.trim();
  if (safeWebsite && !safeWebsite.startsWith("http://") && !safeWebsite.startsWith("https://")) {
    safeWebsite = "https://" + safeWebsite;
  }
  console.log("process.env.SHOP", process.env.SHOP)
  try {
    const response = await fetch(`https://${process.env.SHOP}/admin/api/2023-10/customers.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.ADMIN_TOKEN ?? "",
      },
      body: JSON.stringify({
        customer: {
          first_name,
          last_name,
          email,
          phone,
          tags: "pending-approval",
          addresses: [{
            address1,
            address2,
            city,
            province,
            country,
            zip
          }],
          metafields: [
            {
              "namespace": "partner_form",
              "key": "partner_type",
              "value": partner_type,
              "type": "single_line_text_field"
            },
            {
              "namespace": "partner_form",
              "key": "website",
              "value": safeWebsite,
              "type": "url"
            },
            {
              "namespace": "partner_form",
              "key": "tax_id",
              "value": tax_id,
              "type": "single_line_text_field"
            },
            {
              "namespace": "partner_form",
              "key": "business_description",
              "value": business_description,
              "type": "multi_line_text_field"
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error:", errorData);
      return NextResponse.json({ success: false, error: errorData }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Successfully created partner" }, { status: 200 });
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
