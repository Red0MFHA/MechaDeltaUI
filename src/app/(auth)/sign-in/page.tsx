import { Suspense } from "react";

import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in…</p>}>
      <SignInForm />
    </Suspense>
  );
}
