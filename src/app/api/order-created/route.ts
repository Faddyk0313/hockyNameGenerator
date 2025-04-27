// START: Webhook - Order Created - Calculate Remaining Balance

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_KEY!;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const API_VERSION = '2025-04';

export async function GET(req: any, res: any) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
  const rawBody = await buffer(req);
  const verified = verifyShopifyWebhook(rawBody, hmacHeader);

  if (!verified) {
    return res.status(401).send('Unauthorized');
  }

  const order = JSON.parse(rawBody.toString());
  const orderId = order.id;
  const preProductionTag = 'preproduction';
  let preproductionTotal = 0;

  for (const item of order.line_items) {
    const tags = item?.product_exists ? item?.product_tags?.split(', ') : [];

    if (tags.includes(preProductionTag)) {
      preproductionTotal += parseFloat(item.price) * item.quantity;
    }
  }

  const remaining = preproductionTotal / 2;

  const note = `Pre-Production: $${preproductionTotal.toFixed(2)} | Remaining 50% to invoice: $${remaining.toFixed(2)}`;

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

  res.status(200).send('OK');
}

// Validate webhook HMAC
function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {
  const digest = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('base64');
  return digest === hmacHeader;
}

// Needed to access raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(req: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// END: Webhook - Order Created
