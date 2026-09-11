import { readFile, writeFile, access } from 'node:fs/promises';

async function exists(path) { try { await access(path); return true; } catch { return false; } }

const manifest = 'android/app/src/main/AndroidManifest.xml';
if (!(await exists(manifest))) {
  console.error('Android project not found. Run: npx cap add android');
  process.exit(1);
}
let xml = await readFile(manifest, 'utf8');
const permissions = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />'
];
for (const permission of permissions) {
  if (!xml.includes(permission)) xml = xml.replace('<application', `${permission}\n\n    <application`);
}
await writeFile(manifest, xml);

const vars = 'android/variables.gradle';
if (await exists(vars)) {
  let gradle = await readFile(vars, 'utf8');
  gradle = gradle.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 36');
  gradle = gradle.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 36');
  await writeFile(vars, gradle);
}
console.log('Android location permissions + API 36 patch applied.');
