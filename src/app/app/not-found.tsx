import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">This page is not in the console</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The address may be mistyped, or the record was removed. You cannot reach another account by
        changing an id in the URL.
      </p>
      <Button asChild>
        <Link href="/app/operations/overview">Go to overview</Link>
      </Button>
    </div>
  );
}
