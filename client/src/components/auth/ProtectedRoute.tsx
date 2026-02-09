import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { buildShopPath } from '../../services/api';

type Role = 'customer' | 'admin' | 'manager' | 'staff';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, redirectTo = '/login' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const loginRedirect = redirectTo === '/login' ? buildShopPath('login') : redirectTo;

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={loginRedirect} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If a signed-in user lacks permissions, send them to home
    return <Navigate to={buildShopPath('')} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;


