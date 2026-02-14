import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("admin_session")?.value;

  // kalau belum login -> balik ke login, plus "next" biar balik lagi
  if (!token) {
    redirect("/admin/login?next=/admin/posts");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex max-w-6xl gap-4 p-4">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold text-zinc-900">
                CMS Admin
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Manage content & media
              </div>
            </div>

            <nav className="rounded-2xl border border-zinc-200 bg-white p-2">
              <NavItem
                href="/admin/posts"
                label="Post"
                desc="List / Create / Edit"
              />
              <NavItem
                href="/admin/settings"
                label="Settings"
                desc="Global config"
              />
            </nav>

            <div className="rounded-2xl border border-zinc-200 bg-white p-2">
              <form action="/api/admin/logout" method="POST" className="w-full">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Mobile topbar */}
        <div className="md:hidden w-full">
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                CMS Admin
              </div>
              <div className="text-xs text-zinc-500">Menu</div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/posts"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Post
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Settings
              </Link>
            </div>
          </div>

          {children}
        </div>

        {/* Desktop content */}
        <main className="hidden md:block w-full">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc?: string;
}) {
  return (
    <Link href={href} className="block rounded-xl px-3 py-2 hover:bg-zinc-50">
      <div className="text-sm font-medium text-zinc-900">{label}</div>
      {desc ? <div className="text-xs text-zinc-500">{desc}</div> : null}
    </Link>
  );
}
