/**
 * "Email capture from 3d config" -> Twenty.
 *
 * The lead gate in the 3D configurator (titan-3d-product-configurator.vercel.app), shown
 * before a design PDF/PNG download. HubSpot form e3e69038.
 *
 * The simplest route in the relay, because the form is the simplest in the portal:
 * three fields, no company, `legalConsentOptions: none`, `notifyRecipients: null`, and no
 * enabled workflow enrolls on its GUID -- checked against all 25. So no consent record, no
 * notification and no confirmation: adding any would be new behaviour, not a migration.
 *
 * `createNewContactForNewEmail` is false on this form, which matches the relay's upsert:
 * a returning visitor updates their Person rather than creating a second one.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { CONFIG_3D_PERSON_FIELDS } from "@/lib/twenty-field-map";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "3D Configurator Download",
  personFields: CONFIG_3D_PERSON_FIELDS,
  consentBasis: null,
  confirmation: null,
  notification: null,
});
