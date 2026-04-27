# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create your local env file from the template (gitignored).
cp .env.example .env.local
# then fill in the VITE_* values (see "Environment & auth" below)

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment & auth

The app relies on a few Vite env vars. Supabase URL/key live in committed `.env`;
**PIN gate and auto-login credentials must live in `.env.local`** (gitignored
via `*.local`) so they never end up in the repo.

Required keys (see `.env.example`):

| Var                       | Purpose                                                   |
| ------------------------- | --------------------------------------------------------- |
| `VITE_PIN_CODE`           | 6-digit PIN that gates the app on launch.                 |
| `VITE_AUTO_EMAIL`         | Supabase user used by the PIN auto-login.                 |
| `VITE_AUTO_PASS`          | Password for that user.                                   |
| `VITE_ALLOW_AUTO_SIGNUP`  | Optional. `"true"` only for the very first install.       |

### Blocking behaviour when env is missing

If any of `VITE_PIN_CODE` / `VITE_AUTO_EMAIL` / `VITE_AUTO_PASS` is missing, the
PIN keypad is **disabled** and a red message is shown: *"Configuration manquante
— définis VITE_PIN_CODE, VITE_AUTO_EMAIL, VITE_AUTO_PASS dans .env.local"*.
This is intentional: no hardcoded fallback means no silent fallback to a
committed default.

### Session persistence & auto-login

- The Supabase client is configured with `persistSession: true` and
  `autoRefreshToken: true`, so a valid session survives reloads and is
  refreshed transparently from `localStorage`.
- On PIN entry, `PinScreen` first calls `supabase.auth.getSession()`. If a
  valid session for `VITE_AUTO_EMAIL` is already restored, **no network
  round-trip happens** — `onSuccess()` is fired immediately.
- Otherwise a single `signInWithPassword` call runs.
- If sign-in fails and `VITE_ALLOW_AUTO_SIGNUP=true`, a one-shot bootstrap
  path tries `signUp` then `signInWithPassword` again. **Off by default** so
  a wrong password or transient network error cannot silently provision a
  new account in steady state.

### Data sync (BA sales / FJM ops)

The hooks `useBaSalesMonth`, `useBaSalesYear`, and `useFjmProOps` are backed by
`@tanstack/react-query` with stable cache keys, so:

- Multiple components mounting the same slice (e.g. `AppLayout` + `BilanPage`
  both asking for the current year) share **one fetch and one cache entry**.
- A 5 s `staleTime` absorbs back-to-back refetches when navigating between
  pages.
- Each hook also opens a Supabase realtime channel and invalidates the cached
  query on `INSERT/UPDATE/DELETE` events, so writes from the FJM side appear
  in BeActiv Business near-instantly.
- React Query's `focusManager` handles focus + `visibilitychange` (web and
  mobile) — returning to the app refetches stale slices automatically.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
