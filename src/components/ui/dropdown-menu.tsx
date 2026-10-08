"use client";

import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-md border border-border bg-surface p-1 text-sm shadow-md",
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

const itemClass =
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted [&_svg]:size-4";

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn(itemClass, className)} {...props} />;
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem className={cn(itemClass, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex size-3 items-center justify-center">
        <DropdownPrimitive.ItemIndicator>
          <span className="block size-2 rounded-full bg-primary" />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
