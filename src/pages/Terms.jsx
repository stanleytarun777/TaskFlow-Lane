import React from "react";

function Terms() {
  return (
    <section className="legal-page" aria-labelledby="terms-title">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">Legal</p>
        <h1 id="terms-title">TaskFlow Terms of Service</h1>
        <p className="legal-page__updated">Last updated: January 25, 2026</p>

        <p>
          TaskFlow is an online productivity workspace operated by TaskFlow Studio ("TaskFlow", "we", "our").
          By accessing or using the TaskFlow application, website, or related services (collectively, the "Service"),
          you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>By creating an account you represent that you:</p>
        <ul>
          <li>Are at least 13 years old and legally able to enter into contracts</li>
          <li>Will use the Service in compliance with applicable laws</li>
          <li>Have reviewed and agree to these Terms and our Privacy Policy</li>
        </ul>

        <h2>2. Description of Service</h2>
        <p>
          TaskFlow provides task management, scheduling, analytics, and workspace personalization features geared toward
          individual makers and small teams. The Service is hosted on Supabase (PostgreSQL plus authentication) and delivered
          through a React-based web application. Features may evolve, launch in beta, or be discontinued without notice.
        </p>

        <h2>3. Accounts and Security</h2>
        <p>TaskFlow relies on Supabase Auth for account creation and login. You agree to:</p>
        <ul>
          <li>Provide accurate registration data and keep it up to date</li>
          <li>Maintain the confidentiality of your credentials and session tokens</li>
          <li>Notify us at support@taskflow.app if you suspect unauthorized access</li>
        </ul>
        <p>You are responsible for all activity performed through your account.</p>

        <h2>4. License and Intellectual Property</h2>
        <p>
          TaskFlow grants you a revocable, non-exclusive, non-transferable license to access and use the Service
          for personal or internal business productivity. TaskFlow retains all rights to the platform, code, and branding.
          You retain ownership of the data you submit and grant TaskFlow a limited license to store, process, and display
          that data solely to operate the Service.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Probe or circumvent security, rate limits, or access controls</li>
          <li>Upload malicious code, automate excessive traffic, or overload infrastructure</li>
          <li>Use TaskFlow to store sensitive regulated data such as payment cards or health records</li>
          <li>Reverse engineer, resell, or sublicense the Service without permission</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these requirements.</p>

        <h2>6. Service Changes and Fees</h2>
        <p>
          TaskFlow is currently offered without paid plans. Future premium tiers may require separate terms or fees,
          which will be communicated before they take effect. We may modify or discontinue any portion of the Service at any time.
        </p>

        <h2>7. Availability and Support</h2>
        <p>
          The Service is provided on an "as is" and "as available" basis. While we monitor uptime and error logs,
          we do not guarantee uninterrupted access, data recovery, or that the Service will meet every requirement.
          Support is available via support@taskflow.app and best-effort responses are provided during U.S. business hours.
        </p>

        <h2>8. Termination</h2>
        <p>
          You may delete your account at any time through the application or by emailing support@taskflow.app.
          We may suspend or terminate access if you violate these Terms, if required by law, or if we sunset the Service.
          Upon termination we may delete your workspace data from production systems, subject to backup retention schedules.
        </p>

        <h2>9. Disclaimers and Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TASKFLOW DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. TASKFLOW AND ITS
          CONTRIBUTORS ARE NOT LIABLE FOR LOST PROFITS, LOST DATA, OR INDIRECT, SPECIAL, OR CONSEQUENTIAL DAMAGES
          ARISING FROM USE OF THE SERVICE.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of California, United States, without regard to conflict-of-law principles.
          Any disputes will be handled in the state or federal courts located in San Francisco County, California.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We may update these Terms to reflect product, security, or legal changes. Material updates will be highlighted in-app
          or via email. Continued use of TaskFlow after an update constitutes acceptance of the revised Terms.
        </p>

      </div>
    </section>
  );
}

export default Terms;
