import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Rocket, Settings2 } from 'lucide-react';

export default function App() {
  const [wsData, setWsData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('userId');

    if (userId) {
      fetch(`/api/workspace/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWsData(data);
            setQueue(data.workspace.queue); // Navbatni alohida state'ga olamiz (surish uchun)
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

  // Barmoq bilan surilganda ro'yxatni qayta taxlash funksiyasi
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setQueue(items); // Ekranda darhol o'zgaradi (Keyingi qadamda buni Backendga yuborishni ulaymiz)
    
    // Vizual effekt (Vibration) - Telefonda seziladi
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const handleDelete = (index) => {
    const items = Array.from(queue);
    items.splice(index, 1);
    setQueue(items);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!wsData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <p className="text-red-400 font-medium bg-red-500/10 p-4 rounded-xl">Ma'lumot topilmadi yoki tizimga ruxsat yo'q.</p>
      </div>
    );
  }

  const { workspace, stats } = wsData;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-5 font-sans pb-32 selection:bg-blue-500/30">
      
      {/* Header qismi */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          CINEORA
        </h1>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            {workspace.mode} Rejimi
          </span>
          <p className="text-sm font-medium mt-1.5 text-gray-400 line-clamp-1 max-w-[130px]">{workspace.title}</p>
        </div>
      </div>

      {/* Statistika Kartochkalari */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#141414] border border-white/5 p-4 rounded-2xl shadow-xl">
          <p className="text-xs text-gray-500 mb-1 font-medium tracking-wide uppercase">Navbatda</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-bold text-white">{queue.length}</p>
            <p className="text-sm text-gray-500 font-medium">video</p>
          </div>
        </div>
        <div className="bg-[#141414] border border-white/5 p-4 rounded-2xl shadow-xl">
          <p className="text-xs text-gray-500 mb-1 font-medium tracking-wide uppercase">Tarix</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-bold text-white">{stats.total_posts}</p>
            <p className="text-sm text-gray-500 font-medium">post</p>
          </div>
        </div>
      </div>

      {/* Navbat Sarlavhasi */}
      <div className="mb-4 flex justify-between items-center px-1">
        <h2 className="text-lg font-semibold text-gray-200">Yuklash Navbati</h2>
        {workspace.mode === 'serial' && (
          <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            Fasl: <span className="text-white font-bold">{workspace.season}</span>
          </span>
        )}
      </div>

      {/* DRAG AND DROP RO'YXAT (Premium Mobile UI) */}
      <div className="space-y-3">
        {queue.length === 0 ? (
          <div className="bg-[#141414] border border-white/5 border-dashed rounded-2xl p-10 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
            <Settings2 className="w-8 h-8 text-gray-600 opacity-50" />
            Hozircha navbat bo'sh. <br/> Botga yangi qismlarni yuboring.
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="video-queue">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2.5">
                  {queue.map((video, index) => (
                    <Draggable key={`video-${index}`} draggableId={`video-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                            snapshot.isDragging 
                              ? 'bg-blue-600/20 border border-blue-500/50 shadow-2xl scale-[1.02]' 
                              : 'bg-[#141414] border border-white/5 hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            {/* Surish Handle'i (Nuqtachalar) */}
                            <div 
                              {...provided.dragHandleProps} 
                              className="p-2 -ml-2 text-gray-600 hover:text-gray-300 transition-colors cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            {/* Video Ma'lumotlari */}
                            <div className="flex flex-col">
                              <span className="text-[15px] font-bold text-gray-100 tracking-wide">
                                {video.mode === 'serial' ? `S${String(video.season).padStart(2, '0')}E${String(video.episode).padStart(2, '0')}` : 'Kino Qismi'}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px] font-medium">{video.title}</span>
                            </div>
                          </div>
                          
                          {/* O'chirish Tugmasi */}
                          <button 
                            onClick={() => handleDelete(index)}
                            className="p-2.5 bg-red-500/10 text-red-500/80 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-colors active:scale-90"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Ekran pastiga yopishgan 'Post' tugmasi */}
      <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent backdrop-blur-md pt-10">
        <button 
          className={`w-full font-bold py-4 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.15)] transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 text-base tracking-wide ${queue.length === 0 ? 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-white/5' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          disabled={queue.length === 0}
        >
          <Rocket className="w-5 h-5" /> 
          Kanalga Joylash
        </button>
      </div>
      
    </div>
  );
}
