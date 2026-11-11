import { NextResponse } from "next/server";
import { TwentyError } from "@/lib/twenty";
import { signFileRef, uploadFileToTwenty } from "@/lib/twenty-files";

/**
 * Logo upload for the team forms, into Twenty instead of HubSpot File Manager.
 *
 * Drop-in for `/api/hubspot-logo-upload`: same request (multipart `file`), same response shape
 * (`{ success, url }`), so the theme switches by changing the section's "Logo upload endpoint"
 * setting alone. The difference is what `url` holds: a signed `twenty-file:` reference, not a
 * link. The theme submits it as `ts_logo_upload`; the form handler (src/lib/relay.ts) verifies
 * it and attaches the file to the Person once the Person exists. See src/lib/twenty-files.ts.
 *
 * Limits and origins are deliberately identical to hubspot-logo-upload, which retires once no
 * section points at it.
 */

// Vercel Hobby caps serverless request bodies at ~4.5MB. Must match MAX_UPLOAD_BYTES in the
// theme's assets/hubspot-form.js.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "ai", "eps"];

const ALLOWED_ORIGINS = [
  "https://www.titanbattlegear.com",
  "https://titanbattlegear.com",
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
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
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

  if (!file || typeof file.size !== "number") return fail(400, "No file was provided.");
  if (file.size === 0) return fail(400, "That file appears to be empty.");
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

  if (!process.env.TWENTY_SERVER_URL || !process.env.TWENTY_API_KEY || !process.env.CONFIRM_TOKEN_SECRET) {
    console.error("[twenty-logo-upload] TWENTY_SERVER_URL, TWENTY_API_KEY or CONFIRM_TOKEN_SECRET is not set");
    return fail(500, "Upload is not configured.");
  }

  try {
    const { fileId } = await uploadFileToTwenty(file);
    return NextResponse.json(
      { success: true, url: signFileRef(fileId, file.name), name: file.name },
      { status: 200, headers: cors }
    );
  } catch (error) {
    const e = error as TwentyError;
    console.error("[twenty-logo-upload] upload failed", e.status, e.message, JSON.stringify(e.body ?? null));
    return fail(502, "We could not store that file. Please try again.");
  }
}
