const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Chat.jsx');
const b64 = require('fs').readFileSync(path.join(__dirname, 'chat-b64.txt'), 'utf8');
const content = Buffer.from(b64.trim(), 'base64').toString('utf8');
fs.writeFileSync(file, content, 'utf8');
console.log('Wrote', file, '-', content.length, 'bytes');
