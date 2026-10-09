"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ListFilters({
  search,
  onSearch,
  placeholder,
  searchLabel,
  active,
  onClear,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  searchLabel: string;
  active: boolean;
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="sm:max-w-md"
        />
        {children}
        {active && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
      {active && (
        <p className="text-xs text-muted-foreground" role="status">
          Filters applied. Clear them to see the full list.
        </p>
      )}
    </div>
  );
}

export function listEmpty(filtered: boolean, noun: string, idleHint?: string) {
  if (filtered) {
    return (
      <EmptyState title={`No ${noun} match`}>
        Clear the filters to see everything on this source.
      </EmptyState>
    );
  }
  return <EmptyState title={`No ${noun} yet`}>{idleHint}</EmptyState>;
}
