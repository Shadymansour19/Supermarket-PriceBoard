# How to change things

Practical recipes for editing the app by hand. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) first for the map.

Golden rule: after any change run

```bash
npm run build    # type-checks everything + builds
npm run lint
npm run dev      # then click through the affected screens in EN *and* AR
```

---

## Everyday content & settings

**Change store phone / WhatsApp / address / Facebook** → edit
[src/config.ts](./src/config.ts). WhatsApp number = digits only, country code
first, no `+`.

**Change currency** → `CURRENCY_CODE` in [src/config.ts](./src/config.ts). Also
the Edge Function hardcodes `EGP` in `pushTextFor()`
([supabase/functions/notify-new-deal/index.ts](./supabase/functions/notify-new-deal/index.ts))
— change it there too and redeploy the function.

**Change any text on screen** → [src/i18n/index.ts](./src/i18n/index.ts). Every
string exists twice (`en` block and `ar` block); edit both. Use it in a
component with `const { t } = useTranslation(); t("section.key")`.

**Add a new text string** → add the same key to both `en` and `ar`, then use
`t("your.key")`.

**Change brand colors** → main green is `#0f3d2e` (used in
[HeroBanner](./src/components/HeroBanner.tsx), [BottomNavBar](./src/components/BottomNavBar.tsx),
`theme_color` in [vite.config.ts](./vite.config.ts), and the HTML meta tag in
[index.html](./index.html)). Search the repo for `0f3d2e` to find them all.
Tailwind classes like `bg-emerald-600` are used for buttons.

**Change the app name / PWA icon** → name in `vite.config.ts` (`manifest`),
`index.html` `<title>`, and `i18n` (`app.name`, `hero.title`). Icons are in
`public/pwa/` (192, 512, 512-maskable PNGs) plus `public/logo.jpg`.

**Change the hero banner** → [src/components/HeroBanner.tsx](./src/components/HeroBanner.tsx);
its text is under `hero.*` in i18n.

**Reorder / hide home page sections** → [src/pages/public/CatalogPage.tsx](./src/pages/public/CatalogPage.tsx)
renders the sections (`LimitedTimeDealsSection`, `QuantityDealsSection`, `BestSellersSection`, `RecentlyArrivedSection`, `RecentlyViewedSection`).
Reorder or remove the JSX lines.

**Change bottom nav tabs** → [src/components/BottomNavBar.tsx](./src/components/BottomNavBar.tsx)
(careful — see the note about the notch in ARCHITECTURE.md).

---

## Data: products, categories, deals (no code needed)

Use the admin UI at `/admin/login` → Products / Categories. Each product has
a "Discounts" modal (limited-time + quantity tiers) and an "Ad" button that
generates a social-media image.

Creating a **limited-time discount triggers a push notification to every
subscriber.** Don't create test discounts on live products.

---

## Code changes

### Add a field to products (example: `brand`)

1. **Migration:** create `supabase/migrations/0008_product_brand.sql`:
   ```sql
   alter table public.products add column brand text;
   ```
   (RLS already covers the whole table; no policy change needed.)
2. **Apply it** to the database (see "Applying a migration" below).
3. **Types:** add `brand: string | null;` to `Product` in
   [src/types/database.ts](./src/types/database.ts).
4. **Admin form:** add an input in
   [src/components/admin/ProductForm.tsx](./src/components/admin/ProductForm.tsx)
   and include it in the save payload (follow how `size` is handled — search
   for `size` in that file and in `src/lib/products.ts`).
5. **Display:** show it in [ProductCard](./src/components/ProductCard.tsx) /
   [ProductDetailPage](./src/pages/public/ProductDetailPage.tsx).
6. **Label text:** add to i18n in both languages.
7. If it should be searchable, extend the `.or(...)` filter in `fetchProducts`
   ([src/lib/products.ts](./src/lib/products.ts)).

Tip: `grep -rn "size" src` shows every place an existing optional field is
touched — copy that pattern.

### Add a new page

1. Create `src/pages/public/MyPage.tsx` exporting `MyPage`.
2. Add `<Route path="my-page" element={<MyPage />} />` inside the
   `PublicLayout` block in [src/App.tsx](./src/App.tsx) (inside the
   `AdminLayout`/`ProtectedRoute` block for admin pages).
3. Link to it with `<Link to="/my-page">`.
4. Put any Supabase queries in a new/existing file in `src/lib/`, not in the
   page.

### Add a new database table

1. New numbered migration with `create table`, then
   `alter table ... enable row level security;` and **explicit policies**
   (with RLS on and no policy, nobody can read or write). Copy the style in
   `0003_discounts.sql` (public read, admin write via `public.is_admin()`).
2. Apply it, add types to `src/types/database.ts`, add query functions in `src/lib/`.

### Add a language

Add a third block to `resources` in `src/i18n/index.ts`, extend
`localizedField()` (currently only `en`/`ar`), add DB columns (`name_xx`),
the `LanguageToggle`, and `RTL_LANGUAGES` if right-to-left. This is a large
change — the `_en`/`_ar` pairs are everywhere.

