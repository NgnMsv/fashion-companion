# How Fashion Companion works

A plain-language walkthrough: what is where, how data moves, how the recommendation logic works, and why each tool was chosen.

## The short version

Fashion Companion is a React app written in TypeScript. It has no server. Your wardrobe is stored in the browser, outfits are computed in the browser, and the built app is a folder of static files on GitHub Pages.

The code is split into three layers that only depend downwards:

```
features/   screens and components        (React)
   │
data/       where things are stored       (repository + TanStack Query hooks)
   │
engine/     how outfits are judged        (pure TypeScript, no React, no browser APIs)
```

The engine knows nothing about React or storage. That is why it can be tested with plain function calls, and why it could run on a server unchanged.

## Folder structure

```
index.html                    The one HTML page; picks the theme before first paint
vite.config.ts                Build and test configuration (note `base`)
build/static-pages.ts         Build step: one HTML file per page, plus 404.html
src/
  main.tsx                    Creates the repository, the query client, and starts React
  App.tsx                     Decides which page to show
  index.css                   Tailwind, colour tokens for both themes, the web font
  engine/
    types.ts                  The data model: Item, Outfit, Preferences, Request
    color.ts                  Colour maths: hex -> hue/lightness, colour families, neutrals
    tree.ts                   THE DECISION TREE: questions, leaves, evaluate()
    recommend.ts              Builds combinations, judges them, ranks, picks a varied few
  data/
    repository.ts             The interface every storage backend implements
    indexedDbRepository.ts    The real one: IndexedDB
    memoryRepository.ts       In-memory: for tests and as a fallback
    queries.tsx               React hooks (TanStack Query) over the repository
    sample.ts                 The 22-piece sample wardrobe
  features/
    shell/                    Header, navigation, language and theme switches
    onboarding/               Welcome screen and the three style questions
    outfits/                  Looks page, outfit card, "Why this outfit?" panel, tree diagram
    wardrobe/                 Grid, filters, add/edit form, photo handling
    style/                    "My style" page (edit preferences)
    about/                    Project history, the full tree, data reset
  i18n/                       en.ts, de.ts, and a small typed translate function
  lib/                        router.tsx (client-side routing), theme.ts
  ui/                         Shared pieces: Garment drawings, buttons, dialog, states
  test/                       Test setup and helpers
e2e/app.spec.ts               End-to-end tests (Playwright)
```

## The data model

Defined in `src/engine/types.ts`.

| Type          | Fields                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| `Item`        | `id`, `name`, `kind` (T-shirt, jeans, coat, …), `color` (hex), `seasons`, `formality` (1 sporty – 4 formal), `available`, `hasPhoto` |
| `Preferences` | `style` (minimal, classic, bold), `favoriteColors`, `occasions`                          |
| `Request`     | `occasion` (workout, everyday, office, event) and `season`                               |
| `Outfit`      | `top`, `bottom`, `shoes`, and optionally `outerwear`                                     |

The `kind` decides the category: a `sweater` is a top, a `coat` is outerwear. This is a lookup table (`KINDS`), so a kind can never end up in the wrong category.

## How the recommendation logic works

### 1. The decision tree (`engine/tree.ts`)

An outfit is judged by walking down a tree of yes/no questions until a leaf is reached. The leaf is the verdict.

```
Does every piece suit the occasion?
├─ no  → REJECTED: wrong for the occasion
└─ yes → Can every piece be worn in this season?
   ├─ no  → REJECTED: wrong for the season
   └─ yes → Are the pieces equally dressed-up?
      ├─ no  → REJECTED: mixed dress levels
      └─ yes → More than one colour, neutrals aside?
         ├─ no  → Any colour besides neutrals?
         │  ├─ yes → Is it a favourite colour?
         │  │  ├─ yes → GREAT (95): your colour, grounded
         │  │  └─ no  → GOOD (80): one colour, kept simple
         │  └─ no  → Light–dark contrast between top and bottom?
         │     ├─ yes → Prefers minimal?  yes → GREAT (90)   no → GOOD (72)
         │     └─ no  → Prefers minimal?  yes → GOOD (70)    no → OKAY (50)
         └─ yes → Are the colours neighbours on the colour wheel?
            ├─ yes → Is one a favourite?  yes → GREAT (90)   no → GOOD (76)
            └─ no  → Are they two opposite colours?
               ├─ yes → Prefers bold?     yes → GREAT (88)   no → OKAY (52)
               └─ no  → REJECTED: colours clash
```

Three things about how it is built:

- **The tree is data.** `TREE` is a nested object of question nodes and leaf nodes. The logic of each question is a small function in `TESTS`. To change a rule, you edit one of those two places.
- **Practical questions come first.** An outfit that is wrong for the occasion is never judged on colour.
- **The numbers are named constants.** For example: a piece may be one dress level away from what the occasion calls for (none for a workout); hues within 45° are "neighbours"; hues 135° or more apart are "opposites"; top and bottom need a lightness difference of 0.25 to count as contrast.

