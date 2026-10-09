# From Smart Closet (2024) to Fashion Companion (2026)

What changed between the two versions, and why. The 2024 code is still online and was used only as a feature reference; no code, layout or styling was carried over.

- 2024 frontend: <https://github.com/NgnMsv/Smart-Closet-Frontend>
- 2024 backend: <https://github.com/NgnMsv/Smart-Closet-Backend>

## At a glance

|                     | 2024: Smart Closet                                           | 2026: Fashion Companion                                      |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Runs on             | React app + Django API + Celery worker + RabbitMQ            | The browser only; static files on GitHub Pages               |
| Language            | JavaScript, Python                                           | TypeScript (strict, no `any`)                                |
| Build tool          | Create React App                                             | Vite                                                         |
| Styling             | Material UI, Font Awesome, one CSS file per page             | Tailwind CSS, design tokens, own SVG drawings                |
| Recommendation      | A scikit-learn decision tree, trained per user on likes and dislikes | A hand-written decision tree in TypeScript            |
| Explanation         | None                                                         | "Why this outfit?": every question, answer and the verdict   |
| Storage             | Server database; photos on Cloudinary                        | IndexedDB in the browser; photos never leave the device      |
| Accounts            | Sign-up and login (JWT)                                      | None needed                                                  |
| Interface language  | Persian                                                      | English and German, switchable                               |
| Tests               | The default placeholder test                                 | 165 unit and component tests, 8 end-to-end scenarios         |
| Accessibility       | Not considered                                               | Keyboard, screen reader, contrast, reduced motion            |
| Deployment          | Docker, run locally                                          | GitHub Actions → GitHub Pages on every push                  |

## What the 2024 version did

1. Sign up, log in, land on a dashboard of six buttons.
2. Create a named closet.
3. Add an item: choose closet, type (shirt, pants, footwear) and two usages (formal, casual, sport, general), then upload or take a photo. The photo was sent to remove.bg to cut out the background, uploaded to Cloudinary, and its dominant colour was read with ColorThief.
4. "Know your taste": the app showed random outfits and the user answered like or dislike.
5. A scheduled job retrained a `DecisionTreeClassifier` for every user from those answers. The features were the RGB values of the three items and their usage tags.
6. "Generate combination": pick a usage; the server drew random outfits until the model gave one a "liked" probability of at least 0.5.
7. "Take it" marked the three items as unavailable.

## What changed, and why

### The recommendation logic

| 2024 | 2026 | Why |
| ---- | ---- | --- |
| A tree learned by scikit-learn | A tree written by hand | The learned tree split on scaled RGB numbers, which cannot be explained to a person. Hand-written rules can be read, tested one by one, and shown to the user. |
| Needs many ratings before it works; fails for a new user because no model file exists | Works with the first three pieces | A demo has to show value in seconds, and so does a real first visit. |
| Random draws until one passes; never ends if nothing can pass | Judges every combination once, then ranks | Deterministic, testable, and able to say *why* nothing passed. |
| Inputs: colour as RGB, two usage tags | Inputs: colour family and relations, dress level, season, the user's style and favourite colours | These are the terms people actually use when they talk about clothes. |
| Likes and dislikes train the model | "Save" keeps a look; "Not for me" removes that combination | Without a learning model, feedback has a simpler, honest meaning. |

What was kept: the idea that a decision tree decides, the occasion as the main input, feedback on suggestions, and marking pieces as unavailable.

What was given up: personal learning. The 2026 tree adapts through the stated preferences (style and favourite colours), not through behaviour. That is a real trade-off, made for explainability and for running without a server.

### The data model

| 2024 | 2026 | Why |
| ---- | ---- | --- |
| Types: shirt, pants, footwear | 13 kinds in 4 categories, including optional outerwear | Closer to a real wardrobe; outerwear is added in autumn and winter. |
| `usage_1`, `usage_2` | One dress level (sporty to formal) per piece; the occasion is part of the request | Two free tags allowed contradictions; a level can be compared. |
| No season | Seasons per piece | Needed for any sensible suggestion. |
| No name | Name | Needed for search and for explanations ("Not right for Office: Grey joggers"). |
| Several closets per user | One wardrobe | The closets added a step and were not used by the logic. |
| `accessible` flag | `available` flag | Same idea, kept. |

### The interface

| 2024 | 2026 | Why |
| ---- | ---- | --- |
| A dashboard of six buttons; every click reloads the page | Four pages with client-side navigation; a tab bar on phones | Fewer steps, and it works one-handed. |
| No onboarding | Three short questions, or one click for a sample wardrobe | The first minute decides whether someone stays. |
| A list of item photos per closet | A grid grouped by category, with search and four filters | A wardrobe grows; finding things has to stay easy. |
| Add and remove; no editing | Add, edit and delete in one dialog | Mistakes happen. |
| Three image boxes and Yes/No buttons | Outfit cards with a verdict, a one-line reason, and the full explanation on demand | The explanation is the point of the product. |
| Feedback in pop-ups that vanish after a second | Inline status messages, announced to screen readers, with Undo | Timed pop-ups are easy to miss and impossible for some users. |
| No empty or error states | Designed states for an empty wardrobe, missing categories, no match, and storage errors | These are the moments where users give up. |
| One theme | Light and dark | Expected today, and cheap with design tokens. |

### The code

| 2024 | 2026 | Why |
| ---- | ---- | --- |
| `fetch('http://localhost:8000/…')` repeated in every page | One repository interface; components never know where data lives | One place to change, and tests can swap in an in-memory version. |
| A dozen `useState` booleans per screen | Server-style state in TanStack Query; outfits derived with `useMemo`; small local state | Less state to keep in sync means fewer impossible states. |
| No types | Strict TypeScript; question ids, leaf ids and translation keys are all checked | Renaming a rule or forgetting a translation is a compile error. |
| Logic mixed into components and views | A pure `engine/` folder with no React and no browser APIs | The most important code is the easiest to test. |
| Third-party services with API keys in the frontend | No third-party services | Nothing to pay for, nothing to leak, nothing to break. |

### What was removed on purpose

- **Accounts and login.** With data in the browser there is nothing to log in to.
- **Background removal (remove.bg).** A paid API for a cosmetic effect; the app draws its own illustrations instead and still accepts photos.
- **Cloud image hosting.** Photos now stay on the device, which is also the better privacy story.
- **The taste-training screen.** It existed to feed the model; without a model it has no job.
- **Persian.** The new version targets English- and German-speaking users. The i18n layer would accept a third language, but right-to-left layout was out of scope.

## Questions an interviewer might ask

**"Why did you drop the machine learning?"**
Because I could not explain its decisions to the user, and because it needed a server, a task queue and a training set before it did anything useful. A hand-written tree gives a worse answer to "what does this one person like?" and a much better answer to "why did you suggest this?". For this product I chose the second.

**"Isn't a hand-written tree just a pile of if-statements?"**
It is a tree as data: question nodes and leaf nodes. One generic function walks it and records the path. That is why the explanation panel and the full-tree diagram need no rule-specific code, and why a test can check that every leaf is reachable.

**"What would you do next?"**
Bring learning back without losing explanations: keep the hand-written tree as the starting point and let saved and removed looks adjust the leaf scores. And add an import/export so a wardrobe can move between devices.

**"What would change if this needed a backend?"**
One file. A new class implementing the `WardrobeRepository` interface with HTTP calls. The hooks, the components and the engine stay as they are.
