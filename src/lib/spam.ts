// Anti-spam signal shared by every form that posts to /api/forms.
//
// Captured when the client bundle first evaluates, which is effectively page
// load. /api/forms rejects any submission completed faster than a human could
// fill a form, and (as of the same change) any submission missing this signal
// entirely — so a bot POSTing JSON straight at the endpoint is dropped too.
export const pageLoadedAt = Date.now();
