# MechaDelta Console: functional requirements

Source: `MechaDelta_Web_UI_context_9OCt.md` (FR-01 to FR-47), plus FR-48 to FR-50 added during planning.
Status columns are updated as each branch merges. "Mock" means the screen works end to end on the
labelled mock services; the HTTP adapter is a placeholder until the backend API exists.

## Access and shell

| FR    | Requirement                                      | Screen                | Status  |
| ----- | ------------------------------------------------ | --------------------- | ------- |
| FR-01 | Sign in                                          | `/sign-in`            | Planned |
| FR-02 | Sign out and session expiry                      | User menu, any screen | Planned |
| FR-03 | Account profile and user context                 | `/app/settings`       | Planned |
| FR-04 | Shared application shell                         | `/app/*` layout       | Planned |
| FR-05 | Switch between Robot Operations and Research Lab | Top bar               | Planned |
| FR-06 | Select the active robot or data source           | Top bar               | Planned |

## Robots and sources

| FR    | Requirement                                   | Screen                                       | Status  |
| ----- | --------------------------------------------- | -------------------------------------------- | ------- |
| FR-07 | Register a robot or source                    | `/app/operations/robots`                     | Planned |
| FR-08 | Browse and inspect registered robots          | `/app/operations/robots`, `/robots/:robotId` | Planned |
| FR-09 | Edit, connect, disconnect, or remove a source | `/app/operations/robots/:robotId`            | Planned |
| FR-10 | Operations overview                           | `/app/operations/overview`                   | Planned |
| FR-11 | System health and capabilities                | Overview, robot detail                       | Planned |

## Observation

| FR    | Requirement                     | Screen                              | Status  |
| ----- | ------------------------------- | ----------------------------------- | ------- |
| FR-12 | Patrol and observation viewer   | `/app/operations/patrol`            | Planned |
| FR-13 | Object detections               | Patrol overlay                      | Planned |
| FR-14 | Event and observation history   | `/app/operations/events`            | Planned |
| FR-15 | Object history and trajectories | `/app/operations/objects/:objectId` | Planned |
| FR-16 | Robot pose and map context      | Patrol, Drive                       | Planned |
| FR-17 | LiDAR and spatial sensor view   | Patrol, Drive                       | Planned |

## Control

| FR    | Requirement                                | Screen                                    | Status  |
| ----- | ------------------------------------------ | ----------------------------------------- | ------- |
| FR-18 | Drive and control panel                    | `/app/operations/drive`                   | Planned |
| FR-19 | Navigate to the last known object location | Drive                                     | Planned |
| FR-20 | Task history and status                    | `/app/operations/tasks`, `/tasks/:taskId` | Planned |

## Historical questions and evidence

| FR    | Requirement                            | Screen                                 | Status  |
| ----- | -------------------------------------- | -------------------------------------- | ------- |
| FR-21 | Ask a historical question              | `/app/operations/ask`                  | Planned |
| FR-22 | Context controls (time range, objects) | Ask                                    | Planned |
| FR-23 | Answer evidence and citations          | Ask, question detail                   | Planned |
| FR-24 | Question history                       | `/app/operations/ask/:questionId`      | Planned |
| FR-25 | Evidence report                        | `/app/operations/evidence/:evidenceId` | Planned |

## Memory and runtime

| FR    | Requirement               | Screen                             | Status  |
| ----- | ------------------------- | ---------------------------------- | ------- |
| FR-26 | Memory explorer           | `/app/operations/memory`           | Planned |
| FR-27 | Memory item details       | `/app/operations/memory/:memoryId` | Planned |
| FR-28 | Event ledger              | Runtime                            | Planned |
| FR-29 | Runtime resource overview | `/app/operations/runtime`          | Planned |
| FR-30 | Memory residency timeline | Runtime                            | Planned |
| FR-31 | Resource history          | `/app/research/runtime`            | Planned |

## Research

| FR    | Requirement                               | Screen                                        | Status  |
| ----- | ----------------------------------------- | --------------------------------------------- | ------- |
| FR-32 | Experiment registry                       | `/app/research/experiments`                   | Planned |
| FR-33 | Configure an experiment                   | `/app/research/experiments/new`               | Planned |
| FR-34 | Run and monitor an experiment             | `/app/research/experiments/:runId`            | Planned |
| FR-35 | Compare baselines and the proposed policy | `/app/research/compare`                       | Planned |
| FR-36 | Research analytics                        | `/app/research/analytics`                     | Planned |
| FR-37 | Experiment reproducibility (run manifest) | Run detail                                    | Planned |
| FR-38 | Research report export                    | `/app/research/reports`, `/reports/:reportId` | Planned |

## Ingestion and cross-cutting

| FR    | Requirement                                   | Screen                           | Status   |
| ----- | --------------------------------------------- | -------------------------------- | -------- |
| FR-39 | Process a recorded video                      | Robot detail (recording sources) | Planned  |
| FR-40 | Ingestion and processing status               | Robot detail, overview           | Planned  |
| FR-41 | Consistent search and filtering               | All lists                        | Planned  |
| FR-42 | Cross-link related entities                   | All detail screens               | Planned  |
| FR-43 | Global notifications                          | Toasts                           | Planned  |
| FR-44 | Loading, empty, unavailable, and error states | All screens                      | Planned  |
| FR-45 | Data freshness and provenance                 | Badges on every value            | Planned  |
| FR-46 | Access and data protection                    | Proxy, services                  | Planned  |
| FR-47 | Demographic and secondary analytics           | Not built                        | Deferred |

## Added during planning

| FR    | Requirement                                                                                         | Screen        | Status  |
| ----- | --------------------------------------------------------------------------------------------------- | ------------- | ------- |
| FR-48 | User slug and photo for each object, shown next to the system id                                    | Object detail | Planned |
| FR-49 | Text commands, including "go to where you last saw my mug"; manipulation is answered as unavailable | Drive         | Planned |
| FR-50 | Runtime lists of what is kept in RAM, released to disk, and folded into an interval                 | Runtime       | Planned |

## Non-functional requirements carried into the build

- WCAG 2.2 AA: keyboard access, visible focus, labelled controls, text alternatives for charts.
- Every value shows its provenance (live, recorded, simulated, mock). Mock values are never presented as findings.
- No secrets in the client bundle and no tokens in localStorage. The mock session uses an httpOnly cookie.
- Authentication is enforced on the server route boundary (`proxy.ts`), not only in the UI.
- Capability-aware UI: controls a source cannot support are disabled with the reason.
- Destructive operations and consequential robot commands require confirmation.
- Unknown or foreign ids return "not found" rather than another user's data.
