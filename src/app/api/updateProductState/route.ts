// pages/api/run-sync.js

import { NextResponse } from "next/server";

/**
 * Next.js API route to:
 *  • Read each product’s “state” metafield
 *  • Upsert a product-level “add to cart” label metafield
 *  • Toggle each variant’s inventory policy (allow oversell vs. sold-out)
 */

const SHOPIFY_STORE   = process.env.SHOP;      // e.g. "42ddef-3.myshopify.com"
const ACCESS_TOKEN    = process.env.ADMIN_TOKEN; 
const API_VERSION     = "2023-01";

// Metafield definitions (product-level)
const STATE_NAMESPACE = "custom";
const STATE_KEY       = "product_state";

const LABEL_NAMESPACE = "custom";
const LABEL_KEY       = "add_to_cart_button_label";

// Mapping: state → button text
const LABELS = {
  preorder:  "Preorder today",
  current:   "Backorder today",
  carryover: "Backorder today",
};

const HEADERS = {
  "X-Shopify-Access-Token": ACCESS_TOKEN,
  "Content-Type": "application/json",
};


// Fetch every product, 250 at a time
async function getAllProducts() {
  let products = [];
  let sinceId;
  while (true) {
let url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/products.json?status=active&limit=250`;
    if (sinceId) url += `&since_id=${sinceId}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Fetch products failed: ${res.statusText}`);
    const batch = (await res.json()).products;
    if (batch.length === 0) break;
    products = products.concat(batch);
    sinceId = batch[batch.length - 1].id;
    if (batch.length < 250) break;
  }
  return products;
}

// Get metafields for a product filtered by namespace + key
async function getProductMetafields(productId:string, namespace:string, key:string) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`
            + `/products/${productId}/metafields.json`
            + `?namespace=${namespace}&key=${key}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.error(`Error fetching metafields for ${productId}:`, await res.text());
    return [];
  }
  return (await res.json()).metafields;
}

// Create or update a product-level metafield
async function upsertProductMetafield(productId:string, namespace:string, key:string, value:string) {
  const existing = await getProductMetafields(productId, namespace, key);
  const payload = {
    metafield: {
      namespace,
      key,
      value,
      type: "single_line_text_field",
      owner_id: productId,
      owner_resource: "product"
    }
  };
  let url, method;
  if (existing.length) {
    url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${existing[0].id}.json`;
    method = "PUT";
  } else {
    url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields.json`;
    method = "POST";
  }
  const res = await fetch(url, {
    method,
    headers: HEADERS,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    console.error(`${method} metafield failed for ${productId}:`, await res.text());
  } else {
    console.log(`✅ ${method} ${namespace}.${key} on product ${productId}`);
  }
}

// Delete a metafield by ID
async function deleteMetafield(metafieldId:string) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${metafieldId}.json`;
  const res = await fetch(url, { method: "DELETE", headers: HEADERS });
  if (!res.ok) console.error(`❌ Delete metafield ${metafieldId} failed:`, await res.text());
  else console.log(`🗑️ Deleted metafield ${metafieldId}`);
}

// Update a variant’s inventory_policy
async function updateVariantPolicy(variantId:string, policy:string) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`;
  const body = { variant: { id: variantId, inventory_policy: policy } };
  const res = await fetch(url, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(body)
  });
  if (!res.ok) console.error(`❌ Update variant ${variantId} failed:`, await res.text());
  else console.log(`🔄 Set variant ${variantId} policy → ${policy}`);
}

// The actual API handler
export async function POST(req: Request) {
    
    /**
     * data = {
     config:[ 
    {key: 'exiting', label: '', policy: 'deny'}
    {key: 'preorder', label: 'preorder today', policy: 'continue'}
    ]
    }
    */
    const data = await req.json();

  try {
    const products = await getAllProducts();
    console.log(`→ Found ${products.length} products\n`);

    for (const prod of products) {
      const pid = prod.id;
      console.log(`🏷 Product ${pid}: ${prod.title}`);

      // Read “state” metafield
      const stateMfs = await getProductMetafields(pid, STATE_NAMESPACE, STATE_KEY);
      console.log("stateMfs",stateMfs)
      const state = stateMfs[0]?.value?.trim().toLowerCase() || "";
      console.log(`  • State = '${state || "– unset –"}'`);

      // Find existing label metafield
      const labelMfs = await getProductMetafields(pid, LABEL_NAMESPACE, LABEL_KEY);
      const labelId  = labelMfs[0]?.id;

      // All variant IDs
      const variantIds = prod.variants.map(v => v.id);

      if (["preorder","current","carryover"].includes(state)) {
        // upsert label + allow oversell
        await upsertProductMetafield(pid, LABEL_NAMESPACE, LABEL_KEY, LABELS[state]);
        for (const vid of variantIds) {
          await updateVariantPolicy(vid, "continue");
        }

      } else if (state === "exiting") {
        // disable oversell, keep native sold-out
        console.log("  • Exiting: disabling oversell");
        for (const vid of variantIds) {
          await updateVariantPolicy(vid, "deny");
        }

      } else {
        // reset to default
        console.log("  • No state: deleting label + disabling oversell");
        if (labelId) await deleteMetafield(labelId);
        for (const vid of variantIds) {
          await updateVariantPolicy(vid, "deny");
        }
      }

    //   console.log(""); // spacer
    }

    console.log("🎉 Sync complete!");
  return NextResponse.json({ message: 'OK' });
  } catch (error) {
       return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });

  }
}
