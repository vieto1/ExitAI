import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../privacy.mjs',import.meta.url),new URL('../watch/privacy.mjs',import.meta.url));
console.log('Watch-Paket erstellt: watch/ in Chromium als entpackte Erweiterung laden.');
