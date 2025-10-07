// src/layouts/SiteLayout.tsx
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold">PeerPrep</a>
        <nav className="hidden sm:flex gap-6 text-sm text-gray-600">
          <a href="/login">Log in</a><a href="/signup">Sign up</a>
        </nav>
      </header>
      <main className="px-6">{children}</main>
      <footer className="px-6 py-10 text-center text-xs text-gray-500">© {new Date().getFullYear()} PeerPrep</footer>
    </div>
  );
}
