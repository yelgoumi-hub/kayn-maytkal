# Launch checklist — Kayn Maytkal

## قبل النشر
- [ ] جرّب localisation على Android حقيقي عبر HTTPS.
- [ ] جرّب البحث في 1 / 3 / 5 / 10 km.
- [ ] جرّب Itinéraire, Favoris, Share, Map, Install.
- [ ] جرّب التطبيق بلا إنترنت: الواجهة والمفضلة يبقاو ظاهرين.
- [ ] تأكد من كتابة اسم developer وsupport email في المتجر.

## إطلاق سريع كـWeb/PWA
ارفع محتويات هذا المجلد إلى Netlify أو Vercel. خاص الدومين يكون HTTPS باش localisation وPWA installation يخدمو مزيان.

## Android native wrapper (Capacitor)
من جهاز فيه Android Studio وAndroid SDK:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npm run android:open
```

داخل Android Studio: اختبر التطبيق، اختار package/signing، ومن بعد Build > Generate Signed App Bundle / APK.

## مهم
النسخة الحالية ما عندهاش backend خاص. البحث كيمشي مباشرة لـOverpass/OpenStreetMap. قبل ما يكبر عدد المستخدمين، خاص backend/proxy أو مزوّد Places مناسب باش تكون الخدمة أكثر استقراراً وتحترم usage policies ديال الخدمات العامة.

## Google Play — exigence actuelle (11 septembre 2026)
- Les nouvelles apps Android soumises à Google Play doivent cibler **Android 16 / API 36 ou plus**.
- Si ton compte développeur personnel a été créé après le 13 novembre 2023, Google Play demande en général un **closed test avec au moins 12 testeurs inscrits pendant 14 jours continus** avant de demander l'accès Production.
- Vérifie aussi la section Data safety et déclare l'utilisation de la localisation de façon cohérente avec la politique de confidentialité.
