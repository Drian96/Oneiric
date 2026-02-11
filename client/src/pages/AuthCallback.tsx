// =============================
// OAuth Callback Page
// Handles OAuth redirects from Google/Facebook
// =============================

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { handleOAuthCallback } from '../services/supabase/auth';
import { useAuth } from '../contexts/AuthContext';
import { getMe } from '../services/api';
import { signOut as supabaseSignOut } from '../services/supabase/auth';
import { resolvePostLoginRedirect } from '../utils/authRedirect';
import { clearLoginIntent, readLoginIntent } from '../utils/loginIntent';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { shopSlug } = useParams();
  const location = useLocation();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple executions using ref
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processCallback = async () => {
      const savedIntent = readLoginIntent();
      const targetShopSlug = shopSlug || savedIntent?.shopSlug || null;
      const origin = targetShopSlug ? 'shop' : (savedIntent?.origin || 'global');

      try {
        const result = await handleOAuthCallback();
        if (!result || !result.session) {
          throw new Error('No session found. Please try signing in again.');
        }
        
        await refreshAuth();
        const me = await getMe();
        setStatus('success');

        const returnTo = (location.state as any)?.returnTo || savedIntent?.returnTo || null;
        const target = resolvePostLoginRedirect({
          origin,
          memberships: me.memberships || [],
          lastShopSlug: me.lastShopSlug || null,
          shopSlug: targetShopSlug,
          returnTo,
        });
        clearLoginIntent();
        setTimeout(() => {
          navigate(target);
        }, 1200);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('error');
        
        // Sign out from Supabase on error
        try {
          await supabaseSignOut();
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        
        // Redirect to login after error
        setTimeout(() => {
          clearLoginIntent();
          navigate(targetShopSlug ? `/${targetShopSlug}/login` : '/login');
        }, 3000);
      }
    };

    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dgreen mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-4">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Successful!</h2>
        <p className="text-gray-600 mb-6">Redirecting to your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

