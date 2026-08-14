import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Lock, Mail, User, Phone, UtensilsCrossed, AlertCircle, ArrowRight } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { ClipLoader } from 'react-spinners';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../../App';
import { setUserData } from '../../redux/userSlice';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../../firebase';

export default function LoginModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(initialMode);
    setErr('');
    setEmail('');
    setPassword('');
    setFullName('');
    setMobile('');
    setShowPassword(false);
  }, [initialMode, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return false;
    }
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErr('Please enter your full name.');
        return false;
      }
      if (!mobile || mobile.length < 10) {
        setErr('Mobile number must be at least 10 digits.');
        return false;
      }
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
      onClose();
      navigate('/');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErr('');
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signup`,
        { fullName, email, password, mobile, role },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      onClose();
      navigate('/');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
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
          fullName: result.user.displayName || fullName || result.user.email?.split('@')[0],
          email: result.user.email,
          mobile: mobile || result.user.phoneNumber || '0000000000',
          role: role || 'user',
        },
        { withCredentials: true }
      );
      dispatch(setUserData(data));
      onClose();
      navigate('/');
    } catch (error) {
      console.error(error);
      setErr(error?.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-100 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Brand Header */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4d2d] to-amber-500 text-white shadow-lg shadow-[#ff4d2d]/30">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {mode === 'signin' ? 'Welcome Back' : 'Join Reelbite'}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-stone-500">
                {mode === 'signin'
                  ? 'Sign in to order your favorite cravings & watch food reels'
                  : 'Create an account to start savoring fast deliveries'}
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="mb-6 flex rounded-xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErr('');
                  setEmail('');
                  setPassword('');
                  setFullName('');
                  setMobile('');
                  setShowPassword(false);
                }}
                className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErr('');
                  setEmail('');
                  setPassword('');
                  setFullName('');
                  setMobile('');
                  setShowPassword(false);
                }}
                className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message Banner */}
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
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        autoComplete="off"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="9876543210"
                        autoComplete="off"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

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
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/forgot-password');
                      }}
                      className="text-[11px] font-bold text-[#ff5200] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
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

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Account Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'user', label: 'Foodie' },
                      { id: 'owner', label: 'Restaurant' },
                      { id: 'deliveryBoy', label: 'Rider' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`rounded-xl py-2 text-xs font-bold transition-all border ${
                          role === r.id
                            ? 'bg-[#ff5200] text-white border-[#ff5200] shadow-sm'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#ff4d2d]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <ClipLoader size={18} color="#ffffff" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
