import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { Brand } from "./brand";
import { PlusIcon, SettingsIcon } from "./icons";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="border-b border-line/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-7">
          <Brand />
          <nav className="flex items-center gap-4 text-[13px] text-muted sm:gap-5 sm:text-sm">
            {viewer ? (
              <Link
                href="/"
                className="py-2 transition hover:text-ink"
                aria-label="My wishlists"
              >
                <span className="sm:hidden">Lists</span>
                <span className="hidden sm:inline">My wishlists</span>
              </Link>
            ) : null}
            <Link
              href="/shared"
              className="py-2 transition hover:text-ink"
              aria-label="Shared with me"
            >
              <span className="sm:hidden">Shared</span>
              <span className="hidden sm:inline">Shared with me</span>
            </Link>
          </nav>
        </div>

        <div key={viewer ? "signed-in" : "guest"} className="flex items-center gap-1.5">
          {viewer ? (
            <Link href="/w/new" className="btn btn-primary btn-sm">
              <PlusIcon className="size-4" />
              <span className="hidden xs:inline">New wishlist</span>
              <span className="xs:hidden">New</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                <span className="hidden xs:inline">Create account</span>
                <span className="xs:hidden">Join</span>
              </Link>
            </>
          )}
          <Link
            href="/settings"
            className="rounded-full p-2 text-muted transition duration-200 hover:rotate-12 hover:bg-raised hover:text-ink"
            aria-label="Settings"
          >
            <SettingsIcon className="size-[18px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
