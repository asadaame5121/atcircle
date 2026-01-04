import { validate as _validate } from "../../../../lexicons";
import { is$typed as _is$typed } from "../../../../util";

const is$typed = _is$typed,
    validate = _validate;
const id = "tools.ozone.report.defs";

export type ReasonType =
    | "tools.ozone.report.defs#reasonAppeal"
    | "tools.ozone.report.defs#reasonOther"
    | "tools.ozone.report.defs#reasonViolenceAnimal"
    | "tools.ozone.report.defs#reasonViolenceThreats"
    | "tools.ozone.report.defs#reasonViolenceGraphicContent"
    | "tools.ozone.report.defs#reasonViolenceGlorification"
    | "tools.ozone.report.defs#reasonViolenceExtremistContent"
    | "tools.ozone.report.defs#reasonViolenceTrafficking"
    | "tools.ozone.report.defs#reasonViolenceOther"
    | "tools.ozone.report.defs#reasonSexualAbuseContent"
    | "tools.ozone.report.defs#reasonSexualNCII"
    | "tools.ozone.report.defs#reasonSexualDeepfake"
    | "tools.ozone.report.defs#reasonSexualAnimal"
    | "tools.ozone.report.defs#reasonSexualUnlabeled"
    | "tools.ozone.report.defs#reasonSexualOther"
    | "tools.ozone.report.defs#reasonChildSafetyCSAM"
    | "tools.ozone.report.defs#reasonChildSafetyGroom"
    | "tools.ozone.report.defs#reasonChildSafetyPrivacy"
    | "tools.ozone.report.defs#reasonChildSafetyHarassment"
    | "tools.ozone.report.defs#reasonChildSafetyOther"
    | "tools.ozone.report.defs#reasonHarassmentTroll"
    | "tools.ozone.report.defs#reasonHarassmentTargeted"
    | "tools.ozone.report.defs#reasonHarassmentHateSpeech"
    | "tools.ozone.report.defs#reasonHarassmentDoxxing"
    | "tools.ozone.report.defs#reasonHarassmentOther"
    | "tools.ozone.report.defs#reasonMisleadingBot"
    | "tools.ozone.report.defs#reasonMisleadingImpersonation"
    | "tools.ozone.report.defs#reasonMisleadingSpam"
    | "tools.ozone.report.defs#reasonMisleadingScam"
    | "tools.ozone.report.defs#reasonMisleadingElections"
    | "tools.ozone.report.defs#reasonMisleadingOther"
    | "tools.ozone.report.defs#reasonRuleSiteSecurity"
    | "tools.ozone.report.defs#reasonRuleProhibitedSales"
    | "tools.ozone.report.defs#reasonRuleBanEvasion"
    | "tools.ozone.report.defs#reasonRuleOther"
    | "tools.ozone.report.defs#reasonSelfHarmContent"
    | "tools.ozone.report.defs#reasonSelfHarmED"
    | "tools.ozone.report.defs#reasonSelfHarmStunts"
    | "tools.ozone.report.defs#reasonSelfHarmSubstances"
    | "tools.ozone.report.defs#reasonSelfHarmOther"
    | (string & {});

