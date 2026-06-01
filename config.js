window.SITE_CONFIG = {
  /*
    Cole aqui o link publico da planilha do Google Sheets.

    Funciona com links parecidos com:
    - https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit?usp=sharing
    - https://docs.google.com/spreadsheets/d/e/ID_PUBLICADO/pubhtml

    A planilha precisa ter as abas:
    - Jogos
    - Destaques
  */
  SHEET_URL: "",

  /*
    Opcional: use links CSV/exportaveis diretos se preferir.
    Se preencher estes dois campos, eles tem prioridade sobre SHEET_URL.
  */
  JOGOS_CSV_URL: "",
  DESTAQUES_CSV_URL: "",

  /*
    Nome usado para calcular vitorias e derrotas.
    O site procura esse texto nas colunas "atletica A" e "atletica B".
  */
  TEAM_NAME: "Unificada",
};
