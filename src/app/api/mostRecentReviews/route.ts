import { NextResponse } from "next/server";

// Cache object to store data and timestamp
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

function sortByCreatedDesc(reviews: any[]) {
  return reviews.slice().sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta; // newest first
  });
}

export async function GET(req: Request) {
  const now = Date.now();

  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json({ success: true, groupedReviews: cachedData, message: "From cache" }, { status: 200 });
  }

  try {
    const response = await fetch(
      `https://judge.me/api/v1/reviews?shop_domain=${process.env.SHOP}&api_token=${process.env.JUDGE_ME_PRIVATE_API_TOKEN}&per_page=100&published=true`,
    );
    const data = await response.json();
    const reviews: any[] = Array.isArray(data.reviews) ? data.reviews : [];

    // Partition into with/without pictures
    const withPictures = reviews.filter(r => Array.isArray(r.pictures) && r.pictures.length > 0);
    const withoutPictures = reviews.filter(r => !Array.isArray(r.pictures) || r.pictures.length === 0);

    // Sort each group newest → oldest
    const grouped = {
      "With Pictures": sortByCreatedDesc(withPictures),
      "Without Pictures": sortByCreatedDesc(withoutPictures),
    };

    // Update cache
    cachedData = grouped;
    cacheTimestamp = now;

    return NextResponse.json({ success: true, groupedReviews: grouped, message: "Grouped successfully" }, { status: 200 });
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ success: false, data: null, message: String(error) }, { status: 500 });
  }
}
