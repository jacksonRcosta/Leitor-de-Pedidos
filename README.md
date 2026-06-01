# 📦 Leitor de Pedidos — Asa Branca Industrial

Aplicação web para leitura de PDFs de pedidos de compra com exportação em **CSV** e **XLS**.

## Funcionalidades

- Upload de PDF por clique ou drag-and-drop
- Suporte a múltiplos pedidos em um único arquivo
- Extração automática de: Código de Barras, Quantidade, Preço de Venda, Desconto
- Exportação em **CSV** e **XLS**
- Layout responsivo — funciona em Android (Chrome)

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:5173
```

## Como fazer o build

```bash
npm run build
# Arquivos gerados em: dist/
```

---

## Deploy no Netlify (via GitHub)

### 1. Subir no GitHub

```bash
git init
git add .
git commit -m "feat: leitor de pedidos v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/leitor-pedidos.git
git push -u origin main
```

### 2. Conectar ao Netlify

1. Acesse [app.netlify.com](https://app.netlify.com/)
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Selecione **GitHub** e autorize o acesso
4. Escolha o repositório `leitor-pedidos`
5. Confirme as configurações de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Clique em **"Deploy site"**

> O arquivo `netlify.toml` já está configurado automaticamente com as opções acima.

### Deploy automático

A cada `git push` na branch `main`, o Netlify fará o redeploy automaticamente.

---

## Estrutura do projeto

```
leitor-pedidos/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx          # Entry point React
│   ├── App.jsx           # Componente principal
│   ├── pdfParser.js      # Extração de dados do PDF
│   └── exporters.js      # Geração de CSV e XLS
├── index.html
├── vite.config.js
├── netlify.toml
└── package.json
```

## Tecnologias

| Tecnologia | Uso |
|---|---|
| React 18 | Interface |
| Vite | Build tool |
| pdf.js (CDN) | Leitura de PDF |
| SheetJS (xlsx) | Geração de XLS/CSV |
| Netlify | Hospedagem |
