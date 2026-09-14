import { NextResponse } from "next/server";

/**
 * Logo upload relay for the native HubSpot team forms in the Shopify theme
 * (Concept_Theme_Files: sections/hubspot-team-sales-form.liquid).
 *
 * Why this exists: no documented HubSpot forms endpoint accepts files.
 * /submissions/v3/integration/submit is JSON-only, and the embed's internal
 * formsnext/multipart endpoint now rejects all outside callers with UNAUTHORIZED.
 * HubSpot's documented answer is two steps, and this route is step one:
 *
 *   1. (here) upload the file to File Manager, return its URL
 *   2. (theme) submit the form as JSON with ts_logo_upload set to that URL
 *
 * ts_logo_upload is a text property holding a URL, so this matches how the
 * 21 existing logos are stored.
 *
 * The files-scope token cannot live in the theme -- theme code is public -- which
 * is the whole reason the upload is proxied through here.
 */

// Vercel Hobby caps serverless request bodies at ~4.5MB. Stay under it so an
// oversized file fails as a clean message rather than a platform-level 413.
// Raise this (and MAX_UPLOAD_BYTES in assets/hubspot-form.js, which must match)
// only alongside a plan that lifts the platform limit.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Logo artwork only. Vector formats are included because teams commonly submit
// .ai/.eps/.svg masters -- they are in the real upload history.
const ALLOWED_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "webp",
  "svg", "pdf", "ai", "eps",
];

// This route accepts uploads, so unlike the other /api routes it does not stay
// open to any origin. Anything not listed here gets no CORS grant.
const ALLOWED_ORIGINS = [
  "https://www.titanbattlegear.com",
  "https://titanbattlegear.com",
  // The myshopify host serves preview themes (preview_theme_id=...), which is how the
  // form is tested before it is placed on the live templates.
  "https://42ddef-3.myshopify.com",
];

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  const fail = (status: number, message: string) =>
    NextResponse.json({ success: false, message }, { status, headers: cors });

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    return fail(400, "Could not read the uploaded file.");
  }

  if (!file || typeof file.size !== "number") {
    return fail(400, "No file was provided.");
  }

  if (file.size === 0) {
    return fail(400, "That file appears to be empty.");
  }

  // The theme checks this too, so a visitor sees the error before waiting for an
  // upload -- but the client check is a convenience, not the enforcement.
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(
      413,
      `That file is too large. Please upload a logo under ${Math.floor(
        MAX_UPLOAD_BYTES / (1024 * 1024)
      )}MB.`
    );
  }

  const extension = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return fail(415, "Please upload an image, PDF or vector logo file.");
  }

  if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    console.error("[hubspot-logo-upload] HUBSPOT_PRIVATE_APP_TOKEN is not set");
    return fail(500, "Upload is not configured.");
  }

  try {
    const upload = new FormData();
    upload.append("file", file, file.name);
    upload.append("fileName", file.name);
    upload.append("folderPath", "team_form_logos");
    // PRIVATE matches how form uploads have always been stored: reachable from the
    // contact record by staff, not published to the open web.
    upload.append(
      "options",
      JSON.stringify({
        access: "PRIVATE",
        overwrite: false,
        duplicateValidationStrategy: "NONE",
        duplicateValidationScope: "EXACT_FOLDER",
      })
    );

    const response = await fetch("https://api.hubapi.com/files/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
      },
      body: upload,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[hubspot-logo-upload] File Manager rejected the upload", data);
      return fail(502, "We could not store that file. Please try again.");
    }

    // The theme sends this straight back as the ts_logo_upload field value, so a
    // missing URL is a failure even though the upload itself returned 2xx.
    const url = data?.url || data?.defaultHostingUrl;
    if (!url) {
      console.error("[hubspot-logo-upload] upload succeeded but returned no URL", data);
      return fail(502, "We could not store that file. Please try again.");
    }

    return NextResponse.json(
      { success: true, url, id: data?.id ?? null, name: file.name },
      { status: 200, headers: cors }
    );
  } catch (error) {
    console.error("[hubspot-logo-upload] upload failed", error);
    return fail(500, "We could not store that file. Please try again.");
  }
}
