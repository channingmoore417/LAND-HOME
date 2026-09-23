import Link from "next/link";
import { site } from "@/config/site";
import { OpenListingAlertsButton } from "@/components/ListingAlertsQuiz";

// Sticky Call / Text / New Listings bar on phones (city pages + blog posts).
// Seller pages swap New Listings for Home Value.
export default function MobileActionBar({ seller = false }: { seller?: boolean }) {
  const sms = site.phoneHref.replace("tel:", "sms:");
  return (
    <div className="mactbar" role="navigation" aria-label="Quick actions">
      <a className="mactbar__b" href={site.phoneHref}>Call</a>
      <a className="mactbar__b" href={sms}>Text</a>
      {seller ? (
        <Link className="mactbar__b mactbar__b--hi" href="/home-value">Home Value</Link>
      ) : (
        <OpenListingAlertsButton className="mactbar__b mactbar__b--hi">New Listings</OpenListingAlertsButton>
      )}
    </div>
  );
}
