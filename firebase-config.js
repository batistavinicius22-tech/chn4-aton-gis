/* ==========================================================================
   CENTRO DE HIDROGRAFIA DO NORTE (CHN-4 / 4º DISTRITO NAVAL)
   Configuração do Firebase Cloud Firestore (Banco de Dados em Tempo Real na Nuvem)
   ========================================================================== */

// Configuração do seu Projeto Firebase
// Substitua as chaves abaixo pelas chaves fornecidas no seu Console Firebase (https://console.firebase.google.com)
const firebaseConfig = {
    apiKey: "AIzaSy_SUA_CHAVE_API_AQUI",
    authDomain: "chn4-aton-gis.firebaseapp.com",
    projectId: "chn4-aton-gis",
    storageBucket: "chn4-aton-gis.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

let db = null;
let isFirebaseActive = false;

if (typeof firebase !== 'undefined') {
    try {
        if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("SUA_CHAVE_API_AQUI")) {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            isFirebaseActive = true;
            console.log("🔥 Firebase Cloud Firestore conectado com sucesso!");
        } else {
            console.log("ℹ️ Firebase SDK carregado. Aguardando inserção das chaves em firebase-config.js para ativar a nuvem.");
        }
    } catch (e) {
        console.warn("⚠️ Erro ao inicializar o Firebase:", e);
    }
}
