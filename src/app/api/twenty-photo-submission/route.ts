/**
 * Photo Submission -> Twenty.
 *
 * A consumer form, not a B2B intake: no organization, so no company fields and no company
 * upsert. The photo itself arrives as a URL from `/api/hubspot-logo-upload`.
 *
 * `customer_tag` still defaults to "B2B" in the shared handler; the form overrides it to
 * "B2C" via a hidden field so the CRM does not mislabel consumer submitters.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { PHOTO_PERSON_FIELDS } from "@/lib/twenty-field-map";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Photo Submission",
  personFields: PHOTO_PERSON_FIELDS,
  consentBasis: "LEGITIMATE_INTEREST_PQL: Contact submitted a photo",
  confirmation: null,
});
