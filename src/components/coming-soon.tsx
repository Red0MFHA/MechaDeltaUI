import { ConstructionIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  fr,
}: {
  title: string;
  description: string;
  fr: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <ConstructionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">This screen is next</p>
          <p className="max-w-md text-sm text-muted-foreground">
            The shell, session, and mock services are in place. {title} ({fr}) will land in the next
            feature branch.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
