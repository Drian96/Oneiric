import React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createLoginIntent, saveLoginIntent } from '../../utils/loginIntent';

type Role = 'customer' | 'admin' | 'manager' | 'staff';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, redirectTo = '/login' }) => {
  const { isAuthenticated, isLoading, user, memberships } = useAuth();
  const location = useLocation();
  const { shopSlug } = useParams();
  const loginRedirect = redirectTo === '/login'
    ? (shopSlug ? `/${shopSlug}/login` : '/login')
    : redirectTo;

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    saveLoginIntent(createLoginIntent({
      origin: shopSlug ? 'shop' : 'global',
      shopSlug: shopSlug || null,
      returnTo: location.pathname,
    }));

    return <Navigate to={loginRedirect} state={{ returnTo: location.pathname }} replace />;
  }

  if (allowedRoles && user) {
    if (shopSlug) {
      // Customers are global users and may not have shop memberships.
      // If customer access is allowed for this route, permit by user role.
      if (allowedRoles.includes('customer') && user.role === 'customer') {
        return <Outlet />;
      }

      const membership = memberships.find((m) => m.slug === shopSlug);
      if (!membership || !allowedRoles.includes(membership.role)) {
        return <Navigate to={`/${shopSlug}`} replace />;
      }
    } else if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;


