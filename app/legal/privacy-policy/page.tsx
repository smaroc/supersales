import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Super Sales',
  description: 'Privacy Policy for Super Sales - How we process personal data as a B2B Data Processor',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
            Privacy
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            SuperSales
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-500">
            <span>Effective date: January 7, 2026</span>
            <span>Last updated: January 7, 2026</span>
          </div>
          <div className="mt-4">
            <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-xs rounded">Authoritative language: English</span>
          </div>
        </div>

        {/* Introduction */}
        <div className="mb-10 p-5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            This Privacy Policy explains how SuperSales, operated by Arcelis FZE, processes personal data in connection with the SuperSales platform and services (the &quot;Services&quot;).
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            This Privacy Policy applies exclusively to business users (B2B) and must be read together with the Terms of Service.
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none">

          {/* Section 1 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Data Controller vs Data Processor</h2>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">1.1 Roles</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              For the purposes of applicable data protection laws, including the EU General Data Protection Regulation (GDPR):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Customer</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Data Controller</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-semibold text-green-900 dark:text-green-100">SuperSales (Arcelis FZE)</p>
                <p className="text-sm text-green-700 dark:text-green-300">Data Processor</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              SuperSales processes personal data solely on behalf of and under the instructions of the Customer.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Who We Are</h2>
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
              <p className="text-gray-900 dark:text-white font-semibold">Arcelis FZE</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Commercial Registration No.: 4422325.01</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Business Centre, Sharjah Publishing City Free Zone</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Sharjah, United Arab Emirates</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                <span className="mr-2">📩</span>Contact (privacy &amp; legal): <strong>support@supersales.dev</strong>
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Categories of Data Processed</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales does not collect data from individuals in a consumer capacity.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              The Services may process, on behalf of Customers, the following categories of data:
            </p>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">3.1 Sales Call Data (Provided by Customers)</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Audio recordings of sales calls</li>
              <li>Transcriptions of sales calls</li>
              <li>Associated metadata (date, duration, speaker roles)</li>
            </ul>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-6">
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                <span className="mr-2">⚠️</span>These recordings and transcriptions are provided by Customers, often via third-party tools. SuperSales does not initiate or control recording.
              </p>
            </div>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">3.2 Analytical Data</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-6">
              <li>AI-generated scores</li>
              <li>Coaching insights</li>
              <li>Performance indicators</li>
              <li>Session-level analytical summaries</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">3.3 Account &amp; Administrative Data</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Business contact information (name, business email, role)</li>
              <li>Account identifiers</li>
              <li>Billing and subscription metadata (via Stripe)</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data We Do Not Intentionally Process</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales does not intentionally process:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Sensitive personal data (as defined by GDPR Article 9)</li>
              <li>Health data</li>
              <li>Biometric identifiers</li>
              <li>Financial or banking data of call participants</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              If such data is included in Content by the Customer, it is processed solely at the Customer&apos;s responsibility.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Purpose of Processing</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales processes personal data only for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Providing AI-driven sales analysis and coaching insights</li>
              <li>Generating informational scores and recommendations</li>
              <li>Maintaining platform security and integrity</li>
              <li>Providing customer support</li>
              <li>Managing subscriptions and billing</li>
            </ul>
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                SuperSales does not use personal data for advertising, profiling individuals, or automated decision-making.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Legal Basis for Processing</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              As a Data Processor, SuperSales relies on the Customer&apos;s determination of the appropriate legal basis, which may include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Consent obtained by the Customer</li>
              <li>Performance of a contract</li>
              <li>Legitimate interests pursued by the Customer</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              SuperSales does not independently determine or validate the legal basis for recording or processing call data.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Data Retention Policy (Strict)</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              SuperSales follows a data minimization approach.
            </p>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">7.1 Transcripts &amp; Audio</h3>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 mb-6">
              <ul className="text-green-800 dark:text-green-300 text-sm space-y-2">
                <li>✓ Audio recordings and transcripts are <strong>not stored</strong> by SuperSales</li>
                <li>✓ They are processed transiently for analysis purposes only</li>
                <li>✓ They are deleted <strong>immediately after processing</strong></li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">7.2 Analytical Outputs</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>AI-generated analyses and session insights are retained only while the Customer account remains active</li>
              <li>Upon account termination, all retained analytical data is deleted without delay</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Data Subject Rights</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              As SuperSales acts as a Data Processor, requests from data subjects (e.g. sales call participants) must be handled by the Customer as Data Controller.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales will assist Customers, where legally required, in responding to requests relating to:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Access</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Rectification</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Erasure</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Restriction</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Data portability</p>
              </div>
            </div>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Requests from Customers</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Customers may request:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Deletion of retained analytical data</li>
              <li>Export of available analytical outputs</li>
            </ul>
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                <span className="mr-2">📩</span>Requests must be sent to <strong>support@supersales.dev</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                <span className="mr-2">⏱</span>Response SLA: within 30 days
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. International Data Transfers</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales operates from the United Arab Emirates and may process data outside the Customer&apos;s country of establishment.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Where required by applicable law, appropriate safeguards are implemented to ensure adequate protection of personal data.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Where required by applicable data protection laws, appropriate contractual safeguards are implemented to ensure an adequate level of protection for personal data transferred outside the European Economic Area.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Security Measures</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales implements appropriate technical and organizational measures designed to protect personal data against:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Unauthorized access</li>
              <li>Accidental loss</li>
              <li>Destruction or alteration</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              No system is completely secure; however, SuperSales follows industry-standard security practices proportionate to the nature of the data processed.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Subprocessors</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales may use trusted subprocessors (e.g. cloud infrastructure, billing providers such as Stripe) to deliver the Services.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Subprocessors:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Are contractually bound to confidentiality and data protection obligations</li>
              <li>Process data only on SuperSales&apos; instructions</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              A current list of subprocessors may be provided upon reasonable request.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. No Automated Decision-Making</h2>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                SuperSales does not perform automated decision-making within the meaning of GDPR Article 22.
              </p>
              <p className="text-purple-800 dark:text-purple-300 leading-relaxed mt-2">
                All AI Outputs are informational only and require human interpretation and validation.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Updates to This Privacy Policy</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              This Privacy Policy may be updated from time to time to reflect legal, regulatory, or operational changes.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Material changes will be communicated through the Services or by email.
            </p>
          </section>

          {/* Section 14 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">14. Contact</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              For privacy-related questions or requests:
            </p>
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
              <p className="text-gray-900 dark:text-white font-medium">
                <span className="mr-2">📩</span>support@supersales.dev
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
