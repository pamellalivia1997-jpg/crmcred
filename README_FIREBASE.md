# Guia de Configuração do Firebase • Lívia Cred Saúde CRM

Este documento orienta a conexão do **Lívia Cred Saúde CRM** a um projeto real do Google Firebase (Authentication + Firestore Database).

> **Aviso Importante**: O sistema possui uma camada completa de **Mock Fallback / LocalStorage**. Isso significa que ele funciona 100% de imediato no navegador para demonstração e homologação, mesmo sem nenhuma chave de API ou projeto Firebase conectado!

---

## 1. Criar o Projeto no Firebase Console

1. Acesse o [Firebase Console](https://console.firebase.google.com/) com sua conta Google.
2. Clique em **Adicionar projeto** e nomeie-o (ex: `livia-credsaude-crm`).
3. Desative o Google Analytics (opcional) e clique em **Criar projeto**.

---

## 2. Ativar o Firebase Authentication

1. No menu lateral esquerdo, clique em **Criação** > **Authentication**.
2. Clique em **Primeiros passos**.
3. Na aba **Método de login**, selecione **E-mail/senha**.
4. Ative a primeira opção (**Permitir que os usuários se inscrevam usando e-mail e senha**) e salve.
5. Crie os primeiros usuários de teste na aba **Users** com os e-mails das vendedoras e diretoria:
   - `livia@liviacredsaude.com.br` (Proprietária)
   - `pamella@liviacredsaude.com.br` (ADM)
   - `financeiro@liviacredsaude.com.br` (Financeiro)
   - `hellen@liviacredsaude.com.br` (Vendedora)
   - `taciana@liviacredsaude.com.br` (Vendedora)
   - `lucelia@liviacredsaude.com.br` (Vendedora)

---

## 3. Criar o Banco de Dados Cloud Firestore

1. No menu lateral esquerdo, clique em **Criação** > **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Selecione o local do servidor (recomendado: `southamerica-east1` em São Paulo para menor latência no Brasil).
4. Escolha **Modo de produção**.
5. Na aba **Regras**, cole o conteúdo do arquivo `firestore.rules` que já se encontra na raiz deste projeto.
6. Clique em **Publicar**.

---

## 4. Obter as Chaves de Conexão Web

1. Na engrenagem de configurações ao lado de "Visão geral do projeto", clique em **Configurações do projeto**.
2. Na aba **Geral**, desça até "Seus aplicativos" e clique no ícone de Web `</>`.
3. Registre o app como `Lívia Cred Saúde CRM PWA`.
4. Copie os valores do objeto `firebaseConfig`.

---

## 5. Configurar as Variáveis de Ambiente no Projeto

Crie um arquivo `.env` na raiz do projeto (ou configure nas variáveis de ambiente da nuvem):

```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="livia-credsaude-crm.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="livia-credsaude-crm"
VITE_FIREBASE_STORAGE_BUCKET="livia-credsaude-crm.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

Quando essas variáveis estiverem preenchidas, o aplicativo ativa automaticamente a sincronização em tempo real com o Firestore. Quando não estiverem presentes, o CRM executa no modo protótipo com armazenamento persistente em LocalStorage e dados seed enriquecidos.
