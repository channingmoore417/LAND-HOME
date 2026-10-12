// A named field the visitor never sees, for GoHighLevel's form capture.
// GHL's tracker skips <input type="hidden">, so these are real text inputs that
// are moved off-screen and made read-only, unfocusable and invisible to screen
// readers instead. (readOnly also keeps browser autofill out of them.)
export default function HiddenField({ name, value }: { name: string; value: string | number }) {
  return (
    <input
      type="text"
      name={name}
      value={String(value)}
      readOnly
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
    />
  );
}
