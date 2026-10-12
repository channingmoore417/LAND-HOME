"use client";

import { propertyPayload, type PropertyInfo } from "@/lib/propertyInfo";
import HiddenField from "@/components/HiddenField";
import { useAttribution } from "@/components/useAttribution";

// Off-screen, NAMED inputs for forms that capture a property inquiry. GoHighLevel's
// tracking script reads every named field of a submitted <form>, so these put the
// inquiry type, address, listing URL and home details into the contact's
// activity feed alongside name / email / phone.
export default function PropertyFields({ p, inquiry }: { p: PropertyInfo | null; inquiry: string }) {
  const attr = useAttribution(); // gclid, utm_*, landing_page, ... so GHL gets them too
  const attrFields = Object.entries(attr).filter(([, v]) => v !== "");
  if (!p) {
    return (<>
      <HiddenField name="inquiry_type" value={inquiry} />
      {attrFields.map(([n, v]) => <HiddenField key={n} name={n} value={v} />)}
    </>);
  }
  return (
    <>
      <HiddenField name="inquiry_type" value={inquiry} />
      {Object.entries(propertyPayload(p)).map(([n, v]) => (
        <HiddenField key={n} name={n} value={String(v)} />
      ))}
      {attrFields.map(([n, v]) => <HiddenField key={n} name={n} value={v} />)}
    </>
  );
}