### 2. Colour (`engine/color.ts`)

Colours are stored as hex and converted to hue, saturation and lightness when needed.

- `colorFamily()` names a colour the way people do: black, navy, beige, red, and so on.
- **Neutrals** (black, white, grey, beige, brown, navy) go with everything, so the tree ignores them when it compares colours. Jeans count as neutral whatever their shade, because that is how people wear them.
- `colorRelation()` says whether two colours are neighbours, opposites, or clashing, based on their distance on the colour wheel.

### 3. Explanation: why the app cannot explain wrongly

`evaluate(outfit, context)` returns the leaf **and** the list of steps it took: which question, which answer, and the facts behind the answer (the names of the pieces or colours involved).

The "Why this outfit?" panel renders exactly that list. There is no second piece of code that "describes" the decision, so the explanation cannot drift away from the real logic. The wording lives in the translation files; the engine only records facts.

### 4. From wardrobe to three looks (`engine/recommend.ts`)

```
recommend({ items, preferences, request, hidden, seed })
  1. Check there is at least one available top, bottom and pair of shoes
       → otherwise: { status: 'missing-pieces', missing: [...] }
  2. Build every combination of top × bottom × shoes
       In autumn and winter, add outerwear if a piece suits the season and occasion
  3. Run each combination through the tree
  4. Drop the rejected ones (counting why) and the ones the user removed
       → if none are left: { status: 'no-match', rejections: [...] }
  5. Sort by score; equal scores are ordered by a hash of the seed ("Shuffle")
  6. Pick three, lowering the score of outfits that reuse an already-picked piece
       → { status: 'ok', recommendations: [...] }
```

The function is **pure and deterministic**: the same input always gives the same output. "Shuffle" does not use randomness; it changes the `seed`, which reorders outfits that have the same score. This is what makes the engine easy to test.

The three possible results (`ok`, `missing-pieces`, `no-match`) are a TypeScript union, so the screen is forced to handle each one. That is where the empty states come from: "Almost there: still missing shoes", or "No look passes the rules: 12 × wrong for the season".

## How data flows

```
 click "Save"                                    screen re-renders
      │                                                 ▲
      ▼                                                 │
 useSaveItem()  ──►  repository.saveItem()  ──►  invalidate ['items']  ──►  useItems() refetches
 (TanStack Query        (IndexedDB)                (TanStack Query)
   mutation)
```

- **The repository** (`data/repository.ts`) is an interface with a dozen async methods: `listItems`, `saveItem`, `getPhoto`, `getPreferences`, and so on. Components never touch IndexedDB directly.
- **Two implementations**: `indexedDbRepository.ts` for real use, `memoryRepository.ts` for tests and for browsers that block storage.
- **The hooks** (`data/queries.tsx`) wrap the repository with TanStack Query. Reads are cached under a key; every write invalidates the keys it affects, so every screen showing that data updates.
- **Outfits are not stored.** They are computed from items + preferences + request with `useMemo` whenever one of those changes. Only the user's marks on outfits ("saved", "not for me") are stored.

### Why IndexedDB, not localStorage

Users can add photos. localStorage only holds strings, is capped at about 5 MB, and blocks the page while it reads. IndexedDB stores image Blobs directly, has a much larger quota, and is asynchronous. The IndexedDB API is callback-based, so the repository wraps it in two small promise helpers instead of adding a library.

localStorage is still used for two tiny values, the theme and the language, because they must be read synchronously before the first paint.

### Why TanStack Query for local data

It is usually used for server data, so this was a deliberate choice:

- The repository is asynchronous, exactly like an API client.
- Several screens read the same data, and a write on one must refresh the others. "Invalidate after a mutation" does that without hand-written state.
- Loading and error states come for free, and the app shows both.
- If the repository is replaced by a real API, the hooks and components stay unchanged.

What it would be overkill for: the outfits themselves, which are derived, not fetched. Those are a plain `useMemo`.

### Photos

`features/wardrobe/photo.ts` handles a chosen photo entirely in the browser: it scales the image down to 720 px, re-encodes it as WebP, and reads the average colour of the centre to pre-fill the colour field. The Blob is stored in IndexedDB under the item's id. Nothing is uploaded.

## Routing and GitHub Pages

The app has four pages: `/` (Looks), `/wardrobe/`, `/style/`, `/about/`.

