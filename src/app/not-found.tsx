import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        That address is not part of MechaDelta.
      </p>
      <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
        Sign in
      </Link>
    </div>
  );
}
