import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const SHOPIFY_STORE = process.env.SHOP!;
const ACCESS_TOKEN  = process.env.ADMIN_TOKEN!;
const API_VERSION   = "2023-01";

const STATE_NAMESPACE   = "custom";
const STATE_KEY         = "product_state";
const LABEL_NAMESPACE   = "custom";
const LABEL_KEY         = "add_to_cart_button_label";
// new estimated shipping metafield:
const SHIPPING_NAMESPACE = "custom";
const SHIPPING_KEY       = "estimated_shipping2";

const HEADERS = {
  "X-Shopify-Access-Token": ACCESS_TOKEN,
  "Content-Type": "application/json",
};

async function pause(ms = 200) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getAllProducts(): Promise<any[]> {
  const products: any[] = [];
  let sinceId: number | undefined;
  while (true) {
    let url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/products.json?status=active&limit=250`;
    if (sinceId) url += `&since_id=${sinceId}`;
    const res = await fetch(url, { headers: HEADERS });
    const batch = (await res.json()).products as any[];
    if (batch.length === 0) break;
    products.push(...batch);
    sinceId = batch[batch.length - 1].id;
    await pause();
    if (batch.length < 250) break;
  }
  return products;
}

async function getMetafields(owner: number, ns: string, key: string) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/${owner}/metafields.json?namespace=${ns}&key=${key}`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  await pause(100);
  return data.metafields as any[];
}

async function upsertMf(owner: number, ns: string, key: string, value: string) {
  const existing = await getMetafields(owner, ns, key);
  const payload = { metafield: { namespace: ns, key, value, type: "single_line_text_field", owner_id: owner, owner_resource: "product" } };
  const [url, method] = existing.length
    ? [`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${existing[0].id}.json`, "PUT"]
    : [`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields.json`, "POST"];
  await fetch(url, { method, headers: HEADERS, body: JSON.stringify(payload) });
  await pause();
}

async function deleteMf(mfId: number) {
  await fetch(`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${mfId}.json`, { method: "DELETE", headers: HEADERS });
  await pause(100);
}

async function updateVariant(variantId: number, policy: string) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`;
  await fetch(url, { method: "PUT", headers: HEADERS, body: JSON.stringify({ variant: { id: variantId, inventory_policy: policy } }) });
  await pause();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { config, password } = req.body as { config: any[]; password: string };
  if (!password || crypto.createHash("sha256").update(password).digest("hex") !== process.env.PASSWORD_HASH) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // build lookup
  const map: Record<string, { label?: string; policy: string; message?: string }> = {};
  config.forEach((r) => {
    const k = r.key?.trim().toLowerCase();
    if (k && r.policy) map[k] = { label: r.label?.trim(), policy: r.policy, message: r.message?.trim() };
  });

  try {
    const products = await getAllProducts();
    for (const p of products) {
      const pid = p.id as number;
      const mfs = await getMetafields(pid, STATE_NAMESPACE, STATE_KEY);
      const state = mfs[0]?.value?.trim().toLowerCase();
      const cfg = map[state];
      if (!state || !cfg) continue;

      // ATC label
      if (cfg.label) await upsertMf(pid, LABEL_NAMESPACE, LABEL_KEY, cfg.label);
      else {
        const existing = await getMetafields(pid, LABEL_NAMESPACE, LABEL_KEY);
        if (existing[0]) await deleteMf(existing[0].id);
      }

      // Estimated shipping (new)
      if (cfg.message) await upsertMf(pid, SHIPPING_NAMESPACE, SHIPPING_KEY, cfg.message);
      else {
        const existing = await getMetafields(pid, SHIPPING_NAMESPACE, SHIPPING_KEY);
        if (existing[0]) await deleteMf(existing[0].id);
      }

      // variants
      const vids = (p.variants as any[]).map((v) => v.id as number);
      for (const vid of vids) {
        await updateVariant(vid, cfg.policy);
      }
    }
    return res.status(200).json({ message: "Sync complete" });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}



// import { NextResponse } from "next/server";


// import crypto from "crypto";

// const SHOPIFY_STORE = process.env.SHOP!;           
// const ACCESS_TOKEN = process.env.ADMIN_TOKEN!;    
// const API_VERSION = "2023-01";

// const STATE_NAMESPACE = "custom";
// const STATE_KEY = "product_state";

// const LABEL_NAMESPACE = "custom";
// const LABEL_KEY = "add_to_cart_button_label";

// const HEADERS = {
//     "X-Shopify-Access-Token": ACCESS_TOKEN,
//     "Content-Type": "application/json",
// };

// // Utility: pause to avoid rate limits
// async function pause(ms = 200) {
//     return new Promise(res => setTimeout(res, ms));
// }

// // Fetch all ACTIVE products, paginated
// async function getAllProducts() :Promise<any[]> {
//     let products  :any[]= [];
//     let sinceId;
//     while (true) {
//         let url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/products.json?status=active&limit=250`;
//         if (sinceId) url += `&since_id=${sinceId}`;
//         const resp = await fetch(url, { headers: HEADERS });
//         if (!resp.ok) throw new Error(`Fetch products failed: ${resp.statusText}`);
//         const batch = (await resp.json()).products;
//         if (batch.length === 0) break;
//         products = products.concat(batch);
//         sinceId = batch[batch.length - 1].id;
//         await pause();
//         if (batch.length < 250) break;
//     }
//     return products;
// }

// // Get product-level metafields by namespace+key
// async function getProductMetafields(productId:string, namespace:string, key:string) {
//     const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`
//         + `/products/${productId}/metafields.json`
//         + `?namespace=${namespace}&key=${key}`;
//     const resp = await fetch(url, { headers: HEADERS });
//     if (!resp.ok) {
//         console.error(`Error fetching metafields for ${productId}:`, await resp.text());
//         return [];
//     }
//     await pause(100);
//     return (await resp.json()).metafields;
// }

// // Upsert (create or update) a product-level metafield
// async function upsertProductMetafield(productId:string, namespace:string, key:string, value:string) {
//     const existing = await getProductMetafields(productId, namespace, key);
//     const payload = {
//         metafield: {
//             namespace,
//             key,
//             value,
//             type: "single_line_text_field",
//             owner_id: productId,
//             owner_resource: "product",
//         }
//     };
//     let url, method;
//     if (existing.length) {
//         url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${existing[0].id}.json`;
//         method = "PUT";
//     } else {
//         url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields.json`;
//         method = "POST";
//     }
//     const res = await fetch(url, {
//         method,
//         headers: HEADERS,
//         body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//         console.error(`${method} metafield failed for product ${productId}:`, await res.text());
//     } else {
//         console.log(`✅ ${method} ${namespace}.${key} on product ${productId}`);
//     }
//     await pause();
// }

// // Delete a metafield by its ID
// async function deleteMetafield(mfId:string) {
//     const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${mfId}.json`;
//     const res = await fetch(url, { method: "DELETE", headers: HEADERS });
//     if (!res.ok) {
//         console.error(`❌ Failed deleting metafield ${mfId}:`, await res.text());
//     } else {
//         console.log(`🗑️ Deleted metafield ${mfId}`);
//     }
//     await pause(100);
// }

// // Update variant inventory_policy
// async function updateVariantPolicy(variantId:string, policy:string) {
//     const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`;
//     const body = { variant: { id: variantId, inventory_policy: policy } };
//     const res = await fetch(url, {
//         method: "PUT",
//         headers: HEADERS,
//         body: JSON.stringify(body),
//     });
//     if (!res.ok) {
//         console.error(`❌ Failed updating variant ${variantId}:`, await res.text());
//     } else {
//         console.log(`🔄 Variant ${variantId} policy → ${policy}`);
//     }
//     await pause();
// }

// export async function POST(req: Request) {
//     // 1) Read config array from UI
//     const { config,password } = await req.json();
//     if (!Array.isArray(config)) {
//         return NextResponse.json({ error: "Missing or invalid `config` array" }, { status: 400 });
//     }
//     if(password == ""){
        
//         return NextResponse.json({ error: "please provide" }, { status: 400 });
//     }

//  const incomingHash = crypto
//     .createHash("sha256")
//     .update(password)
//     .digest("hex");

//   if (incomingHash !== process.env.PASSWORD_HASH) {
//         return NextResponse.json({ error: "Invalid Password" }, { status: 400 });
//   }
//     // Build a lookup map: stateKey → { label?, policy }
//   const stateMap: Record<string, { label?: string; policy: string }> = {};
//     for (const row of config) {
//         if (!row.key || !row.policy) continue;
//         stateMap[row.key.trim().toLowerCase()] = {
//             label: row.label?.trim(),
//             policy: row.policy.trim().toLowerCase()
//         };
//     }

//     try {
//         // 2) Fetch all active products
//         const products = await getAllProducts();
//         console.log(`→ Found ${products.length} active products`);

//         // 3) Loop & apply config
//         for (const prod of products) {
//             const pid = prod.id;
//             console.log(`🏷 Product ${pid} (${prod.title})`);

//             // Read its state
//             const mfs = await getProductMetafields(pid, STATE_NAMESPACE, STATE_KEY);
//             const state = mfs[0]?.value?.trim().toLowerCase() || "";
//             console.log(`  • State = '${state || "<unset>"}'`);

//             // Lookup in our dynamic config
//             const mapping = stateMap[state];
//             // SKIP any product without a filled state OR without a mapping
//             if (!state || !mapping) {
//                 console.log(`  • Skipping ${pid}: no state or no mapping`);
//                 continue;
//             }
//             // Find existing label MF ID (if any)
//             const labelMfs = await getProductMetafields(pid, LABEL_NAMESPACE, LABEL_KEY);
//             const existingLabelId = labelMfs[0]?.id;

//             // Variant IDs
//             const variantIds = prod.variants.map((v:any) => v.id);

//             // 3a) If mapping.label exists, upsert it
//             if (mapping.label) {
//                 await upsertProductMetafield(pid, LABEL_NAMESPACE, LABEL_KEY, mapping.label);
//             } else if (existingLabelId) {
//                 console.log(`  • Removing label for ${pid}`);
//                 await deleteMetafield(existingLabelId);
//             }
//             // 3b) Apply inventory policy to each variant
//             for (const vid of variantIds) {
//                 await updateVariantPolicy(vid, mapping.policy);
//             }


//         }

//         console.log("🎉 Dynamic sync complete!");
//         return NextResponse.json({ message: "Sync finished successfully" });

//     } catch (err) {
//         console.error("Unhandled error in sync:", err);
//         return NextResponse.json(
//             { error: err instanceof Error ? err.message : String(err) },
//             { status: 500 }
//         );
//     }
// }

