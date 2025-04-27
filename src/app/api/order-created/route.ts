// START: Webhook - Order Created (Fixed for App Router)

import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_KEY!;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const API_VERSION = '2023-10'; // corrected API version, yours was invalid "2025-04"!

export async function POST(req: Request) {
  const rawBody = await req.text(); // 👈 Correct way to read raw body in App Router
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') as string;
  const verified = verifyShopifyWebhook(rawBody, hmacHeader);

  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const order = JSON.parse(rawBody);
  const orderId = order.id;
  const preProductionTag = 'preproduction';
  let preproductionTotal = 0;

  for (const item of order.line_items) {
    const tags = item?.product_exists ? item?.product_tags?.split(', ') : [];
      console.log("tags",tags);
    if (tags.includes(preProductionTag)) {
      preproductionTotal += parseFloat(item.price) * item.quantity;
    }
  }

  const remaining = preproductionTotal / 2;

  const note = `Pre-Production: $${preproductionTotal.toFixed(2)} | Remaining 50% to invoice: $${remaining.toFixed(2)}`;

  await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-10/orders/${orderId}.json`, {
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

// END: Webhook - Order Created (Fixed for App Router)