### Change the unit list (kg, liter, ...)

Update `PRODUCT_UNITS` in `src/types/database.ts`, add a migration that
replaces the `products_unit_check` constraint, and add labels in i18n.

---

## Database operations

### Applying a migration

Pick one:

- **Supabase dashboard** → SQL Editor → paste the new `.sql` file → Run. Easiest.
- **psql** with the connection string from Supabase → Settings → Database
  (use the **pooler** string — the direct host is IPv6-only and fails on many
  networks):
  ```bash
  psql "<pooler connection string>" -f supabase/migrations/0008_xxx.sql
  ```

Only run **new** files; earlier ones were already applied to production. Always
commit the migration file so the repo matches the live database. This is the
live store's database — avoid `drop` / unfiltered `delete`, and take a backup
(Supabase → Database → Backups) before risky changes.

### Create / reset an admin

Create the user in Supabase → Authentication → Users, then in SQL Editor:
```sql
insert into public.profiles (id, role) values ('<auth-user-uuid>', 'admin');
```
To remove admin rights: `delete from public.profiles where id = '<uuid>';`

### Backup / inspect data

Supabase dashboard → Table Editor, or Database → Backups. Images are in
Storage → `product-images`.

---

## Push notifications

### Set up from scratch (new Supabase project)

1. Generate keys: `npx web-push generate-vapid-keys`.
2. Put the **public** key in `VITE_VAPID_PUBLIC_KEY` (`.env.local` + Vercel).
3. Deploy the function (Supabase dashboard → Edge Functions, or
   `supabase functions deploy notify-new-deal --no-verify-jwt`). It must be
   deployed **without JWT verification**.
4. Set the function's secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` (`mailto:you@example.com`), `FUNCTION_SECRET` (any long
   random string).
5. Store the same random string in Vault (SQL Editor):
   ```sql
   select vault.create_secret('<same FUNCTION_SECRET>', 'notify_new_deal_function_secret');
   ```
6. Copy the function's **actual URL** from the dashboard and make sure migration
   `0005` uses it (ours ends in `/hyper-worker`, not `/notify-new-deal`).
   Edit the URL and project ref in `0005` before running it on a new project.
7. Redeploy the frontend so the VAPID public key is baked in.

### Notifications stopped working — checklist

- Function secrets all present? (a missing one gives HTTP 500)
- `FUNCTION_SECRET` equals the Vault value? (mismatch gives 401)
- Function URL in `notify_new_deal()` still correct?
- Supabase → Edge Functions → Logs for errors; Database → `net._http_response`
  for the trigger's HTTP results.
- Device-side: browser notification permission granted? On iPhone the app must
  be installed to the home screen first.

---

## Deploying

Pushing to the branch Vercel watches (`main`) builds and deploys automatically
(`npm run build`, output `dist`). Env vars are set in Vercel → Project →
Settings → Environment Variables; **redeploy after changing them**.

Rollback: Vercel → Deployments → pick an older one → Promote to Production.
Or `git revert <commit>` and push.

Users get updates automatically (service worker is `autoUpdate`); if a phone
seems stuck on an old version, close and reopen the app.

Don't commit `.env.local`, service-role keys, the VAPID **private** key, or
`FUNCTION_SECRET`.

---

## Accounts & access you need (keep these safe)

If you're taking this over, make sure you control:

| What | Where |
|---|---|
| Source code | GitHub repo `Shadymansour19/Supermarket-PriceBoard` |
| Hosting | Vercel project `super-market-hamada` (team `market-b6e2`) |
| Database, auth, storage, edge function | Supabase project ref `tyktbinxffpqcbbhvggd` |
| Domain (if any) | wherever it was registered |
| VAPID private key + `FUNCTION_SECRET` | password manager — if lost, generate new ones and redo the push setup (everyone must re-subscribe if the VAPID key changes) |

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Blank page / "Missing VITE_SUPABASE_URL…" | `.env.local` missing or Vercel env vars not set (then redeploy) |
| Admin saves silently fail / "permission denied" | Not logged in as admin, or no `profiles` row for that user |
| Product list empty but data exists | Products `is_active = false`, or an RLS policy was changed |
| Image won't upload | `product-images` bucket policy or not logged in as admin |
| Direct DB connect: "Network is unreachable" | Use the pooler host, not `db.<ref>.supabase.co` |
| Direct refresh of `/product/123` gives 404 | `vercel.json` rewrite missing |
| Old design after deploy | Service worker cache — close/reopen the app |
| `git push` denied (403) | Wrong GitHub account active: `gh auth switch --user Shadymansour19` |

---

## If you use an AI assistant (Claude, etc.) later

Point it at `README.md`, `ARCHITECTURE.md`, `HOWTO.md` and `SPEC.md` first.
They contain the context it needs: how the system fits together, why choices
were made, and what not to break. Ask it to run `npm run build` after changes.
