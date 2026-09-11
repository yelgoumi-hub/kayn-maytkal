# الحوايج الوحيدة اللي خاص مالك التطبيق يديرهم قبل النشر

الكود والتجهيز التقني موجودين. هاد النقاط مرتبطة بالحساب والهوية ديالك، لذلك ما خاصهاش تتخمن:

1. **Support email**: اختار email صحيح خاص بالدعم وحطو فـGoogle Play Console.
2. **Developer account**: دخل/أنشئ Google Play Developer account باسمك أو باسم النشاط ديالك.
3. **Signing key**: من Android Studio استعمل `Generate Signed Bundle / APK` وخزّن keystore/password فبلاصة آمنة.
4. **Privacy Policy URL**: نشر مجلد `www` على HTTPS (GitHub Pages / Netlify / Vercel) واستعمل رابط `privacy.html`.
5. **Store listing**: استعمل النص الموجود في `docs/PLAY-STORE-LISTING.md` وزيد screenshots حقيقية من هاتفك قبل Production.
6. **Real-device test**: جرّب GPS، recherche، map، route، favoris وshare على هاتف Android قبل رفع AAB.

ما تشاركش keystore ولا passwords مع أي شخص.
