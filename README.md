# HISOBPRO (serversiz, telefon ↔ telefon)

## O'rnatish
npx create-expo-app hisobpro --template blank && cd hisobpro
npx expo install expo-sqlite expo-secure-store expo-image-picker expo-image-manipulator expo-camera react-native-svg expo-dev-client
npm i react-native-webrtc @config-plugins/react-native-webrtc react-native-qrcode-svg tweetnacl tweetnacl-util react-native-get-random-values
Shu papkadagi App.js, db.js, logic.js, p2p.js, i18n.js, app.json, eas.json fayllarini loyihaga ustiga ko'chiring.

## APK
npm i -g eas-cli && eas login && eas build -p android --profile preview
(react-native-webrtc sabab Expo Go ishlamaydi — faqat shu build yoki `npx expo run:android`.)

## Ishlash tartibi
1. Birinchi telefon: "Asosiy admin" — kompaniya yaratadi.
2. Boshqalar: ism, raqam, (rasm), rol so'rab ro'yxatdan o'tadi.
3. "Ulanish" bo'limi: A "QR ko'rsatish" → B "QR skanerlash" → B javob QR ko'rsatadi → A "Javobni skanerlash".
4. Admin "Xodimlar"da rolni tasdiqlaydi va magazin biriktiradi (imzolangan operatsiya sifatida hamma telefonga tarqaladi).
