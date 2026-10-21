/**
 * Photo Submission -> Twenty.
 *
 * A consumer form, but it does ask for a Team Name, which becomes the Company. The photo
 * arrives as a URL: the theme uploads to `/api/hubspot-logo-upload` and submits the link.
 *
 * `customer_tag` still defaults to "B2B" in the shared handler; the form overrides it to
 * "B2C" via a hidden field so the CRM does not mislabel consumer submitters.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { PHOTO_PERSON_FIELDS, SUBMISSION_COMPANY_FIELDS } from "@/lib/twenty-field-map";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Photo Submission",
  personFields: PHOTO_PERSON_FIELDS,
  companyFields: SUBMISSION_COMPANY_FIELDS,
  // HubSpot: legalConsentOptions = none, and no subscription workflow enrolls on this form.
  // Recording a marketing opt-in here would invent consent the submitter never gave.
  consentBasis: null,
  confirmation: null,
});
