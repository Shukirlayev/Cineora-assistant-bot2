import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Rocket, Search, Smartphone, ShieldCheck, Undo2, PlayCircle, Image as ImageIcon, CheckCircle2, Loader2, Info, Flag, ListX } from 'lucide-react';

export default function App() {
  const [userId, setUserId] = useState(null);
  const [ws, setWs] = useState(null);
  const [queue, setQueue] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ isUploading: false });

  const triggerHaptic = (type = 'light') => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);

  useEffect(() => {
    let interval;
    if (uploadStatus.isUploading && userId) {
      interval = setInterval(() => {
        fetch(`/api/workspace/${userId}/status`).then(res => res.json()).then(data => {
          setUploadStatus(data.uploadStatus);
          if (!data.uploadStatus.isUploading) loadData(userId);
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [uploadStatus.isUploading, userId]);

  const loadData = (uid) => {
    fetch(`/api/workspace/${uid}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWs(data.workspace);
          setQueue(data.workspace.queue);
          setUploadStatus(data.workspace.uploadStatus || { isUploading: false });
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  };

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setBackgroundColor('#1C1C1E');
    tg.setHeaderColor('#1C1C1E');
    
    const uid = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('userId');
    setUserId(uid);
    if (uid) loadData(uid);
  }, []);

  const handlePinInput = (num) => {
    triggerHaptic('light');
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin === '0000') {
        triggerHaptic('heavy');
        setIsAuthenticated(true);
      } else if (newPin.length === 4) {
        triggerHaptic('medium');
        setTimeout(() => setPin(''), 400);
      }
    }
  };

  const saveParam = async (field, value) => {
    const body = {}; body[field] = value;
    await fetch(`/api/workspace/${userId}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setWs(prev => ({ ...prev, [field]: value }));
  };

  // --- BOT AMALLARI (Mavsumni yopish, Tozalash) ---
  const handleAction = (type, title, message) => {
    const tg = window.Telegram.WebApp;
    if (tg.showConfirm) {
      tg.showConfirm(message, async (confirmed) => {
        if (confirmed) {
          triggerHaptic('heavy');
          const res = await fetch(`/api/workspace/${userId}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
          const data = await res.json();
          if (data.success) {
            setWs(data.workspace);
            setQueue(data.workspace.queue);
          }
        }
      });
    }
  };

  const filteredQueue = queue.filter(v => v.title?.toLowerCase().includes(searchQuery.toLowerCase()) || v.season?.toString().includes(searchQuery));

  const handleDelete = async (index) => {
    triggerHaptic('medium');
    const itemToDel = queue[index];
    setLastDeleted({ item: itemToDel, originalIndex: index });
    const updated = queue.filter((_, i) => i !== index);
    setQueue(updated);
    await fetch(`/api/workspace/${userId}/queue/${index}`, { method: 'DELETE' });
    setTimeout(() => setLastDeleted(null), 5000); 
  };

  const handleUndo = async () => {
    if (!lastDeleted) return;
    triggerHaptic('heavy');
    const { item, originalIndex } = lastDeleted;
    const updated = [...queue];
    updated.splice(originalIndex, 0, item);
    setQueue(updated);
    setLastDeleted(null);
    await fetch(`/api/workspace/${userId}/queue/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, index: originalIndex }) });
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    triggerHaptic('light');
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setQueue(items);
    await fetch(`/api/workspace/${userId}/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newQueue: items }) });
  };

  const handlePost = async () => {
    if (queue.length === 0 || uploadStatus.isUploading) return;
    triggerHaptic('heavy');
    setUploadStatus({ isUploading: true, statusText: 'Boshlanmoqda...' });
    await fetch(`/api/workspace/${userId}/post`, { method: 'POST' });
  };

  if (loading) return <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#0A84FF] animate-spin" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1C1C1E] text-[#F2F2F7] flex flex-col items-center justify-center p-6">
        <ShieldCheck className="w-12 h-12 text-[#0A84FF] mb-6" />
        <h2 className="text-xl font-medium mb-8 tracking-wide">Enter PIN to Access</h2>
        <div className="flex gap-4 mb-10">
          {[0, 1, 2, 3].map(i => <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length > i ? 'bg-[#0A84FF] border-[#0A84FF]' : 'border-[#3A3A3C]'}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handlePinInput(num.toString())} className="w-16 h-16 rounded-full bg-[#2C2C2E] text-2xl font-medium active:bg-[#3A3A3C] transition-colors">{num}</button>
          ))}
          <div />
          <button onClick={() => handlePinInput('0')} className="w-16 h-16 rounded-full bg-[#2C2C2E] text-2xl font-medium active:bg-[#3A3A3C] transition-colors">0</button>
          <button onClick={() => setPin(pin.slice(0, -1))} className="w-16 h-16 rounded-full flex items-center justify-center text-[#FF453A] active:bg-[#3A3A3C] transition-colors text-lg font-medium">Del</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1E] text-[#F2F2F7] font-sans pb-40 overflow-x-hidden selection:bg-[#0A84FF]/30">
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-[#3A3A3C]/50 px-5 pt-4 pb-3 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Studio Control</h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">Cineora Workspace</p>
        </div>
        {uploadStatus.isUploading ? (
          <div className="flex items-center gap-2 bg-[#0A84FF]/10 text-[#0A84FF] px-3 py-1.5 rounded-full border border-[#0A84FF]/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[11px] font-bold tracking-wide">{uploadStatus.statusText}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#32D74B]/10 text-[#32D74B] px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">System Ready</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-6">
        
        {/* Loyiha Sozlamalari (Poster bilan) */}
        <div className="bg-[#2C2C2E] border border-[#3A3A3C] rounded-2xl p-4 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[13px] font-medium text-[#8E8E93]">Loyiha Nomi</span>
            <input 
              type="text" value={ws.title || ''} 
              onChange={(e) => setWs({...ws, title: e.target.value})} onBlur={(e) => saveParam('title', e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#3A3A3C] rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:border-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[13px] font-medium text-[#8E8E93] flex items-center gap-1.5"><ImageIcon className="w-4 h-4"/> Poster (Rasm Linki)</span>
            <input 
              type="text" placeholder="https://..." value={ws.poster || ''} 
              onChange={(e) => setWs({...ws, poster: e.target.value})} onBlur={(e) => saveParam('poster', e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#3A3A3C] rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#0A84FF] text-[#0A84FF]"
            />
          </div>
          
          <div className="pt-2">
            <span className="text-[13px] font-medium text-[#8E8E93] mb-1.5 block">Kanalingiz Watermarki</span>
            <input 
              type="text" placeholder="@CineoraUz" value={ws.watermark || ''} 
              onChange={(e) => setWs({...ws, watermark: e.target.value})} onBlur={(e) => saveParam('watermark', e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-[13px] focus:outline-none text-[#F2F2F7]"
            />
          </div>
        </div>

        {/* Tezkor Amallar (Bot funksiyalari o'rniga) */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleAction('end_season', 'Mavsumni Yopish', 'Haqiqatan ham joriy mavsumni yopmoqchimisiz? Navbat tozalanadi va fasl 1 taga oshadi.')}
            className="bg-[#2C2C2E] border border-[#3A3A3C] hover:bg-[#3A3A3C] p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <Flag className="w-5 h-5 text-[#0A84FF]" />
            <span className="text-[12px] font-medium text-[#F2F2F7]">Mavsumni Yopish</span>
          </button>
          
          <button 
            onClick={() => handleAction('clear', 'Navbatni Tozalash', 'Navbatdagi barcha videolar butunlay o\'chirib tashlanadi. Tasdiqlaysizmi?')}
            className="bg-[#2C2C2E] border border-[#3A3A3C] hover:bg-[#3A3A3C] p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <ListX className="w-5 h-5 text-[#FF453A]" />
            <span className="text-[12px] font-medium text-[#F2F2F7]">Navbatni Tozalash</span>
          </button>
        </div>

        {/* Qidiruv va Navbat */}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input 
              type="text" placeholder="Qidiruv..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-[#3A3A3C] text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#0A84FF]"
            />
          </div>

          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-[15px] font-semibold text-[#F2F2F7]">Yuklash Navbati ({filteredQueue.length})</h2>
            <button onClick={() => {triggerHaptic('light'); setPreviewOpen(true);}} className="flex items-center gap-1.5 text-[12px] text-[#0A84FF] font-medium">
              <Smartphone className="w-3.5 h-3.5" /> Jonli Preview
            </button>
          </div>

          <div className="space-y-2">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="q">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {filteredQueue.map((video, index) => (
                      <Draggable key={`v-${index}`} draggableId={`v-${index}`} index={index} isDragDisabled={searchQuery.length > 0}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className={`flex items-center justify-between p-3.5 rounded-xl mb-2 transition-all ${snapshot.isDragging ? 'bg-[#3A3A3C] shadow-2xl scale-[1.02] border-[#0A84FF]/50' : 'bg-[#2C2C2E] border border-[#3A3A3C]'}`}>
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="p-1 text-[#8E8E93]">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[15px] font-semibold">{video.mode === 'serial' ? `S${String(video.season).padStart(2,'0')}E${String(video.episode).padStart(2,'0')}` : 'Kino'}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-[#8E8E93] truncate max-w-[130px]">{video.title || ws.title}</span>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleDelete(index)} className="p-2 text-[#FF453A]/80 hover:bg-[#FF453A]/10 rounded-lg">
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
          </div>
        </div>
      </div>

      {/* Bekor qilish */}
      {lastDeleted && (
        <div className="fixed bottom-[90px] left-5 right-5 bg-[#3A3A3C]/95 backdrop-blur-md border border-[#48484A] p-3 rounded-xl shadow-2xl flex justify-between items-center z-40">
          <div className="flex items-center gap-2 text-sm text-[#F2F2F7]">
            <Info className="w-4 h-4 text-[#0A84FF]" /> 1 ta qism o'chirildi
          </div>
          <button onClick={handleUndo} className="flex items-center gap-1.5 text-sm font-bold text-[#0A84FF]">
            <Undo2 className="w-4 h-4" /> Qaytarish
          </button>
        </div>
      )}

      {/* Asosiy Post Tugmasi */}
      <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/95 to-transparent z-30">
        <button 
          onClick={handlePost} disabled={queue.length === 0 || uploadStatus.isUploading}
          className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-[15px] transition-transform active:scale-[0.98] ${queue.length === 0 || uploadStatus.isUploading ? 'bg-[#2C2C2E] text-[#8E8E93]' : 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/20'}`}
        >
          <Rocket className="w-4 h-4" /> {uploadStatus.isUploading ? 'Yuklanmoqda...' : 'Kanalga Joylash'}
        </button>
      </div>

      {/* Preview Sheet */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${previewOpen ? 'bg-black/60 pointer-events-auto' : 'bg-transparent pointer-events-none'}`} onClick={() => setPreviewOpen(false)}>
        <div className={`absolute bottom-0 left-0 w-full h-[75vh] bg-[#1C1C1E] rounded-t-3xl transition-transform duration-300 flex flex-col ${previewOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-center p-3"><div className="w-12 h-1.5 bg-[#3A3A3C] rounded-full" /></div>
          <div className="px-5 pb-2 border-b border-[#3A3A3C] flex justify-between items-center">
            <h3 className="font-semibold text-[#F2F2F7]">Telegram Simulyator</h3>
            <button onClick={() => setPreviewOpen(false)} className="text-[#0A84FF] text-sm font-medium">Yopish</button>
          </div>
          <div className="p-5 flex-1 overflow-y-auto bg-black/20">
            <div className="bg-[#2C2C2E] rounded-2xl rounded-bl-sm p-3 max-w-[85%] border border-[#3A3A3C]/50 relative">
              {ws.poster ? (
                <img src={ws.poster} alt="Poster" className="w-full h-32 object-cover rounded-lg mb-2 opacity-80" />
              ) : (
                <div className="w-full h-32 bg-black rounded-lg flex items-center justify-center mb-2"><PlayCircle className="w-8 h-8 text-white/50" /></div>
              )}
              <p className="text-[14px] text-[#F2F2F7] leading-relaxed whitespace-pre-wrap">
                🎬 <b>{ws.title || 'Kino nomi'}</b><br/>📺 Fasl: {ws.season} • Qism: {queue[0]?.episode || '01'}<br/><br/><i>{ws.template || 'Qo\'shimcha ma\'lumotlar...'}</i><br/><br/><span className="text-[#0A84FF]">{ws.watermark || '@CineoraUz'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