- `lib/router.tsx` is a small router on the History API: `<Link>` renders a real `<a href>` and turns plain clicks into `pushState`; `usePath()` re-renders on navigation (React's `useSyncExternalStore`).
- **The sub-path.** The repository is a "project site", served at `https://ngnmsv.github.io/fashion-companion/`. Vite's `base` is set to `/fashion-companion/`, which prefixes all asset URLs; the router adds the same prefix to links and strips it when reading the URL.
- **Deep links.** GitHub Pages only serves files that exist. `build/static-pages.ts` copies `index.html` into `wardrobe/`, `style/` and `about/` after the build, so a direct link or a refresh on any page finds a real file. `404.html` covers unknown addresses.

## Internationalisation

`i18n/en.ts` is the source of truth for which text keys exist. `de.ts` is typed as "an object with exactly those keys", so a missing German text is a compile error. `t('key', { params })` fills in placeholders. A test also checks that both languages use the same placeholders in every text.

The first language is German for German browsers, English otherwise; the choice is saved. The sample wardrobe's item names are created in the language that is active when it is loaded.

No i18n library: two languages and about 280 short texts do not need one.

## Styling and design

- Tailwind CSS v4. Colours are CSS variables defined once per theme in `index.css`; components use names like `bg-surface` and `text-muted` and never know which theme is active.
- The interface is neutral (paper and ink) so the clothes carry the colour. There is one accent colour.
- One web font, Fraunces, self-hosted and limited to the Latin subset, used for headlines. Body text uses system fonts.
- Garments are drawn as SVG by `ui/Garment.tsx`, filled with the item's colour. No product photos, no brands.

## Accessibility

- Choice pills are native radio buttons and checkboxes underneath, so arrow keys, Space and screen-reader announcements work without custom code.
- The add/edit form is a native `<dialog>`: focus is trapped inside, Escape closes it, and focus returns to the button that opened it.
- After a page change, focus moves to the new page's heading.
- "Why this outfit?" is a disclosure button with `aria-expanded`; results and removals are announced through a live region.
- Errors in the form are linked to their fields (`aria-invalid`, `aria-describedby`).
- There is no drag-and-drop, so there is nothing that needs a keyboard alternative.
- `prefers-reduced-motion` switches off the animations.

## Testing

| Level       | Tool                           | What it covers                                                                                 |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Unit        | Vitest                         | Colour maths; every leaf of the tree is reached by a test; ranking, variety, outerwear, edge cases; filters; routing; translations |
| Component   | Vitest + React Testing Library | Onboarding, outfit cards, the Why panel, save/remove/undo, wardrobe filters, add/edit/delete, language and theme |
| End-to-end  | Playwright                     | The built app in a real browser, desktop and phone size: preferences → add pieces → explained outfit; persistence across reloads; deep links; keyboard-only use |

Component tests use the in-memory repository, which is possible because of the repository interface. The IndexedDB implementation is covered by the end-to-end tests, which reload the page and check that the data is still there.

## Deployment

`.github/workflows/ci.yml` runs on every push: install, lint, typecheck, unit tests, build, end-to-end tests. On `main`, if everything passes, the `dist/` folder is published with GitHub's official Pages actions. A failing test blocks the deploy.

## Why each tool

| Tool                          | Why                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| React                         | The screens are compositions of small, data-driven components                               |
| TypeScript (strict, no `any`) | The data model, the tree's question and leaf ids, and the translation keys are all checked   |
| Vite                          | Fast dev server and a simple static build; handles the sub-path with one `base` setting     |
| Tailwind CSS                  | Styles next to the markup; both themes from one set of tokens                               |
| TanStack Query                | Caching, loading/error states and refresh-after-write over an async repository              |
| IndexedDB                     | Stores photos as Blobs, asynchronously, with enough quota                                   |
| Vitest                        | Shares Vite's config; fast enough to run 165 tests in about two seconds                     |
| React Testing Library         | Tests find elements by role and name, which doubles as an accessibility check               |
| Playwright                    | Tests the real build, real IndexedDB, and real keyboard behaviour                           |
| GitHub Actions + Pages        | Free, next to the code, and every deploy is gated by the full test suite                    |

## Decisions I can explain in an interview

- **A hand-written tree instead of a trained model.** Every rule can be read, tested and explained to the user. The 2024 version trained a model per user, which needed a server and could not say why it liked an outfit.
- **The explanation is the evaluation.** The panel shows the recorded path, not a description written separately.
- **A pure engine.** No React, no storage, no randomness. Same input, same output.
- **A repository interface.** Storage can be swapped (tests already do), and a real API would slot in the same way.
- **Result types that force the UI to handle every case.** Empty states are not an afterthought; the compiler asks for them.
- **Native elements before custom widgets.** Radio buttons, checkboxes, `<dialog>`, `<details>`, `<select>`: accessible by default, and less code.
- **Few dependencies.** React, TanStack Query, and one font at runtime. The router, i18n and IndexedDB wrapper are small enough to own.
