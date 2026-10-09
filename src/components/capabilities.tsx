import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { capabilityLabel, capabilityOrder } from "@/lib/contracts/catalog";
import type { SourceCapabilities } from "@/lib/contracts/types";

export function CapabilityPills({ capabilities }: { capabilities: SourceCapabilities }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Capabilities">
      {capabilityOrder.map((key) => {
        const on = capabilities[key];
        return (
          <li key={key}>
            <Tooltip
              content={
                on
                  ? `${capabilityLabel[key]} is available`
                  : `${capabilityLabel[key]} is not provided`
              }
            >
              <Badge tone={on ? "info" : "outline"}>{capabilityLabel[key]}</Badge>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
