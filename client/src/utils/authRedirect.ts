import type { ShopMembership } from '../services/api';
import type { LoginOrigin } from './loginIntent';

const normalizeReturnTo = (returnTo?: string | null): string | null => {
  if (!returnTo) return null;
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed === '/login' || trimmed.endsWith('/login')) return null;
  if (trimmed.includes('/auth/callback')) return null;
  return trimmed;
};

export function resolvePostLoginRedirect(params: {
  origin: LoginOrigin;
  memberships: ShopMembership[];
  lastShopSlug: string | null;
  shopSlug?: string | null;
  returnTo?: string | null;
}) {
  const { origin, memberships, lastShopSlug, shopSlug, returnTo } = params;
  const safeReturnTo = normalizeReturnTo(returnTo);

  if (safeReturnTo) return safeReturnTo;

  if (origin === 'shop') {
    if (shopSlug && memberships.some((m) => m.slug === shopSlug)) {
      return `/${shopSlug}/admin`;
    }
    return shopSlug ? `/${shopSlug}` : '/';
  }

  if (memberships.length > 0) {
    const targetSlug = lastShopSlug || memberships[0].slug;
    return `/${targetSlug}/admin`;
  }

  return '/dashboard';
}
