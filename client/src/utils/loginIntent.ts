export type LoginOrigin = 'global' | 'shop';

export interface LoginIntent {
  origin: LoginOrigin;
  shopSlug: string | null;
  returnTo: string | null;
}

const LOGIN_INTENT_KEY = 'oneiric.loginIntent';

const SHOP_SLUG_PATTERN = /^[a-z0-9-]{3,50}$/;

const normalizeReturnTo = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('/login') || trimmed.includes('/auth/callback')) return null;
  return trimmed;
};

const normalizeShopSlug = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return SHOP_SLUG_PATTERN.test(slug) ? slug : null;
};

export const createLoginIntent = (params: {
  origin: LoginOrigin;
  shopSlug?: string | null;
  returnTo?: string | null;
}): LoginIntent => {
  const shopSlug = params.origin === 'shop' ? normalizeShopSlug(params.shopSlug) : null;
  return {
    origin: params.origin,
    shopSlug,
    returnTo: normalizeReturnTo(params.returnTo),
  };
};

export const saveLoginIntent = (intent: LoginIntent): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LOGIN_INTENT_KEY, JSON.stringify(intent));
};

export const readLoginIntent = (): LoginIntent | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(LOGIN_INTENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LoginIntent>;
    if (parsed.origin !== 'global' && parsed.origin !== 'shop') return null;
    return createLoginIntent({
      origin: parsed.origin,
      shopSlug: parsed.shopSlug,
      returnTo: parsed.returnTo,
    });
  } catch {
    return null;
  }
};

export const clearLoginIntent = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LOGIN_INTENT_KEY);
};

