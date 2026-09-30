import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Lock, User, Phone, UtensilsCrossed, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
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
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [googlePending, setGooglePending] = useState(null);
  const [pendingMobile, setPendingMobile] = useState('');

  // Phone OTP Verification States (for SignUp)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(initialMode);
    setErr('');
    setPassword('');
    setFullName('');
    setMobile('');
    setIsPhoneVerified(false);
    setOtpSent(false);
    setPhoneOtp('');
    setOtpTimer(0);
    setGooglePending(null);
    setPendingMobile('');
    setShowPassword(false);
  }, [initialMode, isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

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

  const checkClientPhone = (raw) => {
    let clean = String(raw || '').trim().replace(/[\s\-\(\)\.]/g, '');
    if (clean.startsWith('+91')) clean = clean.slice(3);
    else if (clean.startsWith('0091')) clean = clean.slice(4);
    else if (clean.length === 12 && clean.startsWith('91') && /^[6-9]/.test(clean.slice(2))) clean = clean.slice(2);
    else if (clean.length === 11 && clean.startsWith('0') && /^[6-9]/.test(clean.slice(1))) clean = clean.slice(1);
    clean = clean.replace(/\D/g, '');

    if (!clean) return { valid: false, msg: 'Mobile phone number is required.' };
    if (clean.length !== 10) return { valid: false, msg: `Mobile number must be exactly 10 digits (entered ${clean.length}).` };
    if (!/^[6-9]/.test(clean)) return { valid: false, msg: 'Mobile number must start with 6, 7, 8, or 9.' };
    if (/^(\d)\1{9}$/.test(clean)) return { valid: false, msg: 'Invalid mobile number: repetitive digits not allowed.' };
    if (['1234567890', '0123456789', '9876543210'].includes(clean)) return { valid: false, msg: 'Invalid mobile number: dummy sequential numbers not allowed.' };
    return { valid: true, clean };
  };

  const handleSendPhoneOtp = async () => {
    const phoneRes = checkClientPhone(mobile);
    if (!phoneRes.valid) {
      setErr(phoneRes.msg);
      return;
    }
    setSendingOtp(true);
    setErr('');
    try {
      const res = await axios.post(
        `${serverUrl}/api/auth/send-phone-otp`,
        { mobile: phoneRes.clean },
        { withCredentials: true }
      );
      setOtpSent(true);
      setOtpTimer(60);
      if (res.data?.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to send OTP to mobile number');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const phoneRes = checkClientPhone(mobile);
    if (!phoneRes.valid) {
      setErr(phoneRes.msg);
      return;
    }
    if (!phoneOtp || phoneOtp.length !== 6) {
      setErr('Please enter the 6-digit OTP received on your mobile phone.');
      return;
    }
    setVerifyingOtp(true);
    setErr('');
    try {
      await axios.post(
        `${serverUrl}/api/auth/verify-phone-otp`,
        { mobile: phoneRes.clean, otp: phoneOtp.trim() },
        { withCredentials: true }
      );
      setIsPhoneVerified(true);
      setErr('');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validateForm = () => {
    if (mode === 'signin') {
      const phoneRes = checkClientPhone(mobile);
      if (!phoneRes.valid) {
        setErr(phoneRes.msg);
        return false;
      }
    } else {
      if (!fullName.trim()) {
        setErr('Please enter your full name.');
        return false;
      }
      const phoneRes = checkClientPhone(mobile);
      if (!phoneRes.valid) {
        setErr(phoneRes.msg);
        return false;
      }
      if (!isPhoneVerified) {
        setErr('Please verify your mobile number with OTP before completing registration.');
        return false;
      }
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
      const cleanMobile = mobile.replace(/\D/g, '');
      const result = await axios.post(
        `${serverUrl}/api/auth/signin`,
        { mobile: cleanMobile, password },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      onClose();
      if (result.data?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
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
      const phoneRes = checkClientPhone(mobile);
      const result = await axios.post(
        `${serverUrl}/api/auth/signup`,
        { fullName: fullName.trim(), password, mobile: phoneRes.clean, role },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      onClose();
      if (result.data?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
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
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      const cleanMobile = mobile ? mobile.replace(/\D/g, '') : (result.user.phoneNumber || '');
      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        {
          fullName: result.user.displayName || fullName || result.user.email?.split('@')[0],
          email: result.user.email,
          mobile: cleanMobile,
          role: role || 'user',
        },
        { withCredentials: true }
      );

      if (data?.needsMobile) {
        setGooglePending(data);
        setLoading(false);
        return;
      }

      dispatch(setUserData(data));
      onClose();
      if (data?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      setErr(error?.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleAuth = async (e) => {
    e?.preventDefault();
    const clean = pendingMobile.replace(/\D/g, '');
    if (!clean || clean.length !== 10 || clean === '0000000000') {
      setErr('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        {
          fullName: googlePending.fullName,
          email: googlePending.email,
          mobile: clean,
          role: googlePending.role || 'user',
        },
        { withCredentials: true }
      );
      dispatch(setUserData(data));
      onClose();
      if (data?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to complete login');
    } finally {
      setLoading(false);
    }
  };

  const resetMode = (newMode) => {
    setMode(newMode);
    setErr('');
    setPassword('');
    setFullName('');
    setMobile('');
    setIsPhoneVerified(false);
    setOtpSent(false);
    setPhoneOtp('');
    setOtpTimer(0);
    setShowPassword(false);
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
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-100 z-10"
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
                  ? 'Sign in with your mobile number & watch food reels'
                  : 'Verify your phone number with OTP to start savoring fast deliveries'}
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="mb-6 flex rounded-xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => resetMode('signin')}
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
                onClick={() => resetMode('signup')}
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

            {googlePending ? (
              /* Google Sign-In Phone Collection Step */
              <form onSubmit={handleCompleteGoogleAuth} className="space-y-4">
                <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[#ff5200] text-white flex items-center justify-center mx-auto mb-2">
                    <Phone size={18} />
                  </div>
                  <h3 className="text-sm font-extrabold text-stone-900">Mobile Number Required</h3>
                  <p className="text-xs text-stone-600">
                    Hi <strong className="text-stone-900">{googlePending.fullName}</strong>! Delivery partners need your 10-digit mobile number to contact you when your food arrives.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">10-Digit Mobile Number</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-stone-400">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={pendingMobile}
                      onChange={(e) => setPendingMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 py-2.5 pl-12 pr-4 text-xs sm:text-sm font-bold text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || pendingMobile.length !== 10}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#ff4d2d]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <ClipLoader size={18} color="#ffffff" />
                  ) : (
                    <>
                      <span>Complete & Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setGooglePending(null); setErr(''); }}
                  className="w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-800 transition py-1"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                {/* Main Form */}
                <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
                  {mode === 'signup' && (
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
                  )}

                  {/* Mobile Number Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700">Mobile Number</label>
                      {mode === 'signup' && isPhoneVerified && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-bold text-stone-400">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        disabled={mode === 'signup' && isPhoneVerified}
                        value={mobile}
                        onChange={(e) => {
                          setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                          if (mode === 'signup') {
                            setIsPhoneVerified(false);
                            setOtpSent(false);
                          }
                        }}
                        placeholder="9876543210"
                        autoComplete="tel"
                        className={`w-full rounded-xl border ${
                          mode === 'signup' && isPhoneVerified
                            ? 'border-emerald-300 bg-emerald-50/20'
                            : 'border-stone-200 bg-stone-50/50'
                        } py-2.5 pl-12 ${
                          mode === 'signup' ? 'pr-28' : 'pr-4'
                        } text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20`}
                        required
                      />

                      {mode === 'signup' && (
                        !isPhoneVerified ? (
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            disabled={sendingOtp || otpTimer > 0 || mobile.replace(/\D/g, '').length !== 10}
                            className="absolute right-2 px-3 py-1.5 rounded-lg bg-[#ff5200] text-white text-xs font-bold hover:bg-[#e04800] transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                          >
                            {sendingOtp ? (
                              <ClipLoader size={12} color="#ffffff" />
                            ) : otpTimer > 0 ? (
                              `Resend (${otpTimer}s)`
                            ) : otpSent ? (
                              'Resend OTP'
                            ) : (
                              'Send OTP'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsPhoneVerified(false);
                              setOtpSent(false);
                              setPhoneOtp('');
                            }}
                            className="absolute right-3 text-xs font-bold text-stone-400 hover:text-stone-700 underline cursor-pointer"
                          >
                            Change
                          </button>
                        )
                      )}
                    </div>

                    {/* Animated OTP Input Card when OTP is sent & not yet verified */}
                    <AnimatePresence>
                      {mode === 'signup' && otpSent && !isPhoneVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -6 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2.5 p-3 rounded-2xl bg-orange-50/80 border border-orange-200/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#ff5200]" />
                              Enter 6-digit OTP sent to +91 {mobile}
                            </span>
                            {devOtpHint && (
                              <span
                                onClick={() => setPhoneOtp(devOtpHint)}
                                className="text-[10px] font-extrabold text-[#ff5200] bg-orange-100 hover:bg-orange-200 px-2 py-0.5 rounded cursor-pointer transition"
                                title="Click to auto-fill development OTP"
                              >
                                Dev OTP: {devOtpHint}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              autoFocus
                              className="flex-1 rounded-xl border border-stone-300 bg-white py-2 px-3 text-center text-sm font-black tracking-widest text-stone-900 outline-none focus:border-[#ff5200] focus:ring-2 focus:ring-[#ff5200]/20"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyPhoneOtp}
                              disabled={verifyingOtp || phoneOtp.length !== 6}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 text-white text-xs font-extrabold shadow hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                              {verifyingOtp ? <ClipLoader size={14} color="#ffffff" /> : 'Verify'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Password Field */}
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
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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

                  {/* Role Selector (Only on SignUp) */}
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
                    disabled={loading || (mode === 'signup' && !isPhoneVerified)}
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
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
