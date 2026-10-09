import {
  ActivityIcon,
  BotIcon,
  CpuIcon,
  DatabaseIcon,
  FileTextIcon,
  FlaskConicalIcon,
  GaugeIcon,
  GitCompareIcon,
  JoystickIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  TrendingUpIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

export type Workspace = "operations" | "research";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  fr: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: Record<Workspace, NavGroup[]> = {
  operations: [
    {
      label: "Monitor",
      items: [
        {
          href: "/app/operations/overview",
          label: "Overview",
          icon: LayoutDashboardIcon,
          fr: "FR-10",
        },
        { href: "/app/operations/robots", label: "Robots & sources", icon: BotIcon, fr: "FR-07" },
        { href: "/app/operations/patrol", label: "Patrol", icon: VideoIcon, fr: "FR-12" },
        { href: "/app/operations/events", label: "Events", icon: ActivityIcon, fr: "FR-14" },
      ],
    },
    {
      label: "Act",
      items: [
        {
          href: "/app/operations/drive",
          label: "Drive & navigate",
          icon: JoystickIcon,
          fr: "FR-18",
        },
        { href: "/app/operations/tasks", label: "Tasks", icon: ListChecksIcon, fr: "FR-20" },
      ],
    },
    {
      label: "Remember",
      items: [
        {
          href: "/app/operations/ask",
          label: "Ask history",
          icon: MessageSquareTextIcon,
          fr: "FR-21",
        },
        { href: "/app/operations/memory", label: "Memory", icon: DatabaseIcon, fr: "FR-26" },
        { href: "/app/operations/runtime", label: "RAM & disk", icon: CpuIcon, fr: "FR-29" },
      ],
    },
  ],
  research: [
    {
      label: "Measure",
      items: [
        { href: "/app/research/runtime", label: "Resource history", icon: GaugeIcon, fr: "FR-31" },
        {
          href: "/app/research/experiments",
          label: "Experiments",
          icon: FlaskConicalIcon,
          fr: "FR-32",
        },
      ],
    },
    {
      label: "Analyse",
      items: [
        {
          href: "/app/research/compare",
          label: "Compare policies",
          icon: GitCompareIcon,
          fr: "FR-35",
        },
        { href: "/app/research/analytics", label: "Analytics", icon: TrendingUpIcon, fr: "FR-36" },
        { href: "/app/research/reports", label: "Reports", icon: FileTextIcon, fr: "FR-38" },
      ],
    },
  ],
};

export const workspaceHome: Record<Workspace, string> = {
  operations: "/app/operations/overview",
  research: "/app/research/experiments",
};

export const workspaceLabel: Record<Workspace, string> = {
  operations: "Robot Operations",
  research: "Research Lab",
};

export function workspaceFor(pathname: string): Workspace {
  return pathname.startsWith("/app/research") ? "research" : "operations";
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
