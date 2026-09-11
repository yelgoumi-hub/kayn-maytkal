# Kayn Maytkal v1.0

**Kayn Maytkal** تطبيق/PWA كيلقا المطاعم، fast-food، cafés والمخابز القريبة حسب localisation.

## شنو كاين فهاد package
- `www/` — النسخة web/PWA الجاهزة للنشر على HTTPS.
- `android-native/` — مشروع Android native WebView بـGPS permissions وshare/external links.
- `.github/workflows/android-build.yml` — build أوتوماتيكي ديال debug APK على GitHub Actions.
- `.github/workflows/deploy-pages.yml` — نشر PWA على GitHub Pages.
- `privacy.html` — Privacy Policy.
- `docs/PLAY-STORE-LISTING.md` — نص Google Play listing.
- `OWNER-ACTIONS.md` — الحوايج المرتبطة بحساب المالك قبل Production.

## Test سريع للـWeb
شغّل local HTTP server من المجلد ثم افتح `?demo=1` باش تشوف بيانات تجريبية. Geolocation الحقيقية خاصها HTTPS أو localhost.

## Android
شوف `android-native/BUILD-ANDROID.md`.

Application ID: `ma.kaynmaytkal.app`
Version: `1.0.0`
