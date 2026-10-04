import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | IOE Connect',
  description: 'Frequently asked questions about IOE Connect',
};

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is IOE Connect?',
    answer:
      'IOE Connect is a comprehensive platform designed for students pursuing the IOE (Institute of Engineering) curriculum. It provides access to study resources, tools like the GPA calculator, and community features to support academic success.',
  },
  {
    question: 'Is IOE Connect free to use?',
    answer:
      'Yes, IOE Connect offers many free features including access to basic resources and the GPA calculator. We also offer premium features with additional benefits for students who want more comprehensive support.',
  },
  {
    question: 'How do I use the SCGPA Calculator?',
    answer:
      'The SCGPA Calculator is simple to use: Select your semester (1-8), add subjects with their credit hours and grades, and the calculator will automatically compute your SGPA and cumulative CGPA. You can save your results if you\'re logged in.',
  },
  {
    question: 'What grades does the calculator support?',
    answer:
      'The calculator supports the standard IOE grading scale: A+ (4.0), A (3.7), B+ (3.3), B (3.0), C+ (2.7), C (2.3), D (2.0), and F (0.0). Custom grading tables can be configured by administrators.',
  },
  {
    question: 'How accurate is the GPA calculation?',
    answer:
      'The calculator uses the standard formula: SGPA = (Sum of Grade Points × Credits) / Total Credits. It is accurate to two decimal places. Always verify critical calculations with your academic advisor.',
  },
  {
    question: 'Can I save my calculator results?',
    answer:
      'Yes, if you\'re logged in, you can save your SCGPA calculations. This allows you to track your progress over time and access your saved results from any device.',
  },
  {
    question: 'What resources are available on the platform?',
    answer:
      'IOE Connect offers notes, past question papers, reference materials, lab manuals, and more for each subject in the IOE curriculum. Resources are organized by program, year, semester, and subject for easy navigation.',
  },
  {
    question: 'How can I request specific resources?',
    answer:
      'If you can\'t find a resource you need, you can submit a resource request through the "My Requests" section. Administrators review requests and work to fulfill them based on availability and demand.',
  },
  {
    question: 'Can I upload my own resources?',
    answer:
      'Yes! We encourage community contribution. You can upload your notes, summaries, and resources through the student uploads feature. All uploads are reviewed before publication to maintain quality.',
  },
  {
    question: 'Is my information secure?',
    answer:
      'Yes, we take data security seriously. All sensitive information is encrypted and stored securely on our servers. We comply with data protection standards and never share your information without consent.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'You can reach our support team through the Contact page, or email us directly. We typically respond within 24-48 hours. For urgent issues, check the help section for additional resources.',
  },
  {
    question: 'What is the referral program?',
    answer:
      'Our referral program rewards you for inviting friends to IOE Connect. When a referred friend takes a premium subscription, you get credits or rewards. Check the Referrals section for more details.',
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-slate-300">
            Find answers to common questions about IOE Connect
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition-colors"
            >
              <details className="group cursor-pointer">
                <summary className="flex items-center justify-between p-6 font-semibold text-white hover:bg-slate-700/50 transition-colors">
                  <span className="text-lg">{faq.question}</span>
                  <span className="text-2xl text-blue-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0 border-t border-slate-700 text-slate-300 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-8 text-center border border-blue-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-blue-200 mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
