import React from "react";

function Privacy() {
  return (
    <section className="legal-page" aria-labelledby="privacy-title">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">Legal</p>
        <h1 id="privacy-title">TaskFlow Privacy &amp; Data Usage Policy</h1>
        <p className="legal-page__updated">Last updated: January 25, 2026</p>

        <p>
          TaskFlow Studio ("TaskFlow", "we", "our") operates the TaskFlow productivity application. This Privacy &amp; Data Usage Policy
          explains how we collect, use, store, and protect information when you access the Service.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>a. Account &amp; Profile Information</h3>
        <ul>
          <li>Email address and hashed authentication credentials managed by Supabase Auth</li>
          <li>Optional profile metadata such as first and last name provided during registration</li>
        </ul>

        <h3>b. Workspace &amp; Task Content</h3>
        <ul>
          <li>Task titles, descriptions, due dates, priorities, completion state, and timestamps</li>
          <li>Customization preferences such as theme selections and layout settings stored via local storage</li>
        </ul>

        <h3>c. Usage &amp; Diagnostic Data</h3>
        <ul>
          <li>Session identifiers and authentication tokens issued by Supabase</li>
          <li>Aggregated error logs, performance metrics, and device type data for reliability monitoring</li>
        </ul>
        <p>We do not intentionally collect payment data, precise geolocation, or other sensitive categories of personal information.</p>

        <h2>2. How We Use Information</h2>
        <p>We process data in order to:</p>
        <ul>
          <li>Authenticate you and maintain secure sessions</li>
          <li>Store, sync, and display your tasks and workspace preferences</li>
          <li>Send essential account-related notifications (password reset, critical updates)</li>
          <li>Monitor stability, detect abuse, and plan product improvements</li>
        </ul>
        <p>Processing is based on the performance of our agreement with you and our legitimate interest in operating a reliable service.</p>

        <h2>3. Sharing &amp; Third-Party Processors</h2>
        <p>TaskFlow does not sell or rent your data. We share information only with service providers that enable core functionality:</p>
        <ul>
          <li><strong>Supabase</strong> (authentication, database, file storage)</li>
          <li><strong>Vercel</strong> or equivalent hosting for the web client</li>
          <li>Email delivery partners for transactional messages</li>
        </ul>
        <p>Each provider is contractually obligated to safeguard data and use it solely to deliver the contracted service.</p>

        <h2>4. Data Storage &amp; Security</h2>
        <p>
          User data is stored in Supabase Postgres databases located in the United States. Security measures include HTTPS encryption,
          managed infrastructure patches, Supabase Row Level Security policies, and least-privilege access controls.
          We review access logs periodically and restrict production database access to the core TaskFlow team.
        </p>

        <h2>5. International Transfers</h2>
        <p>
          Because our infrastructure is currently hosted in U.S. regions, using TaskFlow may involve transferring data outside your home country.
          By using the Service you consent to these transfers.
        </p>

        <h2>6. Your Choices &amp; Rights</h2>
        <ul>
          <li>Access: Export your tasks or contact us to obtain a copy of your data</li>
          <li>Correction: Update inaccurate account details from within the application</li>
          <li>Deletion: Delete individual tasks or close your account to remove workspace data from active systems</li>
          <li>Objection: Opt out of non-essential communications by emailing support@taskflow.app</li>
        </ul>

        <h2>7. Cookies, Local Storage, and Sessions</h2>
        <p>
          TaskFlow uses essential cookies and local storage entries to keep you signed in and remember theme preferences.
          We do not run third-party advertising, fingerprinting scripts, or behavioral tracking beacons.
        </p>

        <h2>8. Data Retention</h2>
        <p>
          Workspace content remains while your account is active. If you delete your account, production records are removed within 30 days
          and may persist in encrypted backups for up to 90 days before automatic purge.
        </p>

        <h2>9. Children’s Privacy</h2>
        <p>The Service is intended for users 13 years and older. We delete any account that we learn was created by a child under 13.</p>

        <h2>10. Updates to this Policy</h2>
        <p>
          We may revise this Policy to reflect product, legal, or security changes. We will update the "Last updated" date and
          highlight material changes within the app or via email.
        </p>

        <h2>Important Notice</h2>
        <p>
          TaskFlow is designed for general productivity. Please avoid storing regulated financial, health, or government-classified information in the Service.
        </p>
      </div>
    </section>
  );
}

export default Privacy;
