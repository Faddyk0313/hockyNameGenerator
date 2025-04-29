// START: Webhook - Order Created - Simple 50% Calculation (No metafield check)

import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET_DEV!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN_DEV!;
const SHOP = process.env.SHOP_DEV!;
const API_VERSION = '2023-10'; // ✅ Fixed API version, stable version not 2025-04.

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') as string;
  const verified = verifyShopifyWebhook(rawBody, hmacHeader);

  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  
  const order = JSON.parse(rawBody);
    console.log('✅ Order Created Webhook:', order);

    const orderId = order.id;
    let totalAmount = 0;

    for (const item of order.line_items) {
       // Fetch variant metafield: custom.preproduction_note
       const metafieldRes = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/variants/${item.variant_id}/metafields.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': ADMIN_TOKEN,
          'Content-Type': 'application/json',
        },
      });
        const metafield_data = await metafieldRes.json()
        metafield_data.metafields.forEach((metafield: any) => {
          if(metafield.key =="preproduction_note" && metafield.value !== ''){
              const lineTotal = parseFloat(item.price) * item.quantity;
              totalAmount += lineTotal;
              console.log(`Line Item: ${item.title} | Total: $${lineTotal.toFixed(2)}`);
          }
        })
    }

    console.log('✅ Full Line Items Total:', totalAmount);

    const depositAmount = totalAmount / 2;
    console.log('✅ 50% Deposit Amount:', depositAmount);

    const note = `🧾 Pre-Production Estimate:\n- Total Items: $${totalAmount.toFixed(2)}\n- 50% Deposit Due Later: $${depositAmount.toFixed(2)}\n\n(This is an internal note.)`;

    console.log('✅ Order Note to Attach:', note);

    // Update the order with the note and a tag
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
          tags: [...(order.tags || []), 'awaiting-balance'].join(', '),
        },
      }),
    });

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
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

// END: Webhook - Order Created - Simple 50% Calculation