# MechaDelta UI

Web application for MechaDelta: RAM-efficient, long-horizon memory for indoor service robots. One product with two linked workspaces:

- **Robot Operations**: register a simulated or physical robot, or a recorded video; review the patrol; inspect objects and their history; ask historical questions with evidence; inspect memory residency; send supported navigation tasks.
- **Research Lab**: the same memory engine viewed as experiments; configure policies and budgets, monitor runs, compare baseline and proposed policies, and export reproducible reports.

Requirements: FR-01 to FR-50 (see `docs/requirements.md`).

## Stack

Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript, Tailwind CSS v4, Radix primitives, TanStack Query and Table, Zustand, nuqs, React Hook Form with Zod, Recharts, Vitest, Playwright.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Mock sign-in: `demo@mechadelta.lab` / `mechadelta`.

## Data mode

`NEXT_PUBLIC_DATA_MODE=mock` (default) runs every page against typed in-browser mock services. All mock values are labelled as mock in the interface. `http` is reserved for the MechaDelta API.

Optional demo media: copy `MechaDelta_Demo.mp4` from the simulation `deliverables/` folder to `public/demo/patrol.mp4`. Without it, Patrol shows its no-media state and the event timeline still works.

## Scripts

| Script              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Development server                          |
| `npm run typecheck` | Route type generation and TypeScript check  |
| `npm run lint`      | ESLint                                      |
| `npm run test`      | Unit and component tests (Vitest)           |
| `npm run e2e`       | End-to-end tests (Playwright)               |
| `npm run check`     | Typecheck, lint, test, and production build |

## Branching

`main` is always green. Work happens on `feat/*` branches and merges with `--no-ff` after `npm run check` passes.
