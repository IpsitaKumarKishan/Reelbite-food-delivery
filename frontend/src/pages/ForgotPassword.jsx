import axios from 'axios';
import React, { useState } from 'react';
import { ArrowLeft, Mail, KeyRound, Lock, AlertCircle, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { ClipLoader } from 'react-spinners';
import { motion, AnimatePresence } from 'framer-motion';

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      await axios.post(`${serverUrl}/api/auth/send-otp`, { email }, { withCredentials: true });
      setErr('');
      setStep(2);
      setLoading(false);
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to send OTP.');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otp.trim()) {
      setErr('Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      await axios.post(`${serverUrl}/api/auth/verify-otp`, { email, otp }, { withCredentials: true });
      setErr('');
      setStep(3);
      setLoading(false);
    } catch (error) {
      setErr(error?.response?.data?.message || 'Invalid or expired OTP.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      await axios.post(`${serverUrl}/api/auth/reset-password`, { email, newPassword }, { withCredentials: true });
      setErr('');
      setLoading(false);
      navigate('/signin');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed to reset password.');
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
        {/* Back Button */}
        <button
          onClick={() => navigate('/signin')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </button>

        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4d2d] to-amber-500 text-white shadow-lg shadow-[#ff4d2d]/30">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Reset Password
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            {step === 1 && 'Enter your email to receive a 4-digit verification code'}
            {step === 2 && 'Enter the 4-digit OTP sent to your email'}
            {step === 3 && 'Create a strong new password for your account'}
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

        {/* Step 1: Send OTP */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#ff4d2d]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <ClipLoader size={18} color="#ffffff" />
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">4-Digit OTP Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="1234"
                  autoComplete="off"
                  maxLength={6}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20 tracking-widest text-center"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#ff4d2d]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <ClipLoader size={18} color="#ffffff" />
              ) : (
                <>
                  <span>Verify Code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 outline-none transition focus:border-[#ff5200] focus:bg-white focus:ring-2 focus:ring-[#ff5200]/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#ff4d2d]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <ClipLoader size={18} color="#ffffff" />
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
