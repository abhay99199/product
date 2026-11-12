# Findwell

A responsive product-discovery catalog with a Supabase-powered administrator workspace. Product records, categories, publication state, and click analytics come from the database; the client contains no sample product records.
## Local setup
1. Create a free Supabase project.
2. In the Supabase SQL Editor, run `supabase/migrations/202611040001_initial_schema.sql`. This creates the tables, starter categories, indexes, update trigger, public image bucket, analytics RPC, and row-level security policies.
3. In Supabase Authentication, create the first administrator user. Keep public sign-ups disabled. Copy that user's UUID from the Auth users list.
4. In the SQL Editor, grant that account administrator access:

  ```sql
  insert into public.admins (user_id)
  values ('AUTH_USER_UUID');
  ```
5. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's URL and publishable/anon key. Never put a service-role key in a `VITE_` variable or browser code.
6. Install dependencies and start the development server:

  ```sh
  npm install
  npm run dev
  ```
Sign in at `/admin`. The app has no public account-creation flow. Admin access is granted only to user IDs present in `public.admins`; database and storage policies enforce that check independently of the UI.

For local password recovery, add `http://127.0.0.1:5173/admin/reset-password` under Supabase **Authentication → URL Configuration → Redirect URLs**. If you browse the app using `localhost` instead, add `http://localhost:5173/admin/reset-password` as well. Use **Forgot password?** on `/admin` to request a new email link; the reset form is at `/admin/reset-password`.
## Deploy

For Vercel, import the repository, keep the build command as `npm run build`, set the output directory to `dist`, and add the two Supabase environment variables in project settings. `vercel.json` rewrites direct product and admin routes to the SPA entry point.

For Cloudflare Pages, use `npm run build` with `dist` as the output directory. The `public/_redirects` rule supports direct route loads. Set the same environment variables in the Pages project settings.
## Security and operations

- Anonymous visitors can read published products and categories only. Drafts are visible to authenticated administrators.
- Product writes, category writes, analytics review, and image uploads require a user ID in the admins table. Click inserts are restricted to published products.
- The `product-images` bucket is public-read so published image URLs can load without visitor accounts; uploads, replacements, and deletion are administrator-only.
- Product links are checked for absolute HTTP(S) URLs in the form and constrained to HTTP(S) at the database layer.
- Product and category changes are subscribed to through Supabase Realtime, so active catalog pages refresh when administrators save changes.
- Images are resized to a maximum 1800px edge and encoded as WebP in the browser. The bucket limits uploads to 5 MB after optimization; the form accepts source images up to 15 MB.
- The frontend uses only the Supabase publishable/anon key. RLS is the security boundary; do not disable it or expose a service-role key.
## Free-tier notes

The app uses free/open-source client libraries and is designed to work within free hosting and database tiers. Supabase and hosting-provider quotas, storage/egress limits, inactivity policies, and plan terms can change. Free projects may pause or require reactivation after inactivity, and exceeding a provider's current included limits may require waiting for a quota reset, reducing usage, or upgrading. Check each provider's current pricing and limits before launch. Product images count toward storage and bandwidth usage; WebP optimization keeps them smaller.

## Checks

`npm run build` runs the TypeScript project checks and creates the production build. A live database, authentication, and upload test requires a configured Supabase project and an administrator account.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
