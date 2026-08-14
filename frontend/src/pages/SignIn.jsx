import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, UtensilsCrossed, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../App';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { ClipLoader } from 'react-spinners';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { motion, AnimatePresence } from 'framer-motion';

function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErr('');
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signin`,
        { email, password },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      setErr('');
      setLoading(false);
      navigate('/');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErr('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        {
          fullName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          email: result.user.email,
          mobile: result.user.phoneNumber || '0000000000',
          role: 'user',
        },
        { withCredentials: true }
      );
      dispatch(setUserData(data));
      setLoading(false);
      navigate('/');
    } catch (error) {
      console.error(error);
      setErr(error?.response?.data?.message || 'Google Sign-In failed');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#0c0a0f] text-white overflow-hidden selection:bg-[#ff5200] selection:text-white">
      {/* Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ff4d2d]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-100 z-10 text-stone-900"
      >
        {/* Back to Home Button */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>

        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4d2d] to-amber-500 text-white shadow-lg shadow-[#ff4d2d]/30">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Welcome Back to Reelbite
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            Sign in to order your favorite cravings & watch food reels
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{err}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="off"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-stone-700">Password</label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] font-bold text-[#ff5200] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#ff4d2d]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <ClipLoader size={18} color="#ffffff" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-stone-200" />
          <span className="absolute bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Or Continue With
          </span>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-300 bg-white py-2.5 text-xs sm:text-sm font-bold text-stone-700 transition hover:bg-stone-50 hover:border-stone-400 active:scale-[0.98] cursor-pointer"
        >
          <FcGoogle className="h-5 w-5" />
          <span>Continue with Google</span>
        </button>

        {/* Footer Link */}
        <p className="mt-6 text-center text-xs text-stone-500">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-bold text-[#ff5200] hover:underline cursor-pointer"
          >
            Sign Up
          </button>
        </p>
      </motion.div>
    </div>
  );
}

export default SignIn;
