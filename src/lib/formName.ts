// Forms collect first and last name separately (a single "full name" box is
// hard to parse — middle names, suffixes, double-barrel surnames). This turns
// the two inputs into the payload fields /api/forms expects: `name` (joined,
// for display / legacy columns) plus `first_name` / `last_name` (for CRMs).
export function namePayload(f: FormData) {
  const first_name = String(f.get("first_name") ?? "").trim();
  const last_name = String(f.get("last_name") ?? "").trim();
  return { name: `${first_name} ${last_name}`.trim(), first_name, last_name };
}
