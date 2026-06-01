# Site de Jogos com Google Sheets

Site estatico preparado para deploy gratuito na Vercel.

O site le os dados diretamente de uma planilha publica do Google Sheets sempre que a pagina carrega. Assim, a equipe pode atualizar jogos, resultados, proximo confronto e atleta destaque pela planilha, sem alterar codigo e sem fazer novo deploy.

## Estrutura do projeto

```text
.
├── index.html       # Estrutura da pagina
├── styles.css       # Visual e legibilidade do site
├── app.js           # Leitura do Google Sheets e montagem dos dados
├── config.js        # Link publico/exportavel da planilha
├── package.json     # Scripts do projeto
├── vercel.json      # Configuracao para deploy na Vercel
├── netlify.toml     # Opcional, caso queira publicar tambem na Netlify
├── .gitignore       # Arquivos ignorados pelo Git
└── README.md        # Este guia
```

## Estrutura da planilha

Crie uma aba chamada `Jogos` com estas colunas na primeira linha:

```text
data | hora | modalidade | genero | atletica A | atletica B | placar A | placar B | local | status
```

Crie uma aba chamada `Destaques` com estas colunas na primeira linha:

```text
atleta | modalidade | descricao | foto_url | data | ativo
```

No campo `ativo`, use `SIM` para o destaque que deve aparecer no site.

Se nenhum destaque estiver com `ativo = SIM`, o site mostra:

```text
NAO INFORMADO
```

## Configurar o Google Sheets

1. Abra a planilha no Google Sheets.
2. Confirme que existem as abas `Jogos` e `Destaques`.
3. Clique em `Compartilhar`.
4. Em acesso geral, escolha `Qualquer pessoa com o link`.
5. Deixe como `Leitor`.
6. Copie o link publico da planilha.
7. Abra `config.js`.
8. Cole o link em `SHEET_URL`.

Exemplo:

```js
window.SITE_CONFIG = {
  SHEET_URL: "https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit?usp=sharing",
  JOGOS_CSV_URL: "",
  DESTAQUES_CSV_URL: "",
};
```

Tambem funciona se voce publicar a planilha pela opcao `Arquivo > Compartilhar > Publicar na Web`.

## Testar no computador

Com Node.js instalado, rode:

```bash
npm run dev
```

Depois abra:

```text
http://localhost:4173
```

Tambem e possivel abrir `index.html` direto no navegador, mas o servidor local e melhor para simular o deploy.

## Enviar para o GitHub

### Opcao 1: usando Git pelo terminal

Entre na pasta do projeto:

```bash
cd caminho/da/pasta/do/projeto
```

Inicialize o repositorio:

```bash
git init
```

Adicione os arquivos:

```bash
git add .
```

Crie o primeiro commit:

```bash
git commit -m "Primeira versao do site"
```

Crie a branch principal:

```bash
git branch -M main
```

No GitHub, crie um repositorio novo vazio. Depois copie a URL do repositorio e rode:

```bash
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push -u origin main
```

### Opcao 2: enviando pelo site do GitHub

1. Acesse `https://github.com`.
2. Clique em `New repository`.
3. Crie um repositorio vazio.
4. Clique em `uploading an existing file`.
5. Arraste todos os arquivos desta pasta para o GitHub.
6. Clique em `Commit changes`.

## Publicar na Vercel

1. Acesse `https://vercel.com`.
2. Entre usando sua conta do GitHub.
3. Clique em `Add New`.
4. Clique em `Project`.
5. Escolha o repositorio do site.
6. Em `Framework Preset`, selecione `Other`.
7. Em `Build Command`, use:

```bash
npm run build
```

8. Em `Output Directory`, use:

```text
.
```

9. Clique em `Deploy`.

Quando o deploy terminar, a Vercel vai gerar um link publico do site.

## Atualizacoes depois do deploy

Para atualizar jogos, resultados, proximo confronto ou atleta destaque:

1. Abra a planilha pelo celular ou computador.
2. Edite os dados.
3. Aguarde o Google Sheets salvar automaticamente.
4. Abra ou recarregue o site.

Nao precisa alterar codigo nem fazer novo deploy.

Faca novo deploy somente se voce alterar arquivos do projeto, como `index.html`, `styles.css`, `app.js` ou `config.js`.
