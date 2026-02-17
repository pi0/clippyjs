# AGENTS.md

> Technical reference for AI agents working on this codebase.

## Overview

ClippyJS is a modern ESM rewrite of [Clippy.JS](http://smore.com/clippy-js) — it adds nostalgic Windows 98-style animated assistant characters (Clippy and friends) to any website. Zero runtime dependencies, fully tree-shakeable, lazy-loaded agents with embedded sprites and sounds.

- **Package:** `clippyjs` (npm)
- **Repository:** `pi0/clippyjs`
- **License:** MIT

## Architecture

```
src/
├── index.ts              # Main exports: { Agent, initAgent }
├── agent.ts              # Core Agent class (show, hide, speak, moveTo, animate, drag)
├── animator.ts           # Frame-by-frame sprite sheet animation engine
├── balloon.ts            # Speech bubble with typewriter effect and auto-repositioning
├── queue.ts              # Sequential action queue
├── types.d.ts            # PNG module type declaration
└── agents/
    ├── index.ts           # Re-exports all 10 agents
    └── <name>/            # Per-agent directory (bonzi, clippy, f1, genie, genius, links, merlin, peedy, rocky, rover)
        ├── index.ts       # Lazy-load entry: { agent(), sound(), map() }
        ├── agent.ts       # Animation data (frames, overlays, branching, sounds)
        ├── sounds-mp3.ts  # Base64-encoded MP3 audio
        └── map.png        # Sprite sheet image
```

### Key classes

| Class      | File              | Role                                                         |
| ---------- | ----------------- | ------------------------------------------------------------ |
| `Agent`    | `src/agent.ts`    | Main API surface — lifecycle, speech, movement, drag, queue  |
| `Animator` | `src/animator.ts` | Sprite rendering, frame stepping, exit branching, sound sync |
| `Balloon`  | `src/balloon.ts`  | Speech balloon with typewriter animation, auto-positioning   |
| `Queue`    | `src/queue.ts`    | Sequential action queue with idle callback                   |

### Agent data format

Each agent exports three lazy loaders (`AgentLoaders` interface):

```ts
{ agent: () => import("./agent.ts"), sound: () => import("./sounds-mp3.ts"), map: () => import("./map.png") }
```

These can be passed to `initAgent()`:

```ts
import { initAgent } from "clippyjs";
import { Clippy } from "clippyjs/agents";

const agent = await initAgent(Clippy);
```

Animation data structure (from `agent.ts`):

```ts
{
  overlayCount: number,
  framesize: [width, height],
  sounds: string[],
  animations: {
    [name: string]: {
      frames: Array<{
        duration: number,
        images: [x, y][],
        sound?: string,
        exitBranch?: number,
        branching?: { branches: Array<{ weight: number, frameIndex: number }> }
      }>,
      useExitBranching?: boolean
    }
  }
}
```

### Package exports

```
clippyjs            → Agent class
clippyjs/agents     → All 10 agents
clippyjs/agents/*   → Individual agents (bonzi, clippy, f1, genie, genius, links, merlin, peedy, rocky, rover)
```

## Tooling

| Tool               | Purpose                          |
| ------------------ | -------------------------------- |
| `pnpm` (v10)       | Package manager                  |
| `obuild`           | Bundle builder (rolldown-based)  |
| `vite`             | Dev server (`pnpm dev`)          |
| `tsgo`             | Type checking (`pnpm typecheck`) |
| `oxlint` + `oxfmt` | Linting and formatting           |
| `automd`           | README badge/section formatting  |
| `changelogen`      | Changelog and release management |

### Build

`build.config.mjs` uses obuild with a custom `inline-png` rolldown plugin that converts `.png` sprite sheets to base64 data URIs. Output goes to `dist/` with per-agent chunk naming (`dist/agents/<name>/`).

### Scripts

| Script           | Command                                    |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Start Vite dev server                      |
| `pnpm build`     | Build with obuild                          |
| `pnpm test`      | Lint + typecheck                           |
| `pnpm typecheck` | Type check via tsgo                        |
| `pnpm lint`      | oxlint + oxfmt check                       |
| `pnpm fmt`       | automd + oxlint fix + oxfmt                |
| `pnpm release`   | Test, build, changelog, publish, push tags |

## Code Conventions

- **ESM only** — `"type": "module"` in package.json
- **Explicit extensions** — imports use `.ts` in source (e.g., `import("./agent.ts")`)
- **No runtime dependencies** — everything is self-contained
- **Base64 assets** — sprites and sounds are embedded as base64 data URIs in the bundle
- **Lazy loading** — agent data is dynamically imported, only loaded when needed
- **DOM-based rendering** — no canvas, uses CSS `background-position` on sprite sheets
- **Action queue** — all agent actions (speak, animate, moveTo) are queued sequentially

## CI/CD

Two GitHub Actions workflows in `.github/workflows/`:

- **`checks.yml`** — Runs on push/PR: install, typecheck, lint, build
- **`autofix.yml`** — Runs on push/PR: auto-format via `pnpm fmt` and commit fixes

## Maintenance

> Agents must always keep `README.md` and `AGENTS.md` up to date when making changes to the project.

- When adding/removing agents, update: `src/agents/index.ts`, `build.config.mjs` entries, `package.json` exports, and both `README.md` and `AGENTS.md`
- When changing the public API on `Agent`, update the API section in `README.md` and the architecture section in `AGENTS.md`
- When modifying build config or tooling, update the tooling/scripts sections in `AGENTS.md`
- When changing CI workflows, update the CI/CD section in `AGENTS.md`
- Run `pnpm fmt` before committing to ensure consistent formatting
- Run `pnpm test` (lint + typecheck) to validate changes
