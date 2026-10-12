import type { PropertyInfo } from "@/lib/propertyInfo";
import HiddenField from "@/components/HiddenField";

// Off-screen, NAMED inputs for forms that capture a property inquiry. GoHighLevel's
// tracking script reads every named field of a submitted <form>, so these put the
// inquiry type, address, listing URL and home details into the contact's
// activity feed alongside name / email / phone.
export default function PropertyFields({ p, inquiry }: { p: PropertyInfo | null; inquiry: string }) {
  if (!p) return <HiddenField name="inquiry_type" value={inquiry} />;
  const f: [string, string | number | null][] = [
    ["inquiry_type", inquiry],
    ["property_address", p.address],
    ["property_url", p.url],
    ["property_price", p.price],
    ["property_bedrooms", p.beds],
    ["property_bathrooms", p.baths],
    ["property_sqft", p.sqft],
    ["property_mls", p.mls],
    ["listing_key", p.key],
  ];
  return (
    <>
      {f.filter(([, v]) => v != null && v !== "").map(([n, v]) => (
        <HiddenField key={n} name={n} value={String(v)} />
      ))}
    </>
  );
}
