import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOP;
const ACCESS_TOKEN = process.env.ADMIN_TOKEN || "";

export async function GET(req: Request) {
  try{
  const now = new Date();

  let products = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
  });
       products = await products.json();

  for (const product of products.products) {
    for (const variant of product.variants) {
      // Get metafields
      let metafields = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${product.id}/metafields.json`,
        { headers: { "X-Shopify-Access-Token": ACCESS_TOKEN } }
      );
      metafields = await metafields.json();
      const start = metafields.metafields.find((m) => m.key === "order_window_start");
      const end = metafields.metafields.find((m) => m.key === "order_window_end");
      if (!start || !end) continue;
      console.log("start",start)
      console.log("end",end)

      const startDate = new Date(start.value);
      const endDate = new Date(end.value);

      let inventory_policy = "deny";
      if (now >= startDate && now <= endDate) {
        inventory_policy = "continue";
      }

      let res = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/variants/${variant.id}.json`,
       
        {         
          method: "PUT",
          headers: { 
            "X-Shopify-Access-Token": ACCESS_TOKEN ,      
            "Content-Type": "application/json"
          } ,
          body:JSON.stringify({
          variant: {
            id: variant.id,
            inventory_policy,
          },
          })
        }
      );
      res = await res.json();
      if (res.errors) {
        console.log(res.errors);
        continue;
      }
      console.log(res);
      console.log(`Updated variant ${variant.id}: ${inventory_policy}: ${product.id}`);
    }
  }
  return NextResponse.json({ message: 'OK' });

  }catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
};