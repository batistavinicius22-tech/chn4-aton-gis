# 🚀 Guia Prático: Ativar o Banco de Dados em Tempo Real no GitHub Pages (Firebase Firestore)

Este guia explica como ativar o banco de dados gratuito na nuvem da Google (**Firebase Cloud Firestore**). 

Com ele ativo, **qualquer pessoa que acessar o link do seu site no GitHub Pages conseguirá criar, editar e excluir sinais**, e todas as alterações serão refletidas em tempo real nas telas de todos os usuários 24h/dia, sem você precisar rodar nenhum servidor local ou aprovar manualmente!

---

## ⏱️ Passo a Passo (Leva apenas 2 minutos):

### 1. Criar o Projeto no Firebase (Gratuito)
1. Acesse o console do Firebase: **[https://console.firebase.google.com/](https://console.firebase.google.com/)** com sua conta Google.
2. Clique em **"Adicionar projeto"** (ou **"Criar um projeto"**).
3. Digite o nome do projeto (ex: `chn4-aton-gis`) e clique em **Continuar**.
4. Desative o Google Analytics (opcional) e clique em **Criar projeto**.

### 2. Ativar o Banco de Dados Cloud Firestore
1. No menu lateral esquerdo, clique em **Build** > **Firestore Database**.
2. Clique no botão **"Criar banco de dados"**.
3. Selecione o local do banco (ex: `nam5 (us-central)` ou `southamerica-east1 (São Paulo)`).
4. Em **Regras de Segurança**, selecione **"Iniciar no modo de teste"** (isso permite que qualquer usuário autorizado leia e grave os sinais) e clique em **Criar**.

### 3. Copiar as Chaves do Projeto Web
1. Na página inicial do seu projeto no Firebase, clique no ícone da Web **`</>`** (Adicionar app).
2. Digite o apelido do app (ex: `CHN4 Web`) e clique em **Registrar app**.
3. O Firebase exibirá um código com o objeto `const firebaseConfig = { ... }`.
4. Copie o bloco de chaves:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
};
```

### 4. Cole as Chaves no Arquivo `firebase-config.js`
1. Abra o arquivo [firebase-config.js](file:///c:/Users/batis/.gemini/antigravity-ide/scratch/chn4-aton-gis/firebase-config.js) no seu editor de código.
2. Cole as suas chaves sobrepondo o texto de exemplo e salve o arquivo.
3. Faça o `git push` ou envio para o seu repositório no **GitHub**.

---

### 🎉 Pronto!
Assim que você enviar o arquivo `firebase-config.js` com suas chaves para o GitHub:
- O site publicado no **GitHub Pages** passará a usar automaticamente a nuvem do Firebase Firestore.
- O indicador no cabeçalho exibirá `🟢 ONLINE (FIREBASE CLOUD)`.
- Qualquer alteração realizada por qualquer usuário no site será salva na nuvem e atualizada em tempo real em todas as telas conectadas!
