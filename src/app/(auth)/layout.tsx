import { BrainCircuitIcon, DatabaseZapIcon, MessageSquareTextIcon } from "lucide-react";
import type { ReactNode } from "react";

const points = [
  {
    icon: BrainCircuitIcon,
    title: "Remembers what changed",
    text: "Writes a place change only after supported evidence, with the observation window it happened in.",
  },
  {
    icon: DatabaseZapIcon,
    title: "Keeps RAM under a budget",
    text: "Holds small anchors in memory and moves heavy views and geometry to disk until they are needed.",
  },
  {
    icon: MessageSquareTextIcon,
    title: "Answers with evidence",
    text: "Every historical answer links to the transition, interval, and crop it came from.",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,34rem)]">
      <section className="hidden flex-col justify-between bg-[oklch(0.24_0.06_275)] p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-white/15 font-mono">
            Δ
          </span>
          MechaDelta
        </div>
        <div className="max-w-lg">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Long-horizon memory for indoor service robots
          </h2>
          <ul className="mt-8 flex flex-col gap-6">
            {points.map((p) => (
              <li key={p.title} className="flex gap-3">
                <p.icon className="mt-0.5 size-5 shrink-0 text-white/80" aria-hidden="true" />
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-white/70">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">
          FAST NUCES final year project · Robot Operations and Research Lab
        </p>
      </section>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
