import { NextResponse } from "next/server";

// Cache object to store data and timestamp
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

const key_words = {
  "categories": [

    {
      "name": "What customers say about caring for your Titan",
      "keywords": [
        "laundry", "launder", "care", "wash", "hold up", "clean", "stain", "odor", "air dry", "hang dry", "dryer", "shrink", 
        "durability", "durable", "lasts", "wear and tear", "over time", "looks new", "like new", "maintain", "maintenance",
         "upkeep", "spot clean", "quality", "built to last", "stays strong", "holds shape", "premium", "elite", "pro",
          "well made", "construction", "materials", "top-notch", "superior", "fabric", "next-level"
      ]
    },
    {
      "name": "Comfort & Fit",
      "keywords": [
        "comfortable", "fit", "fits well", "soft", "snug", "not tight", "form fitting",
        "true to size", "not bulky", "lightweight", "tight", "breathable", "flexible",
        "second skin", "stretchy", "not itchy", "mobility", "chafing", "layering"
      ]
    },
    {
      "name": "No Velcro",
      "keywords": [
        "velcro", "slip on", "adjustable", "collar", "hassle-free", "neckline", "fasteners", "adjusting"
      ]
    },
    {
      "name": "Safety",
      "keywords": [
        "protection", "safety", "protects", "neck", "wrists", "cut resistant", "cut resistance",
        "peace of mind", "safe", "secure", "neck guard", "full coverage", "high risk area",
        "feel protected", "feels protected", "neck artery", "artery", "injury", "injury prevention", "safety-first"
      ]
    },
    {
      "name": "I Simply Love It",
      "keywords": [
        "love it", "loves it", "favorite", "must-have", "kid-approved", "happy", "game changer"
      ]
    },
    {
      "name": "Quality & Durability",
      "keywords": [
        "high quality", "well made", "great quality", "craftsmanship", "durable", "doesn't sag",
        "holds up", "solid", "built to last", "premium", "material", "rugged", "long lasting",
        "top notch", "pro quality", "quality", "heavy duty"
      ]
    },
    {
      "name": "Style & Color",
      "keywords": [
        "color", "design", "cool", "looks good", "bright", "matches team", "team color", "team colors",
        "slime", "green", "pink", "miami vice", "red", "camo", "blue", "purple", "gold",
        "stylish", "standout", "eye-catching", "drip", "fun", "custom"
      ]
    }
  ]
};

function getMatchingCategories(text: string): string[] {
  const matched: string[] = [];
  const lowerText = text.toLowerCase();

  for (const category of key_words.categories) {
    if (category.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      matched.push(category.name);
    }
  }

  return matched;
}

export async function GET(req: Request) {
  const now = Date.now();

  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json({ success: true, groupedReviews: cachedData, message: "From cache" }, { status: 200 });
  }

  try {
    const response = await fetch(`https://judge.me/api/v1/reviews?shop_domain=${process.env.SHOP}&api_token=${process.env.JUDGE_ME_PRIVATE_API_TOKEN}&per_page=100`);
    const data = await response.json();
    const reviews = data.reviews;

    const grouped: Record<string, any[]> = {};
    for (const category of key_words.categories) {
      grouped[category.name] = [];
    }

    for (const review of reviews) {
      const combinedText = `${review.title ?? ""} ${review.body ?? ""}`;
      const matchedCategories = getMatchingCategories(combinedText);

      for (const cat of matchedCategories) {
        grouped[cat].push(review);
      }
    }

    // Update cache
    cachedData = grouped;
    cacheTimestamp = now;

    return NextResponse.json({ success: true, groupedReviews: grouped, message: "Grouped successfully" }, { status: 200 });

  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ success: false, data: null, message: error }, { status: 500 });
  }
}