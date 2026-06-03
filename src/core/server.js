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
    // Watermark va Status defoltlari
    if (!ws.watermark) ws.watermark = '';
    if (!ws.uploadStatus) ws.uploadStatus = { isUploading: false, currentVideo: 0, statusText: 'Tayyor' };
    res.json({ success: true, workspace: ws, stats: state.stats, saved_templates: state.saved_templates });
});

// 2. Parametrlarni (va Watermarkni) saqlash
app.post('/api/workspace/:userId/update', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    const { title, season, mode, template, watermark } = req.body;
    
    if (title !== undefined) ws.title = title;
    if (season !== undefined) ws.season = parseInt(season, 10) || 1;
    if (mode !== undefined) ws.mode = mode;
    if (template !== undefined) ws.template = template;
    if (watermark !== undefined) ws.watermark = watermark;
    
    await saveState();
    res.json({ success: true, workspace: ws });
});

// 3. Drag & Drop saqlash
app.post('/api/workspace/:userId/reorder', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    if (Array.isArray(req.body.newQueue)) { ws.queue = req.body.newQueue; await saveState(); }
    res.json({ success: true });
});

// 4. O'chirish va Bekor qilish (Undo)
app.delete('/api/workspace/:userId/queue/:index', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    ws.queue.splice(parseInt(req.params.index, 10), 1);
    await saveState();
    res.json({ success: true, queue: ws.queue });
});

app.post('/api/workspace/:userId/queue/restore', async (req, res) => {
    const ws = getWorkspace(req.params.userId);
    const { item, index } = req.body;
    ws.queue.splice(index, 0, item); // O'chirilgan joyiga qaytarish
    await saveState();
    res.json({ success: true, queue: ws.queue });
});

// 5. STATUS POLLING (Fonda nima bo'layotganini bilib turish)
app.get('/api/workspace/:userId/status', (req, res) => {
    const ws = getWorkspace(req.params.userId);
    res.json({ success: true, uploadStatus: ws.uploadStatus || { isUploading: false } });
});

// 6. JONLI KANALGA JOYLASH (Aqlli tizim)
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
                    // Custom Watermark qo'shish
                    if (ws.watermark) finalCaption += `\n\n${ws.watermark}`;

                    await bot.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, ws.queue[0].fileId, {
                        caption: finalCaption, parse_mode: 'HTML'
                    });
                    
                    ws.queue.shift(); // Yuklanganini ro'yxatdan olib tashlaymiz
                    successCount++;
                    isUploaded = true;
                } catch (error) {
                    if (error.code === 429) {
                        const waitTime = error.response?.parameters?.retry_after || 35;
                        ws.uploadStatus.statusText = `Limit. ${waitTime}s kutilmoqda ⏳`;
                        await saveState();
                        await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
                    } else {
                        break; // Boshqa xato
                    }
                }
            }
        }

        // Barcha ishlar tugagach
        if (successCount > 0) {
            state.stats.total_posts += 1;
            state.stats.total_videos += successCount;
            // B3: Avto Inkrement (Agar serial bo'lsa, keyingi safar uchun faslni avtomat ko'tarib qo'yish imkoniyati)
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
