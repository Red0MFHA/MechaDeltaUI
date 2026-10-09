import Link from "next/link";

export function RelatedLinks({
  items,
}: {
  items: { href: string; label: string; hint?: string }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No related records in this console.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <Link href={item.href} className="text-sm text-primary hover:underline">
            {item.label}
          </Link>
          {item.hint && <span className="text-xs text-muted-foreground"> · {item.hint}</span>}
        </li>
      ))}
    </ul>
  );
}
