import { rm, mkdir, copyFile, cp } from 'node:fs/promises';

const files = ['index.html', 'style.css', 'app.js', 'manifest.json', 'sw.js', 'privacy.html', 'icon.svg'];
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
for (const file of files) await copyFile(file, `www/${file}`);
await cp('icons', 'www/icons', { recursive: true });
console.log('Web build ready in www/');
