/**
 * Files into Twenty, for the logo upload on the team forms.
 *
 * The theme uploads a file *before* it submits the form (the submission is JSON and cannot
 * carry it), so the upload happens while no Person exists yet. The flow is therefore split:
 *
 *   1. `twenty-logo-upload` stores the file in Twenty and returns a signed reference
 *   2. the form submits that reference in place of a URL (`ts_logo_upload`)
 *   3. the form handler, once the Person exists, attaches the file to it
 *
 * The file then sits in the Person's Files tab, behind the CRM login, in whatever storage
 * Twenty is configured for. Previously it went to HubSpot File Manager and Twenty held a link
 * that redirected to a HubSpot login page.
 *
 * Upload uses Twenty's createFileUpload -> PUT -> completeFileUpload flow, the same one its own
 * web app uses for attachments (twenty-front useUploadAttachmentFile). The one-call
 * uploadFilesFieldFile mutation exists but is deprecated in v2.43.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { twenty, createOne, TwentyError } from "@/lib/twenty";

export const FILE_REF_PREFIX = "twenty-file:";

/* --------------------------------------------------------------- signed reference */

// Same secret as the confirm links; the "file|" domain prefix keeps the two token kinds from
// ever validating as each other.
const SECRET = () => process.env.CONFIRM_TOKEN_SECRET ?? "";
const mac = (payload: string) =>
  createHmac("sha256", SECRET()).update(`file|${payload}`).digest("base64url");

/**
 * The reference travels through the visitor's browser, so it is signed: without that, anyone
 * could submit another upload's file id and have it attached to their own record.
 */
export function signFileRef(fileId: string, name: string): string {
  const payload = Buffer.from(JSON.stringify({ f: fileId, n: name })).toString("base64url");
  return `${FILE_REF_PREFIX}${payload}.${mac(payload)}`;
}

export function verifyFileRef(ref: string): { fileId: string; name: string } | null {
  if (!ref.startsWith(FILE_REF_PREFIX)) return null;
  const body = ref.slice(FILE_REF_PREFIX.length);
  const dot = body.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = body.slice(0, dot);
  const a = Buffer.from(body.slice(dot + 1));
  const b = Buffer.from(mac(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { f, n } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof f !== "string" || typeof n !== "string") return null;
    return { fileId: f, name: n };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ upload */

async function metadata<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const body = (await twenty("/metadata", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })) as { data?: T; errors?: Array<{ message?: string }> };
  // GraphQL reports failures with a 200 and an `errors` array, which twenty() treats as success.
  if (body.errors?.length || !body.data) {
    const message = body.errors?.map((e) => e.message).join("; ") || "Twenty metadata call failed";
    throw new TwentyError(message, 502, body);
  }
  return body.data;
}

// The attachment object's `file` field. Stable per workspace, so one lookup per warm instance.
let attachmentFileFieldId: string | null = null;

async function getAttachmentFileFieldId(): Promise<string> {
  if (attachmentFileFieldId) return attachmentFileFieldId;
  type Objects = {
    objects: {
      edges: Array<{
        node: {
          nameSingular: string;
          fields: { edges: Array<{ node: { id: string; name: string; type: string } }> };
        };
      }>;
    };
  };
  const data = await metadata<Objects>(
    `query { objects(paging: { first: 200 }) { edges { node { nameSingular
       fields(paging: { first: 200 }) { edges { node { id name type } } } } } } }`,
    {}
  );
  const attachment = data.objects.edges.find((e) => e.node.nameSingular === "attachment");
  const field = attachment?.node.fields.edges.find(
    (e) => e.node.name === "file" && e.node.type === "FILES"
  );
  if (!field) throw new TwentyError("Attachment file field not found in Twenty", 502, null);
  attachmentFileFieldId = field.node.id;
  return attachmentFileFieldId;
}

/** Store a file in Twenty. It is not attached to anything until attachFileToPerson runs. */
export async function uploadFileToTwenty(file: File): Promise<{ fileId: string }> {
  const fieldMetadataId = await getAttachmentFileFieldId();

  const { createFileUpload: target } = await metadata<{
    createFileUpload: { fileId: string; uploadUrl: string; contentType: string };
  }>(
    `mutation($filename: String!, $size: Float!, $fileFolder: FileFolder!, $fieldMetadataId: String) {
       createFileUpload(filename: $filename, size: $size, fileFolder: $fileFolder,
                        fieldMetadataId: $fieldMetadataId) { fileId uploadUrl contentType } }`,
    { filename: file.name, size: file.size, fileFolder: "FilesField", fieldMetadataId }
  );

  // The upload URL carries its own short-lived token; it must not also get the API key.
  const put = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": target.contentType },
    body: file,
  });
  if (!put.ok) {
    throw new TwentyError(`Twenty rejected the file upload (${put.status})`, 502, null);
  }

  await metadata(`mutation($id: String!) { completeFileUpload(fileId: $id) { id } }`, {
    id: target.fileId,
  });

  return { fileId: target.fileId };
}

/** Put an uploaded file in the Person's Files tab. */
export async function attachFileToPerson(personId: string, fileId: string, name: string) {
  return createOne("attachments", {
    name,
    targetPersonId: personId,
    file: [{ fileId, label: name }],
  });
}
