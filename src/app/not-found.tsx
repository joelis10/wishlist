import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center pb-24 pt-24 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-2 text-3xl">Not found</h1>
      <p className="mt-2 text-sm text-muted">That page is missing or private.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Browse wishlists
      </Link>
    </div>
  );
}
