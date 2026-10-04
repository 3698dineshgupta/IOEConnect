import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About IOE Connect',
  description: 'Learn about IOE Connect - a platform for IOE students to access resources and tools',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            About IOE Connect
          </h1>
          <p className="text-lg text-slate-300">
            Empowering engineering students with resources, tools, and community
          </p>
        </div>

        {/* Mission */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-300 leading-relaxed">
            IOE Connect is dedicated to supporting students pursuing the IOE
            (Institute of Engineering) curriculum. We provide a centralized platform
            for accessing high-quality study resources, tools for academic planning,
            and a community of peers working towards the same goals.
          </p>
        </div>

        {/* What We Offer */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Resource Library',
                description:
                  'Comprehensive collection of notes, past question papers, reference materials, and more organized by semester and subject.',
              },
              {
                title: 'GPA Calculator',
                description:
                  'Accurately calculate your SGPA and CGPA with our user-friendly calculator supporting all grading schemes.',
              },
              {
                title: 'Curriculum Access',
                description:
                  'Browse the complete IOE curriculum with subject details, helping you plan your academic journey.',
              },
              {
                title: 'Community Support',
                description:
                  'Connect with fellow students, share resources, and request materials for subjects.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who We Are */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Who We Are</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            IOE Connect is built by engineering students and professionals who
            understand the challenges of the IOE curriculum. We&apos;re committed to
            creating a platform that genuinely helps students succeed.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Whether you&apos;re just starting your first semester or in your final year,
            IOE Connect is designed to support you every step of the way.
          </p>
        </div>

        {/* Values */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Our Values</h2>
          <div className="space-y-4">
            {[
              {
                title: 'Accessibility',
                description: 'Quality resources should be available to all students',
              },
              {
                title: 'Community',
                description: 'Strong communities of learners achieve more together',
              },
              {
                title: 'Excellence',
                description: 'We strive for high-quality content and tools',
              },
              {
                title: 'Transparency',
                description: 'We are open about what we do and how we operate',
              },
            ].map((value, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{value.title}</h3>
                  <p className="text-slate-400">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-8 text-center border border-blue-700">
          <h2 className="text-2xl font-bold text-white mb-4">Get Started Today</h2>
          <p className="text-blue-200 mb-6">
            Browse notes and past year questions for your semester.
          </p>
          <Link
            href="/resources"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Explore Resources
          </Link>
        </div>
      </div>
    </main>
  );
}
