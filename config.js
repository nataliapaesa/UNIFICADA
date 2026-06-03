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
  OFFICIAL_SHEET_URL: "https://docs.google.com/spreadsheets/d/1piRlCHWUdj2Y3rJbhqE99qaXmkJJ-k4yWor9iqnBLYg",
  CONTROL_SHEET_URL: "https://docs.google.com/spreadsheets/d/1G7Dxr3_wcI4h7a5D5eR8tekXN6ISX1OXRhVTmM-kTSM/edit?usp=sharing",

  /*
    Compatibilidade com a versao anterior do site.
    OFFICIAL_SHEET_URL tem prioridade quando preenchida.
  */
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1piRlCHWUdj2Y3rJbhqE99qaXmkJJ-k4yWor9iqnBLYg",

  /*
    Opcional: use links CSV/exportaveis diretos se preferir.
    Se preencher estes dois campos, eles tem prioridade sobre SHEET_URL.
  */
  JOGOS_CSV_URL: "",
  DESTAQUES_CSV_URL: "",
  RESULTADOS_CSV_URL: "",
  ATLETA_DESTAQUE_CSV_URL: "",

  /*
    Nome usado para calcular vitorias e derrotas.
    O site procura esse texto nas colunas "atletica A" e "atletica B".
  */
  TEAM_NAME: "Unificada",
};
