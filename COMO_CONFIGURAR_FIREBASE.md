# 🚀 Guia Prático: Configuração de Segurança e Firebase no SiGAtoN

Este guia explica como configurar a infraestrutura de autenticação e banco de dados na nuvem da Google (**Firebase Authentication + Cloud Firestore**) para o **SiGAtoN** (`Aux Nav` e `Aux Nav Viewer`).

Com essa configuração:
- **`chn4-aton-gis` (Edição):** Acesso 100% restrito por login e senha. Operadores acessam funções de edição e administradores têm acesso ao Painel de Gestão de Usuários.
- **`chn4-aton-viewer` (Visualizador):** Acesso público e anônimo em modo somente leitura para a comunidade náutica, totalmente seguro contra Stored XSS e sem permissão de alteração no banco.

---

## ⏱️ Passo a Passo de Configuração:

### 1. Criar o Projeto no Firebase (Gratuito)
1. Acesse o console do Firebase: **[https://console.firebase.google.com/](https://console.firebase.google.com/)** com sua conta Google.
2. Clique em **"Adicionar projeto"** (ou selecione o projeto existente).
3. Digite o nome do projeto (ex: `chn4-aton-gis`) e clique em **Continuar**.
4. Desative o Google Analytics (opcional) e clique em **Criar projeto**.

### 2. Ativar o Provedor de Login (Firebase Authentication)
1. No menu lateral esquerdo, clique em **Build** > **Authentication**.
2. Clique em **"Começar agora"** (*Get Started*).
3. Na aba **Sign-in method** (*Método de login*), selecione **E-mail/senha**.
4. Ative a opção **"E-mail/senha"** (permite que usuários entrem com e-mail e senha cadastrados).
5. Clique em **Salvar**.

### 3. Ativar o Banco de Dados Cloud Firestore e Publicar as Regras
1. No menu lateral esquerdo, clique em **Build** > **Firestore Database**.
2. Clique no botão **"Criar banco de dados"**.
3. Selecione o local do banco (ex: `southamerica-east1 (São Paulo)` ou `nam5 (us-central)`).
4. Avance com o assistente até concluir a criação.
5. No topo da página do Firestore, acesse a aba **Regras (Rules)**.
6. Apague o texto que estiver lá e cole o conteúdo exato do arquivo [`firestore.rules`](file:///c:/Antigravity/Aux%20Nav/firestore.rules):
   - Leitura pública dos sinais para o visualizador.
   - Escrita e exclusão de sinais restrita a usuários logados, com validação de limites geográficos.
   - Gerenciamento de papéis e logs de auditoria restritos a administradores.
7. Clique no botão **Publicar**.

### 4. Obter as Chaves Web e Atualizar `firebase-config.js`
1. Na página inicial do projeto no Firebase, clique na engrenagem ⚙️ > **Configurações do projeto**.
2. Na seção "Seus aplicativos", se ainda não adicionou, clique no ícone da Web **`</>`**.
3. Registre o app com um nome (ex: `SiGAtoN Web`).
4. Copie o bloco `const firebaseConfig = { ... }`.
5. Cole as credenciais no arquivo `firebase-config.js` tanto em `Aux Nav` quanto em `Aux Nav Viewer`.

---

## 🔑 Acesso Mestre (Superadministrador):
- **E-mail:** `batistavinicius22@gmail.com`
- **Senha:** `@2040VinibatISTA`

Ao fazer o primeiro login no GIS com essas credenciais, o sistema autoprovisiona a conta no Firebase Authentication com perfil `admin`. A partir daí, o botão **Administração** aparecerá no cabeçalho do GIS, permitindo que você cadastre novos operadores (`admin` ou `usuario`) e gerencie acessos diretamente pela interface!
