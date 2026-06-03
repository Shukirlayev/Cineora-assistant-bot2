import React, { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand(); // Ekranni to'liq ochish
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-[0_0_40px_rgba(59,130,246,0.1)] backdrop-blur-lg text-center">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-4 tracking-tight">
          CINEORA
        </h1>
        <p className="text-gray-400 mb-8 font-medium">
          Premium Dashboard'ga xush kelibsiz. React va Tailwind muvaffaqiyatli ulandi! Boooom! 🚀
        </p>
        <button 
          onClick={() => window.Telegram.WebApp.close()}
          className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-4 rounded-xl transition-all active:scale-95 shadow-lg"
        >
          Ajoyib! (Yopish)
        </button>
      </div>
    </div>
  );
}
