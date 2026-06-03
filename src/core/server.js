const express = require('express');
const cors = require('cors');
const path = require('path');
const { state, getWorkspace, saveState } = require('../services/storage');
const config = require('../config');
const { bot } = require('./bot'); // Bot instansiyasini chaqiramiz
const { generateCaption, generateProgressBar } = require('../utils/ui');

const app = express();
app.use(cors());
app.use(express.json());

// React static fayllarini ulash
app.use(express.static(path.join(__dirname, '../../dist')));

// 1️⃣ API: Ma'lumotlarni o'qish
app.get('/api/workspace/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userId !== config.OWNER_ID && !state.admins.includes(userId)) {
        return res.status(403).json({ error: "Ruxsat yo'q!" });
    }
    const ws = getWorkspace(userId);
    res.json({ success: true, workspace: ws, stats: state.stats, saved_templates: state.saved_templates });
});

// 2️⃣ API: Loyiha parametrlarini yangilash (Nom, Fasl, Rejim, Shablon)
app.post('/api/workspace/:userId/update', async (req, res) => {
    const userId = req.params.userId;
    if (userId !== config.OWNER_ID && !state.admins.includes(userId)) return res.status(403).json({ error: "Ruxsat yo'q!" });
    
    const ws = getWorkspace(userId);
    const { title, season, mode, template } = req.body;
    
    if (title !== undefined) ws.title = title;
    if (season !== undefined) ws.season = parseInt(season, 10) || 1;
    if (mode !== undefined) ws.mode = mode;
    if (template !== undefined) ws.template = template;
    
    await saveState();
    res.json({ success: true, workspace: ws });
});

// 3️⃣ API: Drag-and-Drop amalini bazada saqlash
app.post('/api/workspace/:userId/reorder', async (req, res) => {
    const userId = req.params.userId;
    if (userId !== config.OWNER_ID && !state.admins.includes(userId)) return res.status(403).json({ error: "Ruxsat yo'q!" });
    
    const ws = getWorkspace(userId);
    const { newQueue } = req.body;
    
    if (Array.isArray(newQueue)) {
        ws.queue = newQueue;
        await saveState();
    }
    res.json({ success: true });
});

// 4️⃣ API: Navbatdan bitta videoni o'chirish
app.delete('/api/workspace/:userId/queue/:index', async (req, res) => {
    const userId = req.params.userId;
    if (userId !== config.OWNER_ID && !state.admins.includes(userId)) return res.status(403).json({ error: "Ruxsat yo'q!" });
    
    const ws = getWorkspace(userId);
    const index = parseInt(req.params.index, 10);
    
    if (ws.queue[index]) {
        ws.queue.splice(index, 1);
        await saveState();
    }
    res.json({ success: true, queue: ws.queue });
});

// 5️⃣ API: KANALGA JOYLASH TRIGGELI (Botni ishga tushirish)
app.post('/api/workspace/:userId/post', async (req, res) => {
    const userId = req.params.userId;
    if (userId !== config.OWNER_ID && !state.admins.includes(userId)) return res.status(403).json({ error: "Ruxsat yo'q!" });
    
    const ws = getWorkspace(userId);
    const totalVideos = ws.queue.length;
    if (totalVideos === 0) return res.status(400).json({ error: "Navbat bo'sh!" });

    // Yuklash jarayonini asinxron fonda boshlaymiz (Kutish xatosi bermasligi uchun)
    res.json({ success: true, message: "Yuklash boshlandi" });

    (async () => {
        let successCount = 0;
        let hasFatalError = false;

        for (let i = 0; i < totalVideos; i++) {
            let isUploaded = false;
            while (!isUploaded) {
                try {
                    await bot.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, ws.queue[i].fileId, {
                        caption: generateCaption(ws.queue[i]),
                        parse_mode: 'HTML'
                    });
                    successCount++;
                    isUploaded = true;
                } catch (error) {
                    if (error.code === 429) {
                        const retryAfter = error.response?.parameters?.retry_after || 30;
                        await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
                    } else {
                        hasFatalError = true;
                        break;
                    }
                }
            }
            if (hasFatalError) break;
        }

        if (successCount > 0) {
            state.stats.total_posts += 1;
            state.stats.total_videos += successCount;
            state.stats.history.unshift({
                type: ws.mode,
                title: ws.title,
                season: ws.mode === 'serial' ? ws.season : null,
                episodes: successCount,
                admin: userId,
                date: new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false })
            });
            if (state.stats.history.length > 50) state.stats.history.pop();
            
            ws.queue = ws.queue.slice(successCount);
            await saveState();
        }
    })();
});

function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`🌐 Premium API Engine active on port ${port}`));
}

module.exports = { startServer };
