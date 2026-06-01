# Central da Unificada

Site estatico preparado para deploy gratuito na Vercel.

O site le os dados diretamente de uma planilha publica do Google Sheets sempre que a pagina carrega. Assim, a equipe pode atualizar jogos, resultados, proximo confronto, filtros, estatisticas e atleta destaque pela planilha, sem alterar codigo e sem fazer novo deploy.

## Estrutura do projeto

```text
.
|-- index.html
|-- styles.css
|-- app.js
|-- config.js
|-- assets/
|   `-- cerberus-logo.svg
|-- package.json
|-- vercel.json
|-- netlify.toml
|-- .gitignore
`-- README.md
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
9. Se necessario, ajuste `TEAM_NAME` para o nome usado na planilha.

Exemplo:

```js
window.SITE_CONFIG = {
  SHEET_URL: "https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit?usp=sharing",
  JOGOS_CSV_URL: "",
  DESTAQUES_CSV_URL: "",
  TEAM_NAME: "Unificada",
};
```

Tambem funciona se voce publicar a planilha pela opcao `Arquivo > Compartilhar > Publicar na Web`.

## O que vem da planilha

O site usa a aba `Jogos` para montar:

- card de proximo jogo;
- card de jogos do dia;
- cards de vitorias, derrotas, pendentes e total;
- filtros de modalidade, genero e status;
- area de proximo confronto;
- proximos jogos;
- ultimos resultados;
- tabela completa.

O site usa a aba `Destaques` para montar o card `Atleta destaque`, exibindo somente a linha com `ativo = SIM`.

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

Entre na pasta do projeto:

```bash
cd "C:\Users\natal\Documents\Codex\2026-05-31\ajuste-o-site-para-ler-os\outputs"
```

Adicione os arquivos alterados:

```bash
git add .
```

Crie um commit:

```bash
git commit -m "Atualiza layout final da Central da Unificada"
```

Envie para o GitHub:

```bash
git push
```

## Publicar na Vercel

Se o projeto da Vercel ja esta ligado ao GitHub, basta fazer `git push`. A Vercel cria um novo deploy automaticamente.

Se precisar importar de novo:

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

## Atualizacoes depois do deploy

Para atualizar jogos, resultados, proximo confronto ou atleta destaque:

1. Abra a planilha pelo celular ou computador.
2. Edite os dados.
3. Aguarde o Google Sheets salvar automaticamente.
4. Abra ou recarregue o site.

Nao precisa alterar codigo nem fazer novo deploy.

Faca novo deploy somente se voce alterar arquivos do projeto, como `index.html`, `styles.css`, `app.js`, `config.js` ou arquivos em `assets/`.
