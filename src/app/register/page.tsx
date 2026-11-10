import { redirect } from "next/navigation";
import { getViewer, safeNextPath } from "@/lib/auth";
import { config } from "@/lib/env";
import { RegisterForm } from "@/components/auth-forms";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create account" };

type PageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const next = safeNextPath(query.next, "/wishlists");
  const viewer = await getViewer();
  if (viewer) redirect(next);

  return (
    <div className="container-page flex justify-center pb-20 pt-14 sm:pt-20">
      <div className="card w-full max-w-sm p-6 sm:p-7">
        <h1 className="mb-6 text-2xl">Create account</h1>
        {config.allowRegistration ? (
          <RegisterForm next={next} />
        ) : (
          <div className="space-y-4 text-sm text-muted">
            <p>Registration is disabled on this server.</p>
            <Link href="/login" className="btn btn-secondary">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
