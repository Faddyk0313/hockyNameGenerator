/**
 * Who each form notifies, resolved from HubSpot's `configuration.notifyRecipients`.
 *
 * HubSpot stores user ids, not addresses. These were resolved against `/crm/v3/owners/`
 * (active and archived) on 2026-10-21:
 *
 *   84793983  acollins@titanbattlegear.com   Adam Collins
 *   68320423  andries@titanbattlegear.com    Andries de Villiers
 *   69589253  fahd@titanbattlegear.com       Fahd Khan
 *   68320474  -- matches no active or archived owner --
 *
 * 68320474 is listed on both consumer forms and resolves to nothing, so somebody who used
 * to be notified no longer is. It is carried in `unresolved` rather than dropped, so the
 * email itself says a recipient is missing instead of the gap going unnoticed.
 *
 * All four forms also set notifyContactOwner (Discount does not). That adds the contact's
 * owner, which has no effect here: the relay assigns no owner, and round-robin assignment
 * across team 77946091 is still unreplicated.
 */

const ADAM = "acollins@titanbattlegear.com";
const ANDRIES = "andries@titanbattlegear.com";
const FAHD = "fahd@titanbattlegear.com";

/** Team Discount Form, 7d807dfc. notifyContactOwner: false. */
export const DISCOUNT_RECIPIENTS = [ADAM, ANDRIES];

/** Team Custom Sales Form, d7bcd3f3. notifyContactOwner: true. */
export const TEAM_SALES_RECIPIENTS = [ADAM, ANDRIES];

/** Titan Moments Giveaway, 6fc1645b, and Photo Submission, cb8fdecb. */
export const CONSUMER_RECIPIENTS = [ANDRIES, FAHD];

/** Listed on both consumer forms; no longer a resolvable user. */
export const CONSUMER_UNRESOLVED = ["68320474"];
