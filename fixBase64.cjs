const fs = require('fs');
const b64 = fs.readFileSync('public/logo.png', 'base64');
fs.writeFileSync('src/lib/logoBase64.ts', 'export const logoBase64 = "' + 'data:image/png;base64,' + b64 + '";\n');
