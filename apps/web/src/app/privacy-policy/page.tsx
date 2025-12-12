import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import ReactMarkdown from "react-markdown";
import { readFile } from "fs/promises";
import path from "path";

export default async function PrivacyPolicy() {
  const markdownPath = path.join(
    process.cwd(),
    "public",
    "docs",
    "privacy-policy.md"
  );
  const markdownContent = await readFile(markdownPath, "utf-8");

  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-80"
            >
              <Image
                src="/bulb-simple.svg"
                alt="indexed-ideas logo"
                width={26}
                height={26}
              />
              <span className="font-mono text-lg text-gray-900">
                Indexed-Ideas
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-gray max-w-none font-mono text-gray-700">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-gray-900 mb-8 mt-8">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-gray-900 underline hover:text-gray-600"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
