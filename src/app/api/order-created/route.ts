// START: Webhook - Order Created with Variant Metafield Check

import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET_DEV!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN_DEV!;
const SHOP = process.env.SHOP_DEV!;
const API_VERSION = '2025-04';

export async function POST(req: Request) {
  try{

    const data = await req.json();
    console.log('Order Created Webhook:', data);
    const order = data.order;
  const orderId = order.id;
  let preproductionTotal = 0;

  for (const item of order.line_items) {
    const variantId = item.variant_id;

    if (!variantId) continue; // Skip if no variant

    // Fetch variant metafield: custom.preproduction_note
    const metafieldRes = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/variants/${variantId}/metafields/custom/preproduction_note.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (metafieldRes.status === 200) {
      const metafieldData = await metafieldRes.json();
      const preproductionNote = metafieldData?.metafield?.value || '';
      
      console.log('Variant ID:', variantId, '| Preproduction Note:', preproductionNote); // 👈 ADD THIS

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
    await fetch(`https://${SHOP}/admin/api/${API_VERSION}/orders/${orderId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
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
}catch (error) {
  return NextResponse.json({ error }, { status: 500 });

}
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
