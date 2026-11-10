import { redirect } from "next/navigation";
import { getViewer, safeNextPath } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const next = safeNextPath(query.next, "/");
  const viewer = await getViewer();
  if (viewer) redirect(next);

  return (
    <div className="container-page flex justify-center pb-20 pt-14 sm:pt-20">
      <div className="card w-full max-w-sm p-6 sm:p-7">
        <h1 className="mb-6 text-2xl">Sign in</h1>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
