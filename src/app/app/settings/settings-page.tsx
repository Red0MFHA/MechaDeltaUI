"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader, Section } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { useSession, useSignOut } from "@/components/session";
import { useTheme } from "@/components/shell/theme";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import type { TimezonePolicy } from "@/lib/format";
import { dataMode } from "@/lib/services";
import { resetMockData } from "@/lib/services/mock";
import {
  getScenario,
  mockScenarios,
  setScenario,
  subscribeScenario,
} from "@/lib/services/mock/scenario";
import { usePreferences } from "@/lib/stores/preferences";

export function SettingsPage() {
  const session = useSession();
  const signOut = useSignOut();
  const [theme, setTheme] = useTheme();
  const timezone = usePreferences((s) => s.timezone);
  const setTimezone = usePreferences((s) => s.setTimezone);
  const client = useQueryClient();
  const router = useRouter();
  const scenario = React.useSyncExternalStore(
    subscribeScenario,
    getScenario,
    () => "normal" as const,
  );
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Account, display preferences, and demo controls for this console."
        crumbs={[{ label: "Settings" }]}
      />

      <div className="flex flex-col gap-8">
        <Section title="Account" description="Who is signed in on this browser.">
          <Card>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{session.user.displayName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User id</p>
                <p className="font-mono text-sm">{session.user.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Session ends</p>
                <p className="text-sm">{new Date(session.expiresAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Section>

        <Section title="Display" description="These stay on this browser only.">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Theme</span>
                <NativeSelect
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as typeof theme)}
                >
                  <option value="system">Match the system</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Timestamps</span>
                <NativeSelect
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value as TimezonePolicy)}
                >
                  <option value="local">Local time</option>
                  <option value="utc">UTC</option>
                </NativeSelect>
              </label>
            </CardContent>
          </Card>
        </Section>

        {dataMode === "mock" && (
          <Section
            id="demo"
            title="Demo data"
            description="Scenarios change how the mock backend behaves. They are for testing the UI, not findings."
          >
            <Card>
              <CardContent className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Scenario</span>
                  <NativeSelect
                    value={scenario}
                    onChange={(e) => {
                      const next = e.target.value as (typeof mockScenarios)[number]["id"];
                      setScenario(next);
                      void client.invalidateQueries();
                      toast.message(`Scenario: ${mockScenarios.find((s) => s.id === next)?.label}`);
                    }}
                  >
                    {mockScenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — {s.description}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <Note>
                  Session expired signs you out on the next request. After you sign in again, the
                  scenario returns to Normal.
                </Note>
                <div>
                  <Button variant="danger" onClick={() => setConfirmReset(true)}>
                    Reset demo data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Section>
        )}
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears sources, questions, tasks, and experiments stored for this account in this
            browser. It cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep data</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              onClick={() => {
                resetMockData();
                void client.invalidateQueries();
                toast.success("Demo data reset.");
                router.push("/app/operations/overview");
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
