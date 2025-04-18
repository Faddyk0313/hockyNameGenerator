import { NextResponse } from "next/server";



const key_words = {
  "categories": [
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
}


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
export async function POST(req: Request) {

  try {
    const response = await fetch(`https://judge.me/api/v1/reviews?shop_domain=${process.env.SHOP}&api_token=${process.env.JUDGE_ME_PRIVATE_API_TOKEN}&per_page=100`);
    const data = await response.json();
    const reviews = data.reviews;
     // Initialize grouped object
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
 
     return NextResponse.json({ success: true, groupedReviews: grouped, message: "Grouped successfully" }, { status: 200 });
 
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ success: false, data: null, message: error }, { status: 500 });
  }
}
