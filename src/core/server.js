const http = require('http');

function startServer(port) {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    });

    server.listen(port, () => {
        console.log(`🚀 Sog'liqni tekshirish (Cron-job) server porti: ${port}`);
    });
}

module.exports = { startServer };
