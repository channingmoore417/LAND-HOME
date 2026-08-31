// TEMPORARY — A2P (10DLC) campaign review mode.
//
// GHL's chat-widget A2P checklist requires that NO form collecting a phone
// number exists on any page where the chat widget is embedded. The widget is
// site-wide, so while this flag is true every public lead form hides its
// phone field (name/email capture still works and leads still flow).
//
// >>> Flip to false as soon as the A2P campaign is APPROVED to restore
// >>> phone capture on all lead forms.
export const A2P_REVIEW_MODE = false;
