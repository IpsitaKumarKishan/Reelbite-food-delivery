import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineFastfood } from 'react-icons/md';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white/80 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl border border-orange-100 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-6 text-[#ff4d2d] shadow-inner">
          <MdOutlineFastfood size={50} />
        </div>
        <h1 className="text-6xl font-black text-gray-900 tracking-tight mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Dish Not Found!</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The page or meal you are craving doesn't exist, was eaten, or has been moved to another table.
        </p>
        <button
          id="go-home-button"
          onClick={() => navigate('/')}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ff4d2d] to-[#ff6b4a] text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Back to Fresh Eats
        </button>
      </div>
    </div>
  );
}

export default NotFound;
