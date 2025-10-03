# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts Next.js App Router segments; group features under route folders with colocated `page.tsx`, `layout.tsx`, and loaders.
- `components/` keeps shared UI; prefer domain-prefixed subfolders (e.g., `dashboard/*`) and keep Tailwind styles inline.
- `lib/` stores server utilities such as database access and webhook handlers; isolate integrations under `lib/integrations` when adding new providers.
- `types/` centralizes shared TypeScript shapes; update the nearest domain file rather than scattering `type` exports.
- Static assets live in `public/`; configuration files like `tailwind.config.ts` and `middleware.ts` sit at the root for easy discovery.

## Build, Test, and Development Commands
- `npm run dev`: launches the Next dev server with hot reload on port 3000.
- `npm run build`: produces the optimized production bundle; run before shipping infra changes.
- `npm run start`: serves the production build locally; use for pre-deploy smoke tests.
- `npm run lint`: executes the Next/ESLint suite; required before opening a PR.

## Coding Style & Naming Conventions
- TypeScript-first codebase; use `.tsx` for React components and `.ts` for utilities or server helpers.
- Two-space indentation in application code, four spaces only where existing config files demand it.
- Components and hooks use `PascalCase` and `camelCase`; async server handlers end with `Handler` for clarity.
- Tailwind utility classes belong directly on JSX; extract shared patterns into `components/ui/` helpers.
- Rely on ESLint's Next config and the strict `tsconfig.json` to catch regressions before review.

## Testing Guidelines
- No automated test harness yet; at minimum run `npm run lint` and validate critical flows manually in the dev server.
- When adding tests, follow `feature-name.test.ts` naming and place them near the code in `__tests__` folders under the relevant route or module.
- Document any manual verification steps in the PR body so reviewers can reproduce them quickly.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) to mirror the existing history.
- Keep commits focused and rebased; avoid merging `main` into feature branches during review.
- PRs should summarize scope, list verification steps, and link related issues or integration notes (e.g., Clerk, Fathom).
- Attach screenshots or short clips for UI changes and call out environment variables when they need updates.
