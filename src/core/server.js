const express = require('express');
const cors = require('cors');
const path = require('path');
const { state, getWorkspace } = require('../services/storage');

const app = express();
app.use(cors());
app.use(express.json());

// REACT SAYTNI OCHIB BERISH (Kelajakda React build fayllari public papkasiga tushadi)
app.use(express.static(path.join(__dirname, '../../public')));

// 1️⃣ API: React saytiga Navbat va Statistikani beruvchi yo'lak
app.get('/api/workspace/:userId', (req, res) => {
    const userId = req.params.userId;
    // Faqat tizimda ruxsati bor adminlargagina ma'lumot beramiz
    if (userId !== process.env.OWNER_ID && !state.admins.includes(userId)) {
        return res.status(403).json({ error: "Ruxsat etilmagan!" });
    }
    
    const ws = getWorkspace(userId);
    res.json({
        success: true,
        workspace: ws,
        stats: state.stats
    });
});

function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`🌐 Server (va Web App API) ${port}-portda ishga tushdi`);
    });
}

module.exports = { startServer };
