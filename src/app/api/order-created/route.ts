// START: Webhook - Order Created with Variant Metafield Check

import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;
const ADMIN_API_TOKEN = process.env.ADMIN_TOKEN!;
const SHOPIFY_STORE = process.env.SHOP!;
const API_VERSION = '2023-10';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') as string;
  const verified = verifyShopifyWebhook(rawBody, hmacHeader);

  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const order = JSON.parse(rawBody);
  const orderId = order.id;
  let preproductionTotal = 0;

  for (const item of order.line_items) {
    const variantId = item.variant_id;

    if (!variantId) continue; // Skip if no variant

    // Fetch variant metafield: custom.preproduction_note
    const metafieldRes = await fetch(`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/variants/${variantId}/metafields/custom/preproduction_note.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ADMIN_API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (metafieldRes.status === 200) {
      const metafieldData = await metafieldRes.json();
      const preproductionNote = metafieldData?.metafield?.value || '';

      // Only treat it as preproduction if value is not empty
      if (preproductionNote.trim() !== '') {
        preproductionTotal += parseFloat(item.price) * item.quantity;
      }
    }
  }

  if (preproductionTotal > 0) {
    const remaining = preproductionTotal / 2;

    const note = `Pre-Production Total: $${preproductionTotal.toFixed(2)} | Remaining 50% to invoice: $${remaining.toFixed(2)}`;

    // Update the order with the note and a tag "awaiting-balance"
    await fetch(`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/orders/${orderId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        order: {
          id: orderId,
          note,
          tags: [...order.tags, 'awaiting-balance'].join(', '),
        },
      }),
    });
  }

  return NextResponse.json({ message: 'OK' });
}

// Validate webhook HMAC
function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
  const digest = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('base64');
  return digest === hmacHeader;
}

// END: Webhook - Order Created with Variant Metafield Check
