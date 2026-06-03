import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Rocket, Film, Tv, LayoutGrid, FileText, Check, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [userId, setUserId] = useState(null);
  const [ws, setWs] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [posting, setPosting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [season, setSeason] = useState(1);
  const [activeTpl, setActiveTpl] = useState('');

  const triggerHaptic = (type = 'light') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
    }
  };

  const loadData = (uid) => {
    fetch(`/api/workspace/${uid}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWs(data.workspace);
          setQueue(data.workspace.queue);
          setStats(data.stats);
          setTemplates(data.saved_templates);
          setTitle(data.workspace.title);
          setSeason(data.workspace.season);
          setActiveTpl(data.workspace.template || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    const uid = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('userId');
    setUserId(uid);
    if (uid) loadData(uid);
  }, []);

  // 1. Drag and Drop Saqlash Tizimi
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    triggerHaptic('light');
    
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setQueue(items);

    fetch(`/api/workspace/${userId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newQueue: items })
    });
  };

  // 2. Elementni O'chirish
  const handleDelete = async (index) => {
    triggerHaptic('medium');
    const updated = queue.filter((_, i) => i !== index);
    setQueue(updated);

    fetch(`/api/workspace/${userId}/queue/${index}`, { method: 'DELETE' });
  };

  // 3. Parametrlarni Avtomat Saqlash (Flat Blur Inputs)
  const saveParam = async (field, value) => {
    setUpdating(true);
    const body = {};
    body[field] = value;

    const res = await fetch(`/api/workspace/${userId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      setWs(data.workspace);
    }
    setUpdating(false);
  };

  // 4. Kanalga Joylashni Boshlash Triggeli
  const handlePostToChannel = async () => {
    if (queue.length === 0 || posting) return;
    triggerHaptic('heavy');
    setPosting(true);

    const res = await fetch(`/api/workspace/${userId}/post`, { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
          title: 'Konveyer Ishga Tushdi 🚀',
          message: `Jami ${queue.length} ta video fonda yuklanmoqda. Bot sahifasini yopishingiz mumkin, tizim o'zi avtomat hammasini yakunlaydi.`,
          buttons: [{ type: 'ok' }]
        });
      }
      setQueue([]);
    }
    setPosting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[2px] border-zinc-700 border-t-white rounded-full animate-spin"></div>
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold animate-pulse">Loading Matrix</p>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl backdrop-blur-md max-w-xs">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">Sessiya tasdiqlanmadi. Kirish taqiqlangan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white p-5 font-sans pb-36 selection:bg-zinc-800 overflow-x-hidden">
      
      {/* SECTION 1: HEADER (Apple Minimalist Branding) */}
      <div className="flex justify-between items-center mb-6 pt-2 border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            CINEORA <span className="text-[10px] text-zinc-600 font-mono tracking-normal bg-zinc-900 px-1.5 py-0.5 rounded">V2</span>
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium tracking-wide mt-0.5">ADMIN STUDIO CONTROL</p>
        </div>
        
        {/* State Indicator */}
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/60 px-3 py-1.5 rounded-full backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${updating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {updating ? 'Saving' : 'Sync'}
          </span>
        </div>
      </div>

      {/* SECTION 2: DIGITAL WALL STATS (Stripe Typography) */}
      <div className="grid grid-cols-2 gap-3.5 mb-7">
        <div className="bg-gradient-to-br from-[#0c0c0e] to-[#080809] border border-zinc-800/40 p-4 rounded-2xl relative group">
          <p className="text-[10px] text-zinc-500 mb-1 font-bold tracking-widest uppercase">Buffer Queue</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-light tracking-tight text-white">{queue.length}</p>
            <p className="text-xs text-zinc-600 font-medium font-mono">items</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#0c0c0e] to-[#080809] border border-zinc-800/40 p-4 rounded-2xl relative">
          <p className="text-[10px] text-zinc-500 mb-1 font-bold tracking-widest uppercase">Historical Log</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-light tracking-tight text-white">{stats.total_videos}</p>
            <p className="text-xs text-zinc-600 font-medium font-mono">clips</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: CORE PARAMETERS (Premium Form Control) */}
      <div className="bg-[#09090b] border border-zinc-900 rounded-2xl p-4 space-y-4 mb-7 shadow-2xl relative">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold tracking-wider uppercase mb-1 border-b border-zinc-900 pb-2">
          <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
          <span>Loyiha Arxitekturasi</span>
        </div>

        {/* Flat Input - Title */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">Asar Nomi</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => saveParam('title', e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-medium"
            placeholder="Untitled Project"
          />
        </div>

        {/* Mode Selector Switch (Premium Segmented Control) */}
        <div className="grid grid-cols-2 gap-1.5 bg-black p-1 rounded-xl border border-zinc-800/80">
          <button 
            onClick={() => { triggerHaptic('light'); saveParam('mode', 'serial'); }}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${ws.mode === 'serial' ? 'bg-zinc-900 text-white border border-zinc-800 shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Tv className="w-3.5 h-3.5" /> Serial Mode
          </button>
          <button 
            onClick={() => { triggerHaptic('light'); saveParam('mode', 'movie'); }}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${ws.mode === 'movie' ? 'bg-zinc-900 text-white border border-zinc-800 shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Film className="w-3.5 h-3.5" /> Movie Mode
          </button>
        </div>

        {/* Conditionally Render Season - Inline Flow */}
        {ws.mode === 'serial' && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">Joriy Mavsum (Fasl)</label>
            <input 
              type="number" 
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              onBlur={(e) => saveParam('season', e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-all font-mono font-bold"
            />
          </div>
        )}

        {/* Template Selector (Custom Minimal Dropdown replacement) */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">Faol Matn Shablonlari</label>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl, idx) => {
              const isSelected = activeTpl === tpl.text;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    const nextTpl = isSelected ? '' : tpl.text;
                    setActiveTpl(nextTpl);
                    saveParam('template', nextTpl);
                  }}
                  className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all flex items-center gap-1.5 ${isSelected ? 'bg-white text-black border-white font-bold' : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <FileText className="w-3 h-3" />
                  {tpl.name}
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              );
            })}
            {templates.length === 0 && (
              <p className="text-xs text-zinc-600 italic p-1">Botda saqlangan shablonlar topilmadi.</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: DYNAMIC DRAG-AND-DROP CANVAS */}
      <div className="mb-4 flex justify-between items-center px-1">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Konveyer Tizimi</h2>
        <span className="text-[10px] font-mono text-zinc-600 font-bold uppercase">Hold & Slide</span>
      </div>

      <div className="space-y-2.5">
        {queue.length === 0 ? (
          <div className="bg-black border-[0.5px] border-zinc-800 border-dashed rounded-2xl p-12 text-center text-zinc-600 text-xs font-medium flex flex-col items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-zinc-700 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Kargo bo'sh. Telegramda video yuborishingiz bilan u shu yerda avtomatik paydo bo'ladi.</span>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="premium-queue">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {queue.map((video, index) => (
                    <Draggable key={`v-${index}`} draggableId={`v-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                            snapshot.isDragging 
                              ? 'bg-zinc-900/90 border border-zinc-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] scale-[1.015] backdrop-blur-md' 
                              : 'bg-[#09090b] border border-zinc-900/60 hover:border-zinc-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 overflow-hidden">
                            {/* Pro Grip Handle (Grip handle dots) */}
                            <div 
                              {...provided.dragHandleProps} 
                              className="p-1.5 -ml-2 text-zinc-700 hover:text-zinc-400 transition-colors cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-4 h-4 stroke-[2.5]" />
                            </div>
                            
                            {/* Meta Data */}
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-zinc-200 tracking-wide font-mono">
                                {video.mode === 'serial' ? `S${String(video.season).padStart(2, '0')}E${String(video.episode).padStart(2, '0')}` : 'FILM CLIP'}
                              </span>
                              <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[170px] mt-0.5">{video.title}</span>
                            </div>
                          </div>
                          
                          {/* Trash Handle */}
                          <button 
                            onClick={() => handleDelete(index)}
                            className="p-2.5 bg-zinc-950 hover:bg-red-950/20 text-zinc-600 hover:text-red-400 rounded-xl transition-all border border-zinc-900 hover:border-red-900/30 active:scale-90"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* SECTION 5: FIXED FLOATING CONTROL HUB (Apple Solid Glass Button) */}
      <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md pt-12 z-50">
        <button 
          onClick={handlePostToChannel}
          className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest ${queue.length === 0 || posting ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800/60' : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_40px_rgba(255,255,255,0.08)] active:scale-[0.98]'}`}
          disabled={queue.length === 0 || posting}
        >
          <Rocket className="w-4 h-4 fill-current stroke-[2]" /> 
          {posting ? 'Deploying Matrix...' : 'Execute Launch'}
        </button>
      </div>
      
    </div>
  );
}
