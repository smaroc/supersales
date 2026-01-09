import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy | SuperSales',
  description: 'Cookie Policy for SuperSales - How we use cookies and similar technologies',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-sm font-medium mb-4">
            Cookies
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Cookie Policy
          </h1>
          <div className="flex flex-col sm:flex-row sm:gap-6 text-gray-600 dark:text-gray-400">
            <p>Effective date: December 12, 2025</p>
            <p>Last updated: January 7, 2026</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Authoritative language: English</p>
        </div>

        {/* Introduction */}
        <div className="mb-10 p-6 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            This Cookie Policy explains how SuperSales, operated by Arcelis FZE, uses cookies and similar technologies in connection with the SuperSales platform and website (the &quot;Services&quot;).
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
            This policy must be read together with the Terms of Service and the Privacy Policy.
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They are commonly used to ensure websites function properly, improve user experience, and provide information to website operators.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Cookies Used by SuperSales</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              SuperSales uses a minimal and purpose-limited set of cookies.
            </p>

            <div className="space-y-6">
              <div className="p-5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">2.1 Strictly Necessary Cookies</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  These cookies are essential for the operation and security of the Services. They enable core functionalities such as:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                  <li>User authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing and platform stability</li>
                </ul>
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-100 dark:border-green-900">
                  <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                    These cookies cannot be disabled, as the Services would not function correctly without them.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">2.2 Functional Cookies</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  Functional cookies may be used to:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                  <li>Remember user preferences</li>
                  <li>Improve usability and performance</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                  These cookies do not track users across websites and are not used for advertising purposes.
                </p>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">2.3 Analytics Cookies</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  SuperSales may use limited analytics cookies to understand how the Services are used and to improve performance.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                  <li>Analytics data is aggregated and non-identifying</li>
                  <li>No individual profiling is performed</li>
                  <li>No advertising or marketing tracking is conducted</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                  Where required by applicable law, analytics cookies are used only after obtaining appropriate consent.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Cookies We Do Not Use</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              SuperSales does not use cookies for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Advertising or retargeting</li>
              <li>Cross-site tracking</li>
              <li>Behavioral profiling</li>
              <li>Selling or sharing personal data with third parties</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Third-Party Cookies</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Certain third-party service providers (e.g. infrastructure, analytics, or payment providers such as Stripe) may place cookies on your device when interacting with their services.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              These third parties operate under their own privacy and cookie policies, and SuperSales does not control their cookie practices.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Managing Cookies</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              You can manage or disable cookies through your browser settings. Please note that disabling strictly necessary cookies may impact the availability and functionality of the Services.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Browser instructions for managing cookies are available from your browser provider.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Legal Basis for Cookie Use</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Strictly Necessary Cookies</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Used based on <strong>legitimate interest</strong>, as they are essential to deliver the Services.
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Optional Cookies</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Where applicable, used based on <strong>consent</strong>, in accordance with applicable data protection laws.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Updates to This Cookie Policy</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              This Cookie Policy may be updated to reflect changes in technology, law, or operational practices. Material changes will be communicated through the Services or website.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Contact</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              For questions regarding cookies or this policy:
            </p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
              <p className="text-gray-900 dark:text-white font-medium">SuperSales Support</p>
              <p className="text-gray-600 dark:text-gray-400">Email: support@supersales.dev</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
