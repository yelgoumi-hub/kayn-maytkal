# Kayn Maytkal — Android build

## أسرع طريقة بـ Android Studio
1. ثبّت Android Studio.
2. افتح المجلد `android-native` كمشروع.
3. استعمل JDK 17.
4. تأكد أن Android SDK Platform 36 و Build Tools 35.0.0 منصبين.
5. من Android Studio: **Build > Build APK(s)** للتجريب.
6. للنشر: **Build > Generate Signed Bundle / APK > Android App Bundle**.

Application ID: `ma.kaynmaytkal.app`
Version: `1.0.0` (versionCode 1)
Min SDK: 24
Target / Compile SDK: 36

## GitHub Actions
الملف `.github/workflows/android-build.yml` كيبني debug APK تلقائيا على GitHub Actions. من تبويب Actions شغل `Build Android APK` ثم نزّل artifact باسم `Kayn-Maytkal-debug-apk`.

## قبل Google Play
- بدّل/أكد support email وPrivacy Policy URL ديالك في Play Console.
- أنشئ signing key وخليه محفوظ؛ ما تضيعوش.
- خرج `.aab` موقّع من Android Studio للنشر.
- جرّب GPS، الخريطة، الاتصال، مشاركة المكان، والمفضلة على هاتف Android حقيقي.

### ملاحظة Gradle
هاد package ما فيهاش Gradle Wrapper binary. GitHub Actions كينصب Gradle 8.13 تلقائيا، وAndroid Studio يقدر يستعمل Gradle 8.13 بعد ضبطه/تنزيله. السبب هو أن binary wrapper ما خاصوش يتنسخ من source غير موثوق.
