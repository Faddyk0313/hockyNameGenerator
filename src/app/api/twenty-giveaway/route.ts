/**
 * Titan Moments Giveaway -> Twenty.
 *
 * Consumer entry form, same shape as Photo Submission plus `titan_moment` (the giveaway
 * category). Like Photo Submission it asks for a Team Name, which becomes the Company.
 *
 * `titan_moment` is a live HubSpot contact property; its four options are re-keyed to
 * UPPER_SNAKE in twenty-field-map.ts.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { GIVEAWAY_PERSON_FIELDS, SUBMISSION_COMPANY_FIELDS } from "@/lib/twenty-field-map";
import { GIVEAWAY_NOTIFICATION_FIELDS } from "@/lib/intake-notification-fields";
import { CONSUMER_RECIPIENTS, CONSUMER_UNRESOLVED } from "@/lib/intake-notification-recipients";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Titan Moments Giveaway",
  personFields: GIVEAWAY_PERSON_FIELDS,
  companyFields: SUBMISSION_COMPANY_FIELDS,
  // HubSpot: legalConsentOptions = none, and no subscription workflow enrolls on this form.
  // The form's own consent_checkbox is a media release, stored as tsMediaReleaseConsent --
  // it is not a marketing opt-in.
  consentBasis: null,
  confirmation: null,
  notification: {
    to: CONSUMER_RECIPIENTS,
    fields: GIVEAWAY_NOTIFICATION_FIELDS,
    unresolvedRecipients: CONSUMER_UNRESOLVED,
  },
});
