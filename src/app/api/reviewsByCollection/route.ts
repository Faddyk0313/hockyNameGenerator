import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOP;
const SHOPIFY_ACCESS_TOKEN = process.env.ADMIN_TOKEN || "";
const SHOPIFY_API_VERSION = "2023-10";
const JUDGEME_API_TOKEN = process.env.JUDGE_ME_PRIVATE_API_TOKEN;

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const JUDGEME_PER_PAGE = 100;
const MAX_JUDGEME_PAGES = 100;

type ShopifyCollection = {
  id: number | string;
  handle?: string;
  title?: string;
};

type ShopifyProduct = {
  id: number | string;
  handle?: string;
  title?: string;
};

type CollectionProductCacheEntry = {
  timestamp: number;
  products: ShopifyProduct[];
  collection: ShopifyCollection;
};

let allReviewsCache: { timestamp: number; reviews: any[] } | null = null;
const collectionProductsCache = new Map<string, CollectionProductCacheEntry>();

function sortByCreatedDesc(reviews: any[]) {
  return reviews.slice().sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });
}

function shopifyHeaders() {
  return {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  };
}

function getNextPageUrl(response: Response) {
  const link = response.headers.get("link");
  if (!link) return null;

  const nextLink = link.split(",").find((part) => part.includes('rel="next"'));
  const match = nextLink?.match(/<([^>]+)>/);
  return match?.[1] || null;
}

async function shopifyFetch(url: string) {
  const response = await fetch(url, { headers: shopifyHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify request failed (${response.status}): ${body}`);
  }
  return response;
}

async function findCollectionByHandle(collectionHandle: string) {
  const handle = collectionHandle.trim();

  for (const kind of ["custom_collections", "smart_collections"] as const) {
    const url =
      `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/${kind}.json` +
      `?handle=${encodeURIComponent(handle)}&limit=1`;
    const response = await shopifyFetch(url);
    const data = await response.json();
    const collection = Array.isArray(data[kind]) ? data[kind][0] : null;
    if (collection) return collection as ShopifyCollection;
  }

  return null;
}

async function fetchProductsForCollection(collection: ShopifyCollection) {
  const cacheKey = String(collection.id);
  const now = Date.now();
  const cached = collectionProductsCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached;
  }

  const products: ShopifyProduct[] = [];
  let url: string | null =
    `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/products.json` +
    `?collection_id=${encodeURIComponent(String(collection.id))}&limit=250`;

  while (url) {
    const response = await shopifyFetch(url);
    const data = await response.json();
    products.push(...(Array.isArray(data.products) ? data.products : []));
    url = getNextPageUrl(response);
  }

  const entry = { timestamp: now, products, collection };
  collectionProductsCache.set(cacheKey, entry);
  return entry;
}

function extractReviewProductIdentifiers(review: any) {
  const values = [
    review.product_external_id,
    review.product?.external_id,
    review.product?.shopify_id,
    review.product?.externalId,
    review.product_id,
    review.product?.id,
    review.product_handle,
    review.product?.handle,
  ];

  return values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

function reviewBelongsToProducts(review: any, productIds: Set<string>, productHandles: Set<string>) {
  const identifiers = extractReviewProductIdentifiers(review);

  return identifiers.some(
    (identifier) => productIds.has(identifier) || productHandles.has(identifier),
  );
}

async function fetchAllJudgeMeReviews() {
  const now = Date.now();

  if (allReviewsCache && now - allReviewsCache.timestamp < CACHE_DURATION) {
    return allReviewsCache.reviews;
  }

  const reviews: any[] = [];

  for (let page = 1; page <= MAX_JUDGEME_PAGES; page += 1) {
    const url =
      `https://judge.me/api/v1/reviews?shop_domain=${encodeURIComponent(SHOPIFY_STORE || "")}` +
      `&api_token=${encodeURIComponent(JUDGEME_API_TOKEN || "")}` +
      `&per_page=${JUDGEME_PER_PAGE}&page=${page}&published=true`;

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Judge.me request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const batch = Array.isArray(data.reviews) ? data.reviews : [];
    reviews.push(...batch);

    if (batch.length < JUDGEME_PER_PAGE) break;
  }

  allReviewsCache = { timestamp: now, reviews };
  return reviews;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const collectionHandle = searchParams.get("collectionHandle");

  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN || !JUDGEME_API_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing SHOP, ADMIN_TOKEN, or JUDGE_ME_PRIVATE_API_TOKEN environment variable",
      },
      { status: 500 },
    );
  }

  if (!collectionHandle) {
    return NextResponse.json(
      { success: false, groupedReviews: null, message: "Send collectionHandle" },
      { status: 400 },
    );
  }

  try {
    const collection = await findCollectionByHandle(collectionHandle);

    if (!collection) {
      return NextResponse.json(
        { success: false, groupedReviews: null, message: "Collection not found" },
        { status: 404 },
      );
    }

    const [{ products }, allReviews] = await Promise.all([
      fetchProductsForCollection(collection),
      fetchAllJudgeMeReviews(),
    ]);

    const productIds = new Set(products.map((product) => String(product.id).toLowerCase()));
    const productHandles = new Set(
      products
        .map((product) => product.handle)
        .filter((handle): handle is string => Boolean(handle))
        .map((handle) => handle.toLowerCase()),
    );

    const collectionReviews = allReviews.filter((review) =>
      reviewBelongsToProducts(review, productIds, productHandles),
    );

    const withPictures = collectionReviews.filter(
      (review) => Array.isArray(review.pictures) && review.pictures.length > 0,
    );
    const withoutPictures = collectionReviews.filter(
      (review) => !Array.isArray(review.pictures) || review.pictures.length === 0,
    );

    const groupedReviews = {
      "With Pictures": sortByCreatedDesc(withPictures),
      "Without Pictures": sortByCreatedDesc(withoutPictures),
    };

    return NextResponse.json(
      {
        success: true,
        groupedReviews,
        message: "Grouped successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json(
      { success: false, groupedReviews: null, message: String(error) },
      { status: 500 },
    );
  }
}
