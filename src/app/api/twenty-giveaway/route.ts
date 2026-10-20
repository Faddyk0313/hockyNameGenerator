/**
 * Titan Moments Giveaway -> Twenty.
 *
 * Consumer entry form, same shape as Photo Submission plus `titan_moment` (the giveaway
 * category) and an explicit entry consent. No company.
 *
 * `titan_moment` is a live HubSpot contact property; its four options are re-keyed to
 * UPPER_SNAKE in twenty-field-map.ts.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { GIVEAWAY_PERSON_FIELDS } from "@/lib/twenty-field-map";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Titan Moments Giveaway",
  personFields: GIVEAWAY_PERSON_FIELDS,
  consentBasis: "CONSENT_WITH_NOTICE: Contact entered the Titan Moments Giveaway",
  confirmation: null,
});
