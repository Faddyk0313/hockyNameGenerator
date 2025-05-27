import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOP;
const ACCESS_TOKEN = process.env.ADMIN_TOKEN || "";

export async function GET(req: Request) {
  try{
  const now = new Date();

  const productsRes = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
  });
       const products = await productsRes.json();

  for (const product of products.products) {
    for (const variant of product.variants) {
      // Get metafields
      const metafieldsRes = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${product.id}/metafields.json`,
        { headers: { "X-Shopify-Access-Token": ACCESS_TOKEN } }
      );
      const metafields = await metafieldsRes.json();
      const start = metafields.metafields.find((m:any) => m.key === "order_window_start");
      const end = metafields.metafields.find((m:any) => m.key === "order_window_end");
      if (!start || !end) continue;
      console.log("start",start)
      console.log("end",end)

      const startDate = new Date(start.value);
      const endDate = new Date(end.value);

      let inventory_policy = "deny";
      if (now >= startDate && now <= endDate) {
        inventory_policy = "continue";
      }

      const shopifyRes = await fetch(
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
      const res = await shopifyRes.json();
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