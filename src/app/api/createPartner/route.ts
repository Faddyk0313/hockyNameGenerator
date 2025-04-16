import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const first_name = formData.get("first_name");

  const last_name = formData.get("last_name");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const address1 = formData.get("address1");
  const address2 = formData.get("address2");
  const city = formData.get("city");
  const province = formData.get("province");
  const country = formData.get("country");
  const zip = formData.get("zip");
  const partner_type = formData.get("partner_type");
  const website = formData.get("website");
  const tax_id = formData.get("tax_id");
  const business_description = formData.get("business_description");




  const taxFile = formData.get("tax_file") as File | null;
  console.log("taxFile",taxFile)
  let hubspotData
  if (taxFile) {
    try{
    const arrayBuffer = await taxFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: taxFile.type });
  
    const formData = new FormData();
    formData.append("file", blob, taxFile.name);
    formData.append("fileName", taxFile.name);
    formData.append("folderPath", "partners_tax_documents");
    formData.append("options", JSON.stringify({ access: "PRIVATE" }));  
    const hubspotRes = await fetch("https://api.hubapi.com/files/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
      },
      body: formData,
    });
  
    hubspotData = await hubspotRes.json();
  
    if (!hubspotRes.ok) {
      console.error("❌ HubSpot File Upload Error:", hubspotData);
      return NextResponse.json({ success: false, error: hubspotData }, { status: 500 });
    }
  
    console.log("✅ HubSpot File uploaded:", hubspotData);
  }catch (error) {
    return NextResponse.json({ success: false, error: "Some thing went wrong" }, { status: 500 });
  }
  }
  


  let safeWebsite = typeof website === "string" ? website.trim() : "";
  console.log("safeWebsite",safeWebsite)
  if (safeWebsite && !safeWebsite.startsWith("http://") && !safeWebsite.startsWith("https://")) {
    safeWebsite = "https://" + safeWebsite;
  }
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
              "namespace": "custom",
              "key": "file_uplaod",
              "value": hubspotData.url,
              "type": "single_line_text_field"
            },
            {
              "namespace": "partner_form",
              "key": "business_description",
              "value": business_description,
              "type": "multi_line_text_field"
            }
          ],
          email_marketing_consent: {
            state: "subscribed",
            opt_in_level: "single_opt_in",
            consent_updated_at: new Date().toISOString()
          }
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
