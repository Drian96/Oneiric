import { describe, expect, it } from 'vitest';
import { resolvePostLoginRedirect } from './authRedirect';
import { createLoginIntent } from './loginIntent';

describe('resolvePostLoginRedirect', () => {
  it('routes global non-member users to buyer dashboard', () => {
    const target = resolvePostLoginRedirect({
      origin: 'global',
      memberships: [],
      lastShopSlug: null,
      shopSlug: null,
      returnTo: null,
    });

    expect(target).toBe('/dashboard');
  });

  it('routes global members to last active admin shop', () => {
    const target = resolvePostLoginRedirect({
      origin: 'global',
      memberships: [
        { shop_id: '1', role: 'staff', slug: 'shop-a', name: 'A', status: 'active' },
        { shop_id: '2', role: 'admin', slug: 'shop-b', name: 'B', status: 'active' },
      ],
      lastShopSlug: 'shop-b',
      shopSlug: null,
      returnTo: null,
    });

    expect(target).toBe('/shop-b/admin');
  });

  it('routes shop-origin members to tenant admin', () => {
    const target = resolvePostLoginRedirect({
      origin: 'shop',
      memberships: [{ shop_id: '1', role: 'admin', slug: 'shop-a', name: 'A', status: 'active' }],
      lastShopSlug: null,
      shopSlug: 'shop-a',
      returnTo: null,
    });

    expect(target).toBe('/shop-a/admin');
  });

  it('routes shop-origin non-members back to storefront', () => {
    const target = resolvePostLoginRedirect({
      origin: 'shop',
      memberships: [],
      lastShopSlug: null,
      shopSlug: 'shop-a',
      returnTo: null,
    });

    expect(target).toBe('/shop-a');
  });

  it('ignores unsafe returnTo values and keeps policy redirect', () => {
    const target = resolvePostLoginRedirect({
      origin: 'global',
      memberships: [],
      lastShopSlug: null,
      shopSlug: null,
      returnTo: 'https://evil.test',
    });

    expect(target).toBe('/dashboard');
  });
});

describe('createLoginIntent', () => {
  it('normalizes invalid shop intent to null slug', () => {
    const intent = createLoginIntent({
      origin: 'shop',
      shopSlug: 'INVALID/slug',
      returnTo: '/shop-a/profile',
    });

    expect(intent.shopSlug).toBeNull();
    expect(intent.returnTo).toBe('/shop-a/profile');
  });
});

