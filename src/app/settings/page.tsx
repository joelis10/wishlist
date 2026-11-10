import { requireViewer } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { getPublicVapidKey } from "@/lib/push";
import { listMyWishlists } from "@/lib/wishlists";
import { LogoutIcon } from "@/components/icons";
import { DefaultWishlistForm } from "@/components/default-wishlist-form";
import { NotificationSettings } from "@/components/notification-settings";
import { PasswordForm } from "@/components/password-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const wishlists = listMyWishlists(viewer.id);
  const publicKey = getPublicVapidKey();

  return (
    <div className="container-page max-w-2xl pb-24 pt-10 sm:pt-14">
      <h1 className="text-3xl">Settings</h1>

      <section className="mt-9 border-t border-line pt-7">
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
    </div>
  );
}
