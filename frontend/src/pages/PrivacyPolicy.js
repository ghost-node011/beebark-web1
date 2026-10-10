import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/auth/AuthShell';

const LAST_UPDATED = 'June 25, 2026';
const CONTACT_EMAIL = 'info@thebeebark.com';

const Section = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="text-xl font-bold text-black">{title}</h2>
    <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
  </section>
);

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-white">
    <header className="border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
        <BrandMark />
        <Link to="/login" className="text-sm font-semibold text-black hover:underline">Sign in</Link>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold text-black">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <p className="mt-6 text-[15px] leading-relaxed text-gray-700">
        BeeBark ("we", "us", "our") is a professional networking platform for the built
        environment — architecture, interiors, and construction. This policy explains what
        information we collect, how we use it, and the choices you have. By using BeeBark you
        agree to this policy.
      </p>

      <Section title="1. Information we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account information</strong> — your name, email address, and password (stored only as a secure hash).</li>
          <li><strong>Profile information</strong> — role, intent, industry, location, bio, skills, experience, and profile photo you provide.</li>
          <li><strong>Sign-in providers</strong> — if you sign in with Google or LinkedIn, we receive your name, email address, and profile photo from that provider.</li>
          <li><strong>Résumé/CV</strong> — if you upload a résumé, we store the file and the details we extract from it (such as skills) to fill in your profile.</li>
          <li><strong>Content</strong> — posts, messages, connections, job postings/applications, and meeting activity you create on the platform.</li>
          <li><strong>Technical data</strong> — basic log and device information needed to operate and secure the service.</li>
        </ul>
      </Section>

      <Section title="2. How we use your information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage your account and authenticate you.</li>
          <li>To build your profile and power networking, messaging, jobs, and meetings.</li>
          <li>To match you with relevant people and opportunities.</li>
          <li>To send essential emails (verification codes, password reset, important notices).</li>
          <li>To maintain security, prevent abuse, and improve the service.</li>
        </ul>
      </Section>

      <Section title="3. How information is shared">
        <p>We do <strong>not</strong> sell your personal information. We share it only:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>With other users</strong> — your profile and content are visible to others as part of normal networking functionality.</li>
          <li><strong>With service providers</strong> who operate the platform on our behalf: hosting (Vercel, Render), media storage (Cloudinary), email delivery (our SMTP provider), and sign-in (Google, LinkedIn).</li>
          <li><strong>When required by law</strong> or to protect the rights, safety, and security of BeeBark and its users.</li>
        </ul>
      </Section>

      <Section title="4. Cookies & local storage">
        <p>
          We use browser storage to keep you signed in (an authentication token) and to remember
          basic preferences. We do not use third-party advertising trackers.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p>
          We keep your information for as long as your account is active. You can request deletion
          of your account and associated personal data at any time (see "Your rights").
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          Passwords are hashed, traffic is encrypted in transit, and access to data is restricted.
          No method of transmission or storage is 100% secure, but we work to protect your
          information using industry-standard measures.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>
          You can access and update most of your information from your profile. To request a copy of
          your data or to delete your account, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-black font-medium underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="8. Children">
        <p>BeeBark is not intended for anyone under 16. We do not knowingly collect data from children.</p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by the
          "Last updated" date above and, where appropriate, communicated to you.
        </p>
      </Section>

      <Section title="10. Contact us">
        <p>
          Questions about this policy or your data? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-black font-medium underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <div className="mt-12 border-t border-gray-100 pt-6 text-sm text-gray-500">
        <Link to="/login" className="font-semibold text-black hover:underline">← Back to BeeBark</Link>
      </div>
    </main>
  </div>
);

export default PrivacyPolicy;
