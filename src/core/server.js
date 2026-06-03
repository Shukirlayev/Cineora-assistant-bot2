const express = require('express');
const cors = require('cors');
const path = require('path');
const { state, getWorkspace, saveState } = require('../services/storage');
const config = require('../config');
const { bot } = require('./bot'); 
const { generateCaption } = require('../utils/ui');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../../dist')));

// 1. O'qish API
app.get('/api/workspace/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userId !== config.OWNER_ID && !state.admins.includes(userId)) return res.status(403).json({ error: "Ruxsat yo'q!" });
    const ws = getWorkspace(userId);
    if (!ws.watermark) ws.watermark = '';
    if (!ws.poster) ws.poster = '';
    if (!ws.uploadStatus) ws.uploadStatus = { isUploading: false, currentVideo: 0, statusText: 'Tayyor' };
    res.json({ success: true, workspace: ws, stats: state.stats, saved_templates: state.saved_templates });
});

// 2. Parametrlarni saqlash (Poster qo'shildi)
app.post('/api/workspace/:userId/update', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    const { title, season, mode, template, watermark, poster } = req.body;
    
    if (title !== undefined) ws.title = title;
    if (season !== undefined) ws.season = parseInt(season, 10) || 1;
    if (mode !== undefined) ws.mode = mode;
    if (template !== undefined) ws.template = template;
    if (watermark !== undefined) ws.watermark = watermark;
    if (poster !== undefined) ws.poster = poster;
    
    await saveState();
    res.json({ success: true, workspace: ws });
});

// 3. Tezkor Amallar (Tozalash, Mavsumni Yopish)
app.post('/api/workspace/:userId/action', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    const { type } = req.body;

    if (type === 'clear') {
        ws.queue = [];
    } else if (type === 'end_season') {
        ws.queue = [];
        if (ws.mode === 'serial') ws.season += 1;
    }
    
    await saveState();
    res.json({ success: true, workspace: ws });
});

// 4. Drag & Drop saqlash
app.post('/api/workspace/:userId/reorder', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    if (Array.isArray(req.body.newQueue)) { ws.queue = req.body.newQueue; await saveState(); }
    res.json({ success: true });
});

// 5. O'chirish va Bekor qilish
app.delete('/api/workspace/:userId/queue/:index', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    ws.queue.splice(parseInt(req.params.index, 10), 1);
    await saveState();
    res.json({ success: true, queue: ws.queue });
});

app.post('/api/workspace/:userId/queue/restore', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    const { item, index } = req.body;
    ws.queue.splice(index, 0, item);
    await saveState();
    res.json({ success: true, queue: ws.queue });
});

// 6. STATUS POLLING
app.get('/api/workspace/:userId/status', (req, res) => {
    const ws = getWorkspace(req.params.userId);
    res.json({ success: true, uploadStatus: ws.uploadStatus || { isUploading: false } });
});

// 7. JONLI KANALGA JOYLASH (Poster bilan ishlash qo'shildi)
app.post('/api/workspace/:userId/post', async (req, res) => {
    const userId = req.params.userId;
    const ws = getWorkspace(userId);
    if (ws.queue.length === 0) return res.status(400).json({ error: "Navbat bo'sh!" });

    ws.uploadStatus = { isUploading: true, currentVideo: 0, statusText: 'Boshlanmoqda...' };
    await saveState();
    res.json({ success: true });

    (async () => {
        let successCount = 0;
        let totalVideos = ws.queue.length;

        for (let i = 0; i < totalVideos; i++) {
            ws.uploadStatus = { isUploading: true, currentVideo: i + 1, statusText: 'Yuklanmoqda 🚀' };
            await saveState();
            
            let isUploaded = false;
            while (!isUploaded) {
                try {
                    let finalCaption = generateCaption(ws.queue[0]);
                    if (ws.watermark) finalCaption += `\n\n${ws.watermark}`;
                    
                    // Agar birinchi qism bo'lsa va poster bor bo'lsa, posterni alohida rasm qilib tashlash
                    if (i === 0 && ws.poster && ws.poster.startsWith('http')) {
                        try {
                            await bot.telegram.sendPhoto(config.TELEGRAM_CHANNEL_ID, ws.poster, {
                                caption: `🎬 <b>${ws.title}</b>\n\nQismlar yuklanmoqda...`,
                                parse_mode: 'HTML'
                            });
                        } catch (e) { console.log("Poster xatosi:", e.message); }
                    }

                    await bot.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, ws.queue[0].fileId, {
                        caption: finalCaption, parse_mode: 'HTML'
                    });
                    
                    ws.queue.shift(); 
                    successCount++;
                    isUploaded = true;
                } catch (error) {
                    if (error.code === 429) {
                        const waitTime = error.response?.parameters?.retry_after || 35;
                        ws.uploadStatus.statusText = `Limit. ${waitTime}s kutish ⏳`;
                        await saveState();
                        await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
                    } else {
                        break; 
                    }
                }
            }
        }

        if (successCount > 0) {
            state.stats.total_posts += 1;
            state.stats.total_videos += successCount;
        }
        
        ws.uploadStatus = { isUploading: false, currentVideo: 0, statusText: 'Tayyor' };
        await saveState();
    })();
});

function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`🌐 Cineora Space Gray API port: ${port}`));
}
module.exports = { startServer };
