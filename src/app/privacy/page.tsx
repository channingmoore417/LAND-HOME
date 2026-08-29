import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { SITE_URL as SITE } from "@/lib/seoConfig";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses, and protects your personal information — including our SMS/text messaging privacy practices.`,
  alternates: { canonical: `${SITE}/privacy` },
};

const EFFECTIVE_DATE = "August 29, 2026";

export default function PrivacyPage() {
  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Privacy Policy
          </nav>
          <h1>Privacy Policy</h1>
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
              {site.name} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), brokered by {site.brokerage}, respects your
              privacy. This Privacy Policy explains what information we collect through this website,
              how we use it, and the choices you have. By using this site, you agree to the practices
              described here.
            </p>

            <h2 className="section__title">Information we collect</h2>
            <p>We collect information you provide directly to us, including when you:</p>
            <ul>
              <li>Submit a contact, showing request, home valuation, or pre-approval form;</li>
              <li>Register for an account to save searches or favorite listings;</li>
              <li>Communicate with us by phone, text message, email, or website chat;</li>
              <li>Subscribe to listing alerts or market updates.</li>
            </ul>
            <p>
              This information may include your name, email address, phone number, mailing address,
              property preferences, and any other details you choose to share. We also automatically
              collect standard technical data (such as IP address, browser type, pages visited, and
              referring URLs) through cookies and similar technologies to operate and improve the site.
            </p>

            <h2 className="section__title">How we use your information</h2>
            <ul>
              <li>To respond to your inquiries and provide real estate services;</li>
              <li>To schedule showings and communicate about properties you are interested in;</li>
              <li>To send listing alerts, saved-search updates, and market information you request;</li>
              <li>To connect you, with your consent, with our preferred lending partner;</li>
              <li>To operate, maintain, and improve our website and services;</li>
              <li>To comply with legal, regulatory, and MLS obligations.</li>
            </ul>

            <h2 className="section__title">SMS / text messaging privacy</h2>
            <p>
              If you opt in to receive text messages from {site.name}, we use your phone number solely
              to communicate with you about real estate matters as described in our{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
            <p>
              <strong>
                No mobile information will be shared with third parties or affiliates for marketing or
                promotional purposes. All other categories of sharing described in this policy exclude
                text messaging originator opt-in data and consent; this information will not be shared
                with, or sold to, any third parties.
              </strong>
            </p>
            <p>
              You can opt out of text messages at any time by replying <strong>STOP</strong> to any
              message. Reply <strong>HELP</strong> for assistance, or contact us at{" "}
              <a href={site.phoneHref}>{site.phone}</a>.
            </p>

            <h2 className="section__title">How we share information</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul>
              <li>
                <strong>Service providers</strong> who help us operate the website and our business
                (such as hosting, CRM, and analytics providers), under obligations to protect your data;
              </li>
              <li>
                <strong>Our brokerage and lending partners</strong>, only as needed to provide services
                you have requested;
              </li>
              <li>
                <strong>Legal authorities</strong>, when required by law or to protect our rights.
              </li>
            </ul>
            <p>
              As stated above, text messaging opt-in data and consent are never shared with or sold to
              third parties under any circumstances.
            </p>

            <h2 className="section__title">Cookies and analytics</h2>
            <p>
              We use cookies and similar technologies for site functionality (such as keeping you
              logged in and remembering saved searches) and to understand how visitors use the site.
              You can control cookies through your browser settings; disabling them may limit some
              features.
            </p>

            <h2 className="section__title">Data retention and security</h2>
            <p>
              We retain personal information for as long as needed to provide services, comply with
              legal obligations, and resolve disputes. We use commercially reasonable safeguards to
              protect your information, though no method of transmission or storage is completely
              secure.
            </p>

            <h2 className="section__title">Your choices</h2>
            <ul>
              <li>Opt out of text messages anytime by replying STOP;</li>
              <li>Unsubscribe from marketing emails using the link in any email;</li>
              <li>
                Request access to, correction of, or deletion of your personal information by
                contacting us at <a href={site.phoneHref}>{site.phone}</a> or through our{" "}
                <Link href="/contact">contact page</Link>.
              </li>
            </ul>

            <h2 className="section__title">Children&apos;s privacy</h2>
            <p>
              This website is not directed to children under 13, and we do not knowingly collect
              personal information from them.
            </p>

            <h2 className="section__title">Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The current version, with its
              effective date, will always be posted on this page.
            </p>

            <h2 className="section__title">Contact us</h2>
            <p>
              The Land and Home Group, LLC (&quot;{site.name}&quot;) · Brokered by {site.brokerage}
              <br />
              {site.serviceArea}
              <br />
              Phone: <a href={site.phoneHref}>{site.phone}</a>
              <br />
              Email: <a href={site.emailHref}>{site.email}</a>
              <br />
              Web: <Link href="/contact">{SITE.replace("https://", "")}/contact</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
