# Multi-Tenant SaaS Migration Roadmap (Incremental)

Goal: convert the existing single-shop system to a multi-tenant SaaS without rewrites.

Principles:
- Preserve current functionality while adding tenant isolation.
- Introduce changes in small, production-safe steps.
- Enforce security via RLS + server-side checks.

---

## Phase 0 - Baseline and prep
- [ ] Identify all tenant-owned tables (products, orders, reviews, customers, etc.).
- [ ] Decide the canonical `shop_slug` format (lowercase, hyphenated).
- [ ] Create a single default shop row for the current production shop.
- [ ] Back up DB and verify data integrity.

---

## Phase 1 - Core tenant model (DB only)
**Tables to add**
- [ ] `shops` (id, name, slug, status, logo_url, theme_*).
- [ ] `shop_members` (shop_id, user_id, role, status).
- [ ] `platform_admins` (user_id).
- [ ] `shop_customers` (shop_id, customer_user_id).

**Existing tables**
- [ ] Add `shop_id` to all tenant-owned tables.
- [ ] Backfill `shop_id` for existing rows.
- [ ] Add indexes on `shop_id`.

---

## Phase 2 - RLS + security (Supabase)
- [ ] Enable RLS on tenant tables.
- [ ] Add policy: shop staff can access data where `shop_id` matches membership.
- [ ] Add policy: customers can access their own orders only.
- [ ] Add policy: public read for active shops (catalog access).
- [ ] Add policy: platform admins can manage `shops`.
- [ ] Add trigger to populate `shop_customers` on order creation.

---

## Phase 3 - Tenant resolution (Server + Client)
**Server**
- [ ] Add middleware to resolve `shop_slug -> shop_id`.
- [ ] Require `shop_id` on all tenant API calls.
- [ ] Block API access if shop status is `suspended`.

**Client**
- [ ] Update routes to `/:shop_slug` and `/:shop_slug/admin`.
- [ ] Create tenant context (store `shop_id`, branding).
- [ ] Fetch `shop` by slug on app load.

---

## Phase 4 - Branding (Per shop)
- [ ] Add logo upload (store in Supabase Storage).
- [ ] Store logo URL + theme colors in `shops`.
- [ ] Apply theme from `shop` in UI.

---

## Phase 5 - Roles and permissions
- [ ] Map existing roles to `shop_members.role`.
- [ ] Add Super Admin checks using `platform_admins`.
- [ ] Ensure admin UI only shows staff and customers for their shop.

---

## Phase 6 - Public URLs
- [ ] Customer catalog: `oneiric.shop/{shop_slug}`.
- [ ] Admin dashboard: `oneiric.shop/{shop_slug}/admin`.
- [ ] Add canonical redirect for missing/invalid slugs.

---

## Phase 7 - QA + rollout
- [ ] Smoke test admin and customer flows per shop.
- [ ] Validate RLS isolation with cross-tenant attempts.
- [ ] Add audit logs for shop status changes.
- [ ] Deploy with feature flag for multi-tenant access.

---

## Notes / Decisions Log
- [ ] Slug rules:
- [ ] Default shop slug:
- [ ] Shop status handling:
