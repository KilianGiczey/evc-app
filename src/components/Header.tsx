import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full bg-white dark:bg-gray-900 shadow mb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
          EVC Platform
        </Link>
        <nav>
          {/* Add navigation links here */}
        </nav>
      </div>
    </header>
  );
} 