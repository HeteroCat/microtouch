import Link from 'next/link';

export default function NavBar() {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <nav className="flex items-center justify-between gap-24 rounded-full border border-white/10 bg-white/5 px-10 py-4 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20">
                <div className="flex items-center gap-3">
                    {/* Logo Icon */}
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                    >
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span className="text-lg font-medium text-white tracking-tight">MicroTouch</span>
                </div>

                <div className="flex items-center gap-8 text-sm font-medium text-gray-300">
                    <Link href="/" className="hover:text-white transition-colors">
                        Home
                    </Link>
                    <Link href="/product" className="hover:text-white transition-colors">
                        Product
                    </Link>
                    <Link href="#" className="hover:text-white transition-colors">
                        Docs
                    </Link>
                </div>
            </nav>
        </div>
    );
}
