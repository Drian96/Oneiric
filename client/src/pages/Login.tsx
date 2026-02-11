import React, { useState, useCallback, useEffect } from 'react';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import Google from '../assets/google.jpg'; 
import LoginBG from '../assets/login_bg.mp4';
import { twMerge } from 'tailwind-merge';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../services/supabase/auth';
import { buildShopPath, getMe } from '../services/api';
import { resolvePostLoginRedirect } from '../utils/authRedirect';
import { clearLoginIntent, createLoginIntent, readLoginIntent, saveLoginIntent } from '../utils/loginIntent';
import furnitureLogo from '../assets/AR-Furniture_Logo.png';
import shopName from '../assets/NAME.png';
// import { signInWithFacebook } from '../services/supabase/auth'; // Commented out - Facebook OAuth has conflicts

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, memberships, lastShopSlug, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const location = useLocation();
  const savedIntent = readLoginIntent();
  const intentOrigin = shopSlug ? 'shop' : (savedIntent?.origin || 'global');
  const intentShopSlug = shopSlug || savedIntent?.shopSlug || null;

  useEffect(() => {
    const stateReturnTo = (location.state as any)?.returnTo || null;
    saveLoginIntent(createLoginIntent({
      origin: shopSlug ? 'shop' : 'global',
      shopSlug: shopSlug || null,
      returnTo: stateReturnTo,
    }));
  }, [shopSlug, location.state]);

  useEffect(() => {
    // If already authenticated, do not show login again.
    if (isLoading || !isAuthenticated) return;

    const target = resolvePostLoginRedirect({
      origin: intentOrigin,
      memberships,
      lastShopSlug,
      shopSlug: intentShopSlug,
      returnTo: savedIntent?.returnTo || null,
    });

    clearLoginIntent();
    navigate(target, { replace: true });
  }, [
    isLoading,
    isAuthenticated,
    intentOrigin,
    memberships,
    lastShopSlug,
    intentShopSlug,
    savedIntent?.returnTo,
    navigate,
  ]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      const me = await getMe();
      const returnTo = (location.state as any)?.returnTo || savedIntent?.returnTo || null;
      const target = resolvePostLoginRedirect({
        origin: intentOrigin,
        memberships: me.memberships || memberships,
        lastShopSlug: me.lastShopSlug || lastShopSlug,
        shopSlug: intentShopSlug,
        returnTo,
      });
      clearLoginIntent();
      navigate(target);
      return;
    } catch (err: any) {
      let errorMessage = 'Login failed. Please try again.';
      if (err.message) {
        if (err.message.includes('Invalid email or password') || err.message.includes('401')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('User not found')) {
          errorMessage = 'Email not found. Please check your email address.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, login, navigate, shopSlug, location.state, memberships, lastShopSlug]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const returnTo = (location.state as any)?.returnTo || savedIntent?.returnTo || null;
      saveLoginIntent(createLoginIntent({
        origin: intentOrigin,
        shopSlug: intentShopSlug,
        returnTo,
      }));
      const callbackPath = intentShopSlug ? `/${intentShopSlug}/auth/callback` : '/auth/callback';
      await signInWithGoogle(`${window.location.origin}${callbackPath}`);
      // The OAuth flow will redirect, so we don't need to navigate here
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  }, [intentOrigin, intentShopSlug, location.state, savedIntent?.returnTo]);

  // Facebook sign-in commented out due to setup conflicts
  // const handleFacebookLogin = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     setError('');
  //     await signInWithFacebook(`${window.location.origin}/auth/callback`);
  //     // The OAuth flow will redirect, so we don't need to navigate here
  //   } catch (err: any) {
  //     setError(err.message || 'Facebook sign-in failed. Please try again.');
  //     setLoading(false);
  //   }
  // }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 flex-col">
      <video 
              src={LoginBG} 
              autoPlay 
              muted 
              loop 
              playsInline // Added playsInline for better mobile compatibility
              className='absolute inset-0 w-full h-full object-cover z-0' 
          />

        <div className="flex items-center justify-center z-10 mb-10">
            <Link to={buildShopPath('')} className="text-2xl font-serif font-bold text-dgreen hover:text-lgreen transition-colors">
              <div className="flex items-center">
                <img src={furnitureLogo} alt="Furniture Logo" className="h-20 mt-2" />
                <img src={shopName} alt="Shop Name" className="h-15 mt-2" />
              </div>
            </Link>
          </div>

      <div className="bg-black/45 rounded-xl shadow-2xl p-6 w-full max-w-md mx-auto z-10">
        <h2 className="text-3xl font-bold text-lgreen mb-6 text-center">Login Now!</h2>
        <form onSubmit={handleLogin} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white" size={20} />
              <input
                type="email"
                id="email"
                className="w-full pl-10 pr-4 py-2 text-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-dgreen focus:border-transparent transition duration-200"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                required
              />
            </div>
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="w-full pl-10 pr-12 py-2 text-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-dgreen focus:border-transparent transition duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lgreen hover:bg-dgreen text-white font-semibold py-3 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-opacity-75 flex items-center justify-center cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <LogIn className="mr-2" size={20} />
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        <div className="text-center mt-4">
          <Link to={buildShopPath('forgot-password')} className="text-sm text-lgreen hover:text-dgreen hover:underline transition-colors duration-200">
            Forgot password?
          </Link>
        </div>
        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-white text-sm">Or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={twMerge(
              "w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3",
              "rounded-lg shadow-sm hover:bg-gray-300 transition duration-300 ease-in-out",
              "flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-300",
              loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <img src={Google} alt="Google logo" className='w-6 h-6 mr-2 rounded-full' />
            Sign in with Google
          </button>
          {/* Facebook sign-in commented out due to setup conflicts */}
          {/* <button
            onClick={handleFacebookLogin}
            disabled={loading}
            className={twMerge(
              "w-full bg-[#1877F2] border border-[#1877F2] text-white font-semibold py-3",
              "rounded-lg shadow-sm hover:bg-[#166FE5] transition duration-300 ease-in-out",
              "flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1877F2]",
              loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Sign in with Facebook
          </button> */}
        </div>
        <div className="text-center mt-6 text-white space-y-2">
          <div>
            No account?{' '}
            <Link
              to={buildShopPath('signup')}
              className="text-lgreen hover:text-dgreen hover:underline font-medium transition-colors duration-200"
            >
              Sign up
            </Link>
          </div>
          <div className="text-sm">
            Shop owner?{' '}
            <Link
              to="/create-shop"
              className="text-lgreen hover:text-dgreen hover:underline font-medium transition-colors duration-200"
            >
              Create a shop
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;