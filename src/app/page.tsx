import { redirect } from "next/navigation";

/** Signed-in users land in operations; the proxy sends everyone else to sign-in. */
export default function Home() {
  redirect("/app/operations/overview");
}
