import React, { useEffect, useState } from 'react';

export default function App() {
  const [wsData, setWsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Jonli ma'lumotlarni Backenddan tortib olish
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Telegramdan foydalanuvchi ID sini olamiz (yoki URL dan tekshiramiz)
    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('userId');

    if (userId) {
      fetch(`/api/workspace/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWsData(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Ulanish xatosi:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Yuklanish (Loading) oynasi
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      </div>
    );
  }

  // 3. Xatolik yoki ruxsat yo'qligi
  if (!wsData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <p className="text-red-400 font-medium">Ma'lumot topilmadi yoki tizimga ruxsat yo'q.</p>
        </div>
      </div>
    );
  }

  const { workspace, stats } = wsData;

  // 4. Premium UI (Dashboard) ko'rinishi
  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans pb-28">
      
      {/* Header qismi */}
      <div className="flex justify-between items-center mb-8 mt-2">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
          CINEORA
        </h1>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-gray-800 px-2 py-1 rounded-md">
            {workspace.mode} Rejimi
          </span>
          <p className="text-sm font-bold mt-1 text-gray-200 line-clamp-1 max-w-[120px]">{workspace.title}</p>
        </div>
      </div>

      {/* Statistika Kartochkalari */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
          <p className="text-xs text-gray-400 mb-1 font-medium">Loyiha Navbati</p>
          <p className="text-3xl font-bold text-white">{workspace.queue.length} <span className="text-sm text-gray-500 font-normal">ta video</span></p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl"></div>
          <p className="text-xs text-gray-400 mb-1 font-medium">Umumiy Postlar</p>
          <p className="text-3xl font-bold text-white">{stats.total_posts}</p>
        </div>
      </div>

      {/* Navbatdagi videolar ro'yxati */}
      <div className="mb-4 flex justify-between items-end">
        <h2 className="text-lg font-bold text-gray-300">Navbat</h2>
        {workspace.mode === 'serial' && (
          <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
            Fasl: {workspace.season}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {workspace.queue.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl p-10 text-center text-gray-500 text-sm">
            Hozircha navbat bo'sh. <br/> Botga yangi qismlarni yuboring.
          </div>
        ) : (
          workspace.queue.map((video, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-sm">
              <div className="flex flex-col">
                <span className="text-base font-bold text-blue-400">
                  {video.mode === 'serial' ? `S${String(video.season).padStart(2, '0')}E${String(video.episode).padStart(2, '0')}` : 'Kino'}
                </span>
                <span className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[150px]">{video.title}</span>
              </div>
              
              {/* Harakat tugmalari (Drag and drop o'rniga Mobile-first yechim) */}
              <div className="flex gap-2">
                <button className="w-11 h-11 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-lg active:scale-95">
                  🔼
                </button>
                <button className="w-11 h-11 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-lg active:scale-95">
                  🔽
                </button>
                <button className="w-11 h-11 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors text-lg ml-1 active:scale-95">
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ekran pastiga yopishgan 'Post' tugmasi */}
      <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black via-black to-transparent backdrop-blur-sm">
        <button 
          className={`w-full font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg ${workspace.queue.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          disabled={workspace.queue.length === 0}
        >
          <span>🚀</span> Kanalga Joylash
        </button>
      </div>
      
    </div>
  );
}
