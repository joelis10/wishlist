import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { getPreferredCurrency } from "@/lib/currency";
import { getPublicVapidKey } from "@/lib/push";
import { getPreferredTheme } from "@/lib/theme";
import { listMyWishlists } from "@/lib/wishlists";
import { LogoutIcon } from "@/components/icons";
import { CurrencyForm } from "@/components/currency-form";
import { ThemeForm } from "@/components/theme-form";
import { DefaultWishlistForm } from "@/components/default-wishlist-form";
import { NotificationSettings } from "@/components/notification-settings";
import { PasswordForm } from "@/components/password-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  const preferredCurrency = await getPreferredCurrency(viewer);
  const preferredTheme = await getPreferredTheme(viewer);
  const wishlists = viewer ? listMyWishlists(viewer.id) : [];
  const publicKey = viewer ? getPublicVapidKey() : "";

  return (
    <div className="container-page max-w-2xl pb-24 pt-10 sm:pt-14">
      <h1 className="text-3xl">Settings</h1>

      <section className="mt-9 border-t border-line pt-7">
        <h2 className="mb-4 text-xl">Appearance</h2>
        <ThemeForm current={preferredTheme} />
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <h2 className="mb-4 text-xl">Currency</h2>
        <CurrencyForm current={preferredCurrency} />
      </section>

      {viewer ? (
        <>
          <section className="mt-12 border-t border-line pt-7">
            <h2 className="mb-1.5 text-xl">Account</h2>
            <p className="mb-5 text-sm text-muted">
              Signed in as <span className="text-ink">{viewer.username}</span>
            </p>
            <PasswordForm />
          </section>

          <section className="mt-12 border-t border-line pt-7">
            <h2 className="mb-4 text-xl">Default wishlist</h2>
            <DefaultWishlistForm wishlists={wishlists} currentId={viewer.defaultWishlistId} />
          </section>

          <section className="mt-12 border-t border-line pt-7">
            <h2 className="mb-4 text-xl">Notifications</h2>
            <NotificationSettings publicKey={publicKey} enabled={viewer.notifyEnabled} />
          </section>

          <section className="mt-12 border-t border-line pt-7">
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-sm">
                <LogoutIcon className="size-4" />
                Sign out
              </button>
            </form>
          </section>
        </>
      ) : (
        <section className="mt-12 border-t border-line pt-7">
          <p className="text-sm text-muted">
            <Link href="/login?next=%2Fsettings" className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
              Sign in
            </Link>{" "}
            to manage your account.
          </p>
        </section>
      )}
    </div>
  );
}
