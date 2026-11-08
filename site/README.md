# Static results frontend

Configuration lives in `vite.config.ts`, with native `#lib` imports in package.json.
The neutral light/dark shadcn theme uses Svelte orange `#eb4f27` for primary actions
and selected indicators. Dark text on orange keeps action text readable. Pass/fail
indicators keep semantic green/red colors.

## Dependency compatibility

All direct JavaScript packages were checked against npm's stable `latest` tags.
The root uses TypeScript 7.0.2. `svelte-check` 4.7.8 requires TypeScript 6 alongside
TypeScript 7: the site uses TypeScript 6.0.3 as its compatibility API and aliases
latest TypeScript 7.0.2 as `@typescript/native`, running checks with `--tsgo`.
This is the only direct package intentionally below its latest major.

Bits UI 2.20.6 requests runed ^0.35.1, whose optional Kit peer only allows Kit 2.
The workspace overrides runed to 0.38.0, which supports Kit 3. Component interaction
checks cover accordion, dialog, tabs, and progress integration with that release.
Obsolete Undici 6 security overrides were removed: Undici is now 8.12.4 and OpenAI
7.53.0 supports it. Frozen installation and peer checks pass.

Components are vendored from the official shadcn-svelte `vega` registry, using its
neutral theme. `scripts/fetch-ui.py` records the source and maps registry import
placeholders to native `#lib` paths and Lucide icons. Components retain the
upstream MIT license. The script overwrites components; review its changes when
updating them. The initial CLI/config bootstrap failed; direct registry retrieval
made the component sources explicit. Normal checks use `svelte-kit sync`.

## Verification

`pnpm test:site` compares current scores, ranking, speed, and response metadata
against the original EJS ranking calculation captured at commit
5288732327023915ac0b2ee1206113a8dd8f1c10. It also checks legacy ranking, local tie
ordering, missing metrics, URL restoration and search, tabs, download links,
keyboard dialog opening, Escape/focus return, escaped sample/context text,
and theme persistence. Tests run separately from benchmark component suites;
no benchmark generation or provider calls occur.

`pnpm verify:site` checks every generated result page and confirms JSON downloads
are byte-for-byte identical to source data. The adapter uses strict static-output
validation with explicit entries for current/v1 runs and index URLs.

Browser visual checks and screenshots still require an available computer-use
host. During implementation that host was unavailable. DOM interaction tests do
not establish mobile appearance, browser hydration behavior, or screenshot proof.
The pull request must remain draft pending that visual review.
