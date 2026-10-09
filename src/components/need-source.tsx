"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useActiveSource } from "@/components/active-source";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import type { RobotSource } from "@/lib/contracts/types";

export function NeedSource({ children }: { children: (source: RobotSource) => ReactNode }) {
  const { source, isPending, error } = useActiveSource();
  if (isPending) return <LoadingState label="Loading sources" />;
  if (error) return <ErrorState error={error} />;
  if (!source) {
    return (
      <EmptyState
        title="No source selected"
        action={
          <Button asChild>
            <Link href="/app/operations/robots?register=1">
              <PlusIcon /> Register a source
            </Link>
          </Button>
        }
      >
        Register a robot, simulation, or recording, then pick it in the top bar.
      </EmptyState>
    );
  }
  return <>{children(source)}</>;
}
