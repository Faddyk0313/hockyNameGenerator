// pages/api/run-sync.js

import { NextResponse } from "next/server";



const SHOPIFY_STORE = process.env.SHOP;           // “42ddef-3.myshopify.com”
const ACCESS_TOKEN = process.env.ADMIN_TOKEN;    // “shpat_xxx”
const API_VERSION = "2023-01";

const STATE_NAMESPACE = "custom";
const STATE_KEY = "product_state";

const LABEL_NAMESPACE = "custom";
const LABEL_KEY = "add_to_cart_button_label";

const HEADERS = {
    "X-Shopify-Access-Token": ACCESS_TOKEN,
    "Content-Type": "application/json",
};

// Utility: pause to avoid rate limits
async function pause(ms = 200) {
    return new Promise(res => setTimeout(res, ms));
}

// Fetch all ACTIVE products, paginated
async function getAllProducts() {
    let products = [];
    let sinceId;
    while (true) {
        let url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/products.json?status=active&limit=250`;
        if (sinceId) url += `&since_id=${sinceId}`;
        const resp = await fetch(url, { headers: HEADERS });
        if (!resp.ok) throw new Error(`Fetch products failed: ${resp.statusText}`);
        const batch = (await resp.json()).products;
        if (batch.length === 0) break;
        products = products.concat(batch);
        sinceId = batch[batch.length - 1].id;
        await pause();
        if (batch.length < 250) break;
    }
    return products;
}

// Get product-level metafields by namespace+key
async function getProductMetafields(productId, namespace, key) {
    const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`
        + `/products/${productId}/metafields.json`
        + `?namespace=${namespace}&key=${key}`;
    const resp = await fetch(url, { headers: HEADERS });
    if (!resp.ok) {
        console.error(`Error fetching metafields for ${productId}:`, await resp.text());
        return [];
    }
    await pause(100);
    return (await resp.json()).metafields;
}

// Upsert (create or update) a product-level metafield
async function upsertProductMetafield(productId, namespace, key, value) {
    const existing = await getProductMetafields(productId, namespace, key);
    const payload = {
        metafield: {
            namespace,
            key,
            value,
            type: "single_line_text_field",
            owner_id: productId,
            owner_resource: "product",
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
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        console.error(`${method} metafield failed for product ${productId}:`, await res.text());
    } else {
        console.log(`✅ ${method} ${namespace}.${key} on product ${productId}`);
    }
    await pause();
}

// Delete a metafield by its ID
async function deleteMetafield(mfId) {
    const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${mfId}.json`;
    const res = await fetch(url, { method: "DELETE", headers: HEADERS });
    if (!res.ok) {
        console.error(`❌ Failed deleting metafield ${mfId}:`, await res.text());
    } else {
        console.log(`🗑️ Deleted metafield ${mfId}`);
    }
    await pause(100);
}

// Update variant inventory_policy
async function updateVariantPolicy(variantId, policy) {
    const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`;
    const body = { variant: { id: variantId, inventory_policy: policy } };
    const res = await fetch(url, {
        method: "PUT",
        headers: HEADERS,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        console.error(`❌ Failed updating variant ${variantId}:`, await res.text());
    } else {
        console.log(`🔄 Variant ${variantId} policy → ${policy}`);
    }
    await pause();
}

export async function POST(req: Request) {
    // 1) Read config array from UI
    const { config } = await req.json();
    if (!Array.isArray(config)) {
        return NextResponse.json({ error: "Missing or invalid `config` array" }, { status: 400 });
    }

    // Build a lookup map: stateKey → { label?, policy }
    const stateMap = {};
    for (const row of config) {
        if (!row.key || !row.policy) continue;
        stateMap[row.key.trim().toLowerCase()] = {
            label: row.label?.trim(),
            policy: row.policy.trim().toLowerCase()
        };
    }

    try {
        // 2) Fetch all active products
        const products = await getAllProducts();
        console.log(`→ Found ${products.length} active products`);

        // 3) Loop & apply config
        for (const prod of products) {
            const pid = prod.id;
            console.log(`🏷 Product ${pid} (${prod.title})`);

            // Read its state
            const mfs = await getProductMetafields(pid, STATE_NAMESPACE, STATE_KEY);
            const state = mfs[0]?.value?.trim().toLowerCase() || "";
            console.log(`  • State = '${state || "<unset>"}'`);

            // Lookup in our dynamic config
            const mapping = stateMap[state];
            // SKIP any product without a filled state OR without a mapping
            if (!state || !mapping) {
                console.log(`  • Skipping ${pid}: no state or no mapping`);
                continue;
            }
            // Find existing label MF ID (if any)
            const labelMfs = await getProductMetafields(pid, LABEL_NAMESPACE, LABEL_KEY);
            const existingLabelId = labelMfs[0]?.id;

            // Variant IDs
            const variantIds = prod.variants.map(v => v.id);

            // 3a) If mapping.label exists, upsert it
            if (mapping.label) {
                await upsertProductMetafield(pid, LABEL_NAMESPACE, LABEL_KEY, mapping.label);
            } else if (existingLabelId) {
                console.log(`  • Removing label for ${pid}`);
                await deleteMetafield(existingLabelId);
            }
            // 3b) Apply inventory policy to each variant
            for (const vid of variantIds) {
                await updateVariantPolicy(vid, mapping.policy);
            }


        }

        console.log("🎉 Dynamic sync complete!");
        return NextResponse.json({ message: "Sync finished successfully" });

    } catch (err) {
        console.error("Unhandled error in sync:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}

// added dynamic `config` handling: reads config from POST body and drives label + policy logic per-product  
