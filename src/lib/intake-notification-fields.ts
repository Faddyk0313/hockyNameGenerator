/**
 * Field order and labels for the internal notification email, one list per form.
 *
 * Generated from the live HubSpot form definitions (`/marketing/v3/forms/{guid}`) so the
 * email lists the fields in the same order and under the same labels as the form itself.
 * Labels are kept exactly as HubSpot stores them, HTML entities and all -- the renderer
 * decodes them. Do not tidy the wording here; it is what the sales team reads today.
 *
 * Names are HubSpot property names, matching the keys the theme submits, so a row is
 * resolved straight from the request payload rather than from the Twenty record. That
 * keeps the email truthful about what was submitted even when a field is dropped on the
 * way into Twenty (an unmapped property, or a dropdown option Twenty rejects).
 *
 * GUIDs, for re-generating when a form changes:
 *   Team Discount      7d807dfc-0b9f-4c9c-b2c2-b922f297063c
 *   Team Custom Sales  d7bcd3f3-9615-4cde-a94c-0ca255d083ff
 *   Giveaway           6fc1645b-d17b-483e-9b99-7644fff3c0ab
 *   Photo Submission   cb8fdecb-e75a-4011-8bf7-f4c87cd23fed
 */

export type NotificationField = { name: string; label: string };

export const DISCOUNT_NOTIFICATION_FIELDS: NotificationField[] = [
  { name: "ts_intake_source", label: "Intake source" },
  { name: "firstname", label: "First Name" },
  { name: "lastname", label: "Last Name" },
  { name: "email", label: "Email" },
  { name: "mobilephone", label: "Mobile Phone Number" },
  { name: "ts_organization_role", label: "What’s your role with the team/organization?" },
  { name: "ts_team_sales_persona", label: "What best describes your role in team purchasing?" },
  { name: "ts_custom_interest", label: "Are you also interested in Custom Cut-Resistant Baselayers for your team?" },
  { name: "name", label: "Team Name" },
  { name: "ts_company_org_type", label: "Team Level" },
  { name: "city", label: "City" },
  { name: "state", label: "State/Region" },
  { name: "website", label: "Team Website" },
  { name: "ts_dm_known", label: "Do you know who makes purchasing decisions for your team or organization?" },
  { name: "ts_referred_dm_role", label: "What is their role in the organization?" },
  { name: "ts_referred_dm_name", label: "First Name" },
  { name: "ts_referred_dm_last_name", label: "Last Name" },
  { name: "ts_referred_dm_email", label: "Email" },
  { name: "ts_referred_dm_phone", label: "Mobile Phone Number" },
  { name: "ts_dm_intro_permission", label: "Would you be willing to introduce us via email?" },
  { name: "ts_desired_delivery_date", label: "Target Delivery Date" },
  { name: "ts_lead_ordering_method", label: "Preferred Ordering Method" },
  { name: "ts_lead_source", label: "Team Sales Lead Source" },
  { name: "ts_is_decision_maker", label: "Is Decision Maker?" },
  { name: "ts_team_discount_start", label: "Preferred Discount Start Date" },
  { name: "ts_discount_distribution_method", label: "Discount Distribution Method" },
];

export const TEAM_SALES_NOTIFICATION_FIELDS: NotificationField[] = [
  { name: "ts_intake_source", label: "Intake sourceField" },
  { name: "firstname", label: "First Name" },
  { name: "lastname", label: "Last Name" },
  { name: "email", label: "Email" },
  { name: "mobilephone", label: "Mobile Phone Number" },
  { name: "ts_organization_role", label: "What’s your role with the team/organization?" },
  { name: "ts_team_sales_persona", label: "What best describes your role in team purchasing?" },
  { name: "name", label: "Team Name" },
  { name: "ts_company_org_type", label: "Team Level" },
  { name: "ts_num_of_teams", label: "How many teams are in your organization?" },
  { name: "city", label: "City" },
  { name: "state", label: "State/Region" },
  { name: "website", label: "Team Website" },
  { name: "ts_dm_known", label: "Do you know who makes purchasing decisions for your team or organization?" },
  { name: "ts_referred_dm_role", label: "What is their role in the organization?" },
  { name: "ts_referred_dm_name", label: "First Name" },
  { name: "ts_referred_dm_last_name", label: "Last Name" },
  { name: "ts_referred_dm_phone", label: "Mobile Phone Number" },
  { name: "ts_referred_dm_email", label: "Email" },
  { name: "ts_dm_intro_permission", label: "Would you be willing to introduce us via email?" },
  { name: "ts_logo_authorization", label: "Do you have authorization rights to distribute your Team or Organization logo?" },
  { name: "logo_referral", label: "If someone else approves logo usage, please share their email (if known)" },
  { name: "ts_logo_upload", label: "Team Logo Upload" },
  { name: "ts_desired_delivery_date", label: "Target Delivery Date" },
  { name: "ts_lead_ordering_method", label: "Preferred Ordering Method" },
  { name: "ts_lead_source", label: "Team Sales Lead Source" },
  { name: "ts_is_decision_maker", label: "Is Decision Maker?" },
];

export const GIVEAWAY_NOTIFICATION_FIELDS: NotificationField[] = [
  { name: "firstname", label: "First Name" },
  { name: "lastname", label: "Last Name" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone Number" },
  { name: "titan_moment", label: "Titan Moment" },
  { name: "company", label: "Team Name" },
  { name: "date_of_event", label: "Event Date" },
  { name: "location_of_event", label: "Event Location" },
  { name: "upload_images", label: "Upload Highlight Reel/Video" },
  { name: "social_media_handles", label: "Social Media Handles" },
  { name: "consent_checkbox", label: "Media &amp; Story Release" },
];

export const PHOTO_NOTIFICATION_FIELDS: NotificationField[] = [
  { name: "firstname", label: "First Name" },
  { name: "lastname", label: "Last Name" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone Number" },
  { name: "company", label: "Team Name" },
  { name: "event_name_single_line", label: "Event Name" },
  { name: "date_of_event", label: "Event Date" },
  { name: "location_of_event", label: "Event Location" },
  { name: "your_story", label: "Details about your Together We Conquer moment" },
  { name: "upload_images", label: "Upload Images" },
  { name: "social_media_handles", label: "Social Media Handles" },
  { name: "consent_checkbox", label: "Photo &amp; Story Release" },
];