/** An issue not included in these options */
export const REASONOTHER = `${id}#reasonOther`;
/** Appeal a previously taken moderation action */
export const REASONAPPEAL = `${id}#reasonAppeal`;
/** Other */
export const REASONRULEOTHER = `${id}#reasonRuleOther`;
/** Eating disorders */
export const REASONSELFHARMED = `${id}#reasonSelfHarmED`;
/** Non-consensual intimate imagery */
export const REASONSEXUALNCII = `${id}#reasonSexualNCII`;
/** Other sexual violence content */
export const REASONSEXUALOTHER = `${id}#reasonSexualOther`;
/** Animal sexual abuse */
export const REASONSEXUALANIMAL = `${id}#reasonSexualAnimal`;
/** Fake account or bot */
export const REASONMISLEADINGBOT = `${id}#reasonMisleadingBot`;
/** Other dangerous content */
export const REASONSELFHARMOTHER = `${id}#reasonSelfHarmOther`;
/** Other violent content */
export const REASONVIOLENCEOTHER = `${id}#reasonViolenceOther`;
/** Scam */
export const REASONMISLEADINGSCAM = `${id}#reasonMisleadingScam`;
/** Spam */
export const REASONMISLEADINGSPAM = `${id}#reasonMisleadingSpam`;
/** Banned user returning */
export const REASONRULEBANEVASION = `${id}#reasonRuleBanEvasion`;
/** Dangerous challenges or activities */
export const REASONSELFHARMSTUNTS = `${id}#reasonSelfHarmStunts`;
/** Deepfake adult content */
export const REASONSEXUALDEEPFAKE = `${id}#reasonSexualDeepfake`;
/** Animal welfare violations */
export const REASONVIOLENCEANIMAL = `${id}#reasonViolenceAnimal`;
/** Child sexual abuse material (CSAM). These reports will be sent only be sent to the application's Moderation Authority. */
export const REASONCHILDSAFETYCSAM = `${id}#reasonChildSafetyCSAM`;
/** Other harassing or hateful content */
export const REASONHARASSMENTOTHER = `${id}#reasonHarassmentOther`;
/** Trolling */
export const REASONHARASSMENTTROLL = `${id}#reasonHarassmentTroll`;
/** Other misleading content */
export const REASONMISLEADINGOTHER = `${id}#reasonMisleadingOther`;
/** Content promoting or depicting self-harm */
export const REASONSELFHARMCONTENT = `${id}#reasonSelfHarmContent`;
/** Unlabelled adult content */
export const REASONSEXUALUNLABELED = `${id}#reasonSexualUnlabeled`;
/** Threats or incitement */
export const REASONVIOLENCETHREATS = `${id}#reasonViolenceThreats`;
/** Grooming or predatory behavior. These reports will be sent only be sent to the application's Moderation Authority. */
export const REASONCHILDSAFETYGROOM = `${id}#reasonChildSafetyGroom`;
/** Other child safety. These reports will be sent only be sent to the application's Moderation Authority. */
export const REASONCHILDSAFETYOTHER = `${id}#reasonChildSafetyOther`;
/** Hacking or system attacks */
export const REASONRULESITESECURITY = `${id}#reasonRuleSiteSecurity`;
/** Doxxing */
export const REASONHARASSMENTDOXXING = `${id}#reasonHarassmentDoxxing`;
/** Privacy violation involving a minor */
export const REASONCHILDSAFETYPRIVACY = `${id}#reasonChildSafetyPrivacy`;
/** Targeted harassment */
export const REASONHARASSMENTTARGETED = `${id}#reasonHarassmentTargeted`;
/** Dangerous substances or drug abuse */
export const REASONSELFHARMSUBSTANCES = `${id}#reasonSelfHarmSubstances`;
/** Adult sexual abuse content */
export const REASONSEXUALABUSECONTENT = `${id}#reasonSexualAbuseContent`;
/** False information about elections */
export const REASONMISLEADINGELECTIONS = `${id}#reasonMisleadingElections`;
/** Promoting or selling prohibited items or services */
export const REASONRULEPROHIBITEDSALES = `${id}#reasonRuleProhibitedSales`;
/** Human trafficking */
export const REASONVIOLENCETRAFFICKING = `${id}#reasonViolenceTrafficking`;
/** Hate speech */
export const REASONHARASSMENTHATESPEECH = `${id}#reasonHarassmentHateSpeech`;
/** Harassment or bullying of minors */
export const REASONCHILDSAFETYHARASSMENT = `${id}#reasonChildSafetyHarassment`;
/** Glorification of violence */
export const REASONVIOLENCEGLORIFICATION = `${id}#reasonViolenceGlorification`;
/** Graphic violent content */
export const REASONVIOLENCEGRAPHICCONTENT = `${id}#reasonViolenceGraphicContent`;
/** Impersonation */
export const REASONMISLEADINGIMPERSONATION = `${id}#reasonMisleadingImpersonation`;
/** Extremist content. These reports will be sent only be sent to the application's Moderation Authority. */
export const REASONVIOLENCEEXTREMISTCONTENT = `${id}#reasonViolenceExtremistContent`;
