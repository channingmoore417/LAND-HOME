import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { SITE_URL as SITE } from "@/lib/seoConfig";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for the ${site.name} website, including our SMS/text messaging program terms.`,
  alternates: { canonical: `${SITE}/terms` },
};

const EFFECTIVE_DATE = "August 29, 2026";

export default function TermsPage() {
  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Terms of Service
          </nav>
          <h1>Terms of Service</h1>
          <p className="hero__sub">Effective date: {EFFECTIVE_DATE}</p>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <section className="seo-body">
        <div className="wrap">
          <div className="prose">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of the {site.name} website and
              services. {site.name} is brokered by {site.brokerage}. By using this website, submitting
              a form, or opting in to our communications, you agree to these Terms and to our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2 className="section__title">SMS / text messaging terms</h2>
            <p>
              By providing your phone number and opting in — through a form on this website, our
              website chat, or by texting us — you consent to receive text messages from {site.name}{" "}
              regarding real estate matters, including responses to your inquiries, showing
              scheduling, listing alerts, and related updates.
            </p>
            <ul>
              <li>
                <strong>Consent is not a condition of purchase</strong> of any property, good, or
                service.
              </li>
              <li>
                <strong>Message frequency varies</strong> based on your activity and preferences.
              </li>
              <li>
                <strong>Message and data rates may apply.</strong> Charges are billed by your mobile
                carrier.
              </li>
              <li>
                <strong>Opt out anytime</strong> by replying <strong>STOP</strong> to any message. You
                will receive a final confirmation message, after which no further messages will be
                sent unless you opt back in.
              </li>
              <li>
                <strong>Need help?</strong> Reply <strong>HELP</strong> to any message, call us at{" "}
                <a href={site.phoneHref}>{site.phone}</a>, or use our{" "}
                <Link href="/contact">contact page</Link>.
              </li>
              <li>
                Carriers are not liable for delayed or undelivered messages.
              </li>
              <li>
                Your mobile opt-in data will never be shared with or sold to third parties for
                marketing or promotional purposes. See our{" "}
                <Link href="/privacy">Privacy Policy</Link> for details.
              </li>
            </ul>

            <h2 className="section__title">Use of the website</h2>
            <p>
              You may use this website for personal, non-commercial purposes related to buying or
              selling real estate. You agree not to misuse the site, scrape or republish listing data,
              interfere with its operation, or use it for any unlawful purpose.
            </p>

            <h2 className="section__title">Listing information</h2>
            <p>
              Listing data on this site is provided through the Internet Data Exchange (IDX) program
              of the Southwest Louisiana Association of REALTORS®. Information is deemed reliable but
              not guaranteed and should be independently verified. Listings held by brokerages other
              than {site.name} are identified with the name of the listing broker. All properties are
              subject to prior sale, change, or withdrawal.
            </p>

            <h2 className="section__title">No professional advice</h2>
            <p>
              Content on this website — including market commentary, mortgage calculators, and
              affordability estimates — is for informational purposes only and does not constitute
              legal, financial, tax, or lending advice, nor a commitment to lend. Consult qualified
              professionals for advice specific to your situation.
            </p>

            <h2 className="section__title">Accounts</h2>
            <p>
              If you register for an account, you are responsible for the accuracy of the information
              you provide and for activity under your account. We may suspend or terminate accounts
              that violate these Terms.
            </p>

            <h2 className="section__title">Intellectual property</h2>
            <p>
              The website&apos;s design, branding, and original content are the property of{" "}
              {site.name} or its licensors and may not be reproduced without permission. MLS listing
              content is the property of its respective owners.
            </p>

            <h2 className="section__title">Disclaimer and limitation of liability</h2>
            <p>
              This website is provided &quot;as is&quot; without warranties of any kind. To the
              fullest extent permitted by law, {site.name} and {site.brokerage} are not liable for any
              indirect, incidental, or consequential damages arising from your use of the site or
              reliance on its content.
            </p>

            <h2 className="section__title">Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the website after changes
              are posted constitutes acceptance of the updated Terms.
            </p>

            <h2 className="section__title">Contact us</h2>
            <p>
              The Land and Home Group, LLC (&quot;{site.name}&quot;) · Brokered by {site.brokerage}
              <br />
              {site.serviceArea}
              <br />
              Phone: <a href={site.phoneHref}>{site.phone}</a>
              <br />
              Web: <Link href="/contact">{SITE.replace("https://", "")}/contact</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
