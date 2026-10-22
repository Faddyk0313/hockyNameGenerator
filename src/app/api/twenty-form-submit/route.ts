/**
 * Team Discount Form -> Twenty.
 *
 * Phase 1's handler now lives in `src/lib/relay.ts`; this route is its configuration.
 * The path keeps its Phase 1 name because the live theme section already points at it.
 *
 * Same payload shape as `hubspot-form-submit` -- `contact` and `company` keyed by HubSpot
 * property names -- so a section moves between the two by changing `submit_endpoint` alone.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { DISCOUNT_PERSON_FIELDS, DISCOUNT_COMPANY_FIELDS } from "@/lib/twenty-field-map";
import { DISCOUNT_NOTIFICATION_FIELDS } from "@/lib/intake-notification-fields";
import { DISCOUNT_RECIPIENTS } from "@/lib/intake-notification-recipients";
import {
  CONFIRMATION_SUBJECT,
  confirmationEmailHtml,
  confirmationEmailText,
} from "@/lib/discount-confirmation-email";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Team Discount Form",
  personFields: DISCOUNT_PERSON_FIELDS,
  companyFields: DISCOUNT_COMPANY_FIELDS,
  /** Mirrors HubSpot's legalBasis + legalBasisExplanation on subscription 2615227543. */
  consentBasis: "LEGITIMATE_INTEREST_PQL: Contact submitted Team Discount",
  confirmation: {
    subject: CONFIRMATION_SUBJECT,
    replyTo: "TeamSales@titanbattlegear.com",
    html: confirmationEmailHtml,
    text: confirmationEmailText,
  },
  notification: {
    to: DISCOUNT_RECIPIENTS,
    fields: DISCOUNT_NOTIFICATION_FIELDS,
  },
});
