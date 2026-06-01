(function () {
  const CONFIG = window.SITE_CONFIG || {};
  const TEAM_NAME = CONFIG.TEAM_NAME || "Unificada";

  const TAB_NAMES = {
    games: "Jogos",
    highlights: "Destaques",
  };

  const FIELD_ALIASES = {
    date: ["data"],
    time: ["hora", "horario", "horario_do_jogo"],
    sport: ["modalidade", "esporte"],
    gender: ["genero", "categoria"],
    teamA: ["atletica_a", "atletica_a_nome", "time_a", "equipe_a"],
    teamB: ["atletica_b", "atletica_b_nome", "time_b", "equipe_b"],
    scoreA: ["placar_a", "pontos_a", "score_a"],
    scoreB: ["placar_b", "pontos_b", "score_b"],
    place: ["local", "lugar", "quadra"],
    status: ["status", "situacao"],
    athlete: ["atleta", "nome", "nome_atleta"],
    description: ["descricao", "destaque", "texto"],
    photoUrl: ["foto_url", "foto", "imagem", "url_foto"],
    active: ["ativo", "ativa"],
  };

  const state = {
    games: [],
    highlights: [],
  };

  const elements = {
    syncStatus: document.getElementById("syncStatus"),
    statNextGame: document.getElementById("statNextGame"),
    statNextMeta: document.getElementById("statNextMeta"),
    statToday: document.getElementById("statToday"),
    statWins: document.getElementById("statWins"),
    statLosses: document.getElementById("statLosses"),
    statPending: document.getElementById("statPending"),
    statTotal: document.getElementById("statTotal"),
    sportFilter: document.getElementById("sportFilter"),
    genderFilter: document.getElementById("genderFilter"),
    statusFilter: document.getElementById("statusFilter"),
    clearFilters: document.getElementById("clearFilters"),
    nextTeamA: document.getElementById("nextTeamA"),
    nextTeamB: document.getElementById("nextTeamB"),
    nextSport: document.getElementById("nextSport"),
    nextDate: document.getElementById("nextDate"),
    nextPlace: document.getElementById("nextPlace"),
    nextStatus: document.getElementById("nextStatus"),
    highlightPhoto: document.getElementById("highlightPhoto"),
    highlightName: document.getElementById("highlightName"),
    highlightDescription: document.getElementById("highlightDescription"),
    upcomingList: document.getElementById("upcomingList"),
    resultsList: document.getElementById("resultsList"),
    gamesTable: document.getElementById("gamesTable"),
    lastRead: document.getElementById("lastRead"),
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindFilters();
    setStatus("Lendo dados do Google Sheets...");

    try {
      const [games, highlights] = await Promise.all([
        loadTab(TAB_NAMES.games, CONFIG.JOGOS_CSV_URL),
        loadTab(TAB_NAMES.highlights, CONFIG.DESTAQUES_CSV_URL),
      ]);

      state.games = games.map(normalizeGame);
      state.highlights = highlights.map(normalizeHighlight);

      populateFilters(state.games);
      render();
      setStatus("Dados atualizados ao carregar a pagina");
    } catch (error) {
      console.error(error);
      state.games = [];
      state.highlights = [];
      render();
      setStatus(error.message || "Nao foi possivel ler a planilha", true);
    }
  }

  function bindFilters() {
    [elements.sportFilter, elements.genderFilter, elements.statusFilter].forEach((filter) => {
      filter.addEventListener("change", render);
    });

    elements.clearFilters.addEventListener("click", () => {
      elements.sportFilter.value = "";
      elements.genderFilter.value = "";
      elements.statusFilter.value = "";
      render();
    });
  }

  async function loadTab(tabName, directCsvUrl) {
    if (directCsvUrl && directCsvUrl.trim()) {
      return fetchCsv(directCsvUrl);
    }

    if (!CONFIG.SHEET_URL || !CONFIG.SHEET_URL.trim()) {
      throw new Error("Configure o link publico da planilha em config.js");
    }

    return fetchGoogleVisualizationTab(CONFIG.SHEET_URL, tabName);
  }

  async function fetchCsv(url) {
    const response = await fetch(withCacheBuster(url), { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Erro ao ler CSV: ${response.status}`);
    }

    return csvToObjects(await response.text());
  }

  function fetchGoogleVisualizationTab(sheetUrl, tabName) {
    const endpoint = makeVisualizationEndpoint(sheetUrl);
    const callbackName = `__sheetCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const params = new URLSearchParams({
      sheet: tabName,
      headers: "1",
      tq: "select *",
      tqx: `out:json;responseHandler:${callbackName}`,
      _: String(Date.now()),
    });

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Tempo esgotado ao ler a aba ${tabName}`));
      }, 15000);

      window[callbackName] = (payload) => {
        cleanup();

        if (!payload || payload.status === "error") {
          const message =
            payload?.errors?.[0]?.detailed_message ||
            payload?.errors?.[0]?.reason ||
            `Erro ao ler a aba ${tabName}`;
          reject(new Error(message));
          return;
        }

        resolve(visualizationTableToObjects(payload.table));
      };

      script.onerror = () => {
        cleanup();
        reject(new Error(`Nao foi possivel acessar a aba ${tabName}`));
      };

      script.src = `${endpoint}?${params.toString()}`;
      document.head.appendChild(script);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }
    });
  }

  function makeVisualizationEndpoint(sheetUrl) {
    const trimmed = sheetUrl.trim();
    const publishedMatch = trimmed.match(/\/spreadsheets\/d\/e\/([^/]+)/);
    if (publishedMatch) {
      return `https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/gviz/tq`;
    }

    const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([^/]+)/);
    if (sheetMatch) {
      return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/gviz/tq`;
    }

    throw new Error("Link da planilha invalido. Use uma URL publica do Google Sheets.");
  }

  function visualizationTableToObjects(table) {
    if (!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) {
      return [];
    }

    const headers = table.cols.map((column) => normalizeKey(column.label || column.id));

    return table.rows
      .map((row) => {
        const object = {};
        headers.forEach((header, index) => {
          if (!header) return;
          const cell = row.c?.[index];
          object[header] = stringifyCell(cell);
        });
        return object;
      })
      .filter(hasAnyValue);
  }

  function stringifyCell(cell) {
    if (!cell || (cell.v == null && cell.f == null)) return "";
    const value = cell.f != null ? cell.f : cell.v;
    return String(value).trim();
  }

  function csvToObjects(text) {
    const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
    if (!rows.length) return [];

    const headers = rows.shift().map(normalizeKey);

    return rows
      .map((row) => {
        const object = {};
        headers.forEach((header, index) => {
          if (!header) return;
          object[header] = (row[index] || "").trim();
        });
        return object;
      })
      .filter(hasAnyValue);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell);
    rows.push(row);
    return rows;
  }

  function populateFilters(games) {
    fillSelect(elements.sportFilter, uniqueValues(games.map((game) => game.sport)), "Todas");
    fillSelect(elements.genderFilter, uniqueValues(games.map((game) => game.gender)), "Todos");
    fillSelect(elements.statusFilter, uniqueValues(games.map((game) => game.status)), "Todos");
  }

  function fillSelect(select, values, firstLabel) {
    const selected = select.value;
    select.textContent = "";
    appendOption(select, "", firstLabel);
    values.forEach((value) => appendOption(select, value, value));
    select.value = values.includes(selected) ? selected : "";
  }

  function appendOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function render() {
    const games = getFilteredGames();
    const nextGame = findNextGame(games);

    renderStats(games, nextGame);
    renderNextConfrontation(nextGame);
    renderHighlight(state.highlights);
    renderMatchList(elements.upcomingList, getUpcomingGames(games), "Nenhum proximo jogo encontrado");
    renderMatchList(elements.resultsList, getLastResults(games), "Nenhum resultado encontrado");
    renderGamesTable(games);

    elements.lastRead.textContent = `Ultima leitura: ${new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    })}`;
  }

  function getFilteredGames() {
    const sport = normalizeValue(elements.sportFilter.value);
    const gender = normalizeValue(elements.genderFilter.value);
    const status = normalizeValue(elements.statusFilter.value);

    return state.games.filter((game) => {
      return (
        (!sport || normalizeValue(game.sport) === sport) &&
        (!gender || normalizeValue(game.gender) === gender) &&
        (!status || normalizeValue(game.status) === status)
      );
    });
  }

  function renderStats(games, nextGame) {
    const stats = getStats(games);

    elements.statNextGame.textContent = nextGame ? makeMatchup(nextGame) : "NAO INFORMADO";
    elements.statNextMeta.textContent = nextGame
      ? [nextGame.sport, formatDateAndTime(nextGame)].filter(Boolean).join(" - ")
      : "Sem jogo pendente nos filtros";
    elements.statToday.textContent = String(stats.today);
    elements.statWins.textContent = String(stats.wins);
    elements.statLosses.textContent = String(stats.losses);
    elements.statPending.textContent = String(stats.pending);
    elements.statTotal.textContent = String(stats.total);
  }

  function getStats(games) {
    return games.reduce(
      (stats, game) => {
        stats.total += 1;
        if (isToday(game.sortDate)) stats.today += 1;
        if (!isFinished(game) && !isCanceled(game)) stats.pending += 1;

        const result = getTeamResult(game);
        if (result === "win") stats.wins += 1;
        if (result === "loss") stats.losses += 1;

        return stats;
      },
      { total: 0, today: 0, wins: 0, losses: 0, pending: 0 }
    );
  }

  function renderNextConfrontation(game) {
    if (!game) {
      elements.nextTeamA.textContent = "NAO INFORMADO";
      elements.nextTeamB.textContent = "NAO INFORMADO";
      elements.nextSport.textContent = "--";
      elements.nextDate.textContent = "--";
      elements.nextPlace.textContent = "--";
      setTag(elements.nextStatus, "--");
      return;
    }

    elements.nextTeamA.textContent = game.teamA || "NAO INFORMADO";
    elements.nextTeamB.textContent = game.teamB || "NAO INFORMADO";
    elements.nextSport.textContent = [game.sport, game.gender].filter(Boolean).join(" - ") || "--";
    elements.nextDate.textContent = formatDateAndTime(game) || "--";
    elements.nextPlace.textContent = game.place || "--";
    setTag(elements.nextStatus, game.status || "Pendente");
  }

  function renderHighlight(highlights) {
    const activeHighlight = highlights
      .filter((highlight) => normalizeValue(highlight.active) === "sim")
      .sort(sortByDateDesc)[0];

    resetPhoto();

    if (!activeHighlight) {
      elements.highlightName.textContent = "NAO INFORMADO";
      elements.highlightDescription.textContent = "Nenhum destaque ativo na planilha";
      return;
    }

    elements.highlightName.textContent = activeHighlight.athlete || "NAO INFORMADO";
    elements.highlightDescription.textContent =
      [activeHighlight.sport, activeHighlight.description, activeHighlight.date]
        .filter(Boolean)
        .join(" - ") || "Destaque ativo";

    if (activeHighlight.photoUrl) {
      const image = document.createElement("img");
      image.alt = activeHighlight.athlete
        ? `Foto de ${activeHighlight.athlete}`
        : "Foto do atleta destaque";
      image.src = activeHighlight.photoUrl;
      image.onerror = resetPhoto;
      elements.highlightPhoto.textContent = "";
      elements.highlightPhoto.appendChild(image);
    } else {
      elements.highlightPhoto.textContent = initials(activeHighlight.athlete);
    }
  }

  function renderMatchList(container, games, emptyText) {
    container.textContent = "";

    if (!games.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    games.forEach((game) => {
      const item = document.createElement("article");
      item.className = "match-item";

      const content = document.createElement("div");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      const score = document.createElement("div");

      title.textContent = makeMatchup(game);
      meta.textContent = [
        game.sport,
        game.gender,
        formatDateAndTime(game),
        game.place,
        game.status,
      ]
        .filter(Boolean)
        .join(" - ");
      score.className = "match-score";
      score.textContent = makeScore(game);

      content.appendChild(title);
      content.appendChild(meta);
      item.appendChild(content);
      item.appendChild(score);
      container.appendChild(item);
    });
  }

  function renderGamesTable(games) {
    elements.gamesTable.textContent = "";

    if (!games.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      cell.className = "empty";
      cell.textContent = "Nenhum jogo encontrado para os filtros selecionados";
      row.appendChild(cell);
      elements.gamesTable.appendChild(row);
      return;
    }

    games.slice().sort(sortByDateAsc).forEach((game) => {
      const row = document.createElement("tr");
      appendCell(row, game.date || "--");
      appendCell(row, game.time || "--");
      appendCell(row, game.sport || "--");
      appendCell(row, game.gender || "--");
      appendCell(row, makeMatchup(game), "matchup");
      appendCell(row, makeScore(game), "score");
      appendCell(row, game.place || "--");

      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      setTag(status, game.status || "--");
      statusCell.appendChild(status);
      row.appendChild(statusCell);

      elements.gamesTable.appendChild(row);
    });
  }

  function appendCell(row, text, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    row.appendChild(cell);
  }

  function setTag(element, text) {
    element.className = `tag ${normalizeKey(text)}`;
    element.textContent = text;
  }

  function normalizeGame(row) {
    const game = {
      date: getField(row, FIELD_ALIASES.date),
      time: getField(row, FIELD_ALIASES.time),
      sport: getField(row, FIELD_ALIASES.sport),
      gender: getField(row, FIELD_ALIASES.gender),
      teamA: getField(row, FIELD_ALIASES.teamA),
      teamB: getField(row, FIELD_ALIASES.teamB),
      scoreA: getField(row, FIELD_ALIASES.scoreA),
      scoreB: getField(row, FIELD_ALIASES.scoreB),
      place: getField(row, FIELD_ALIASES.place),
      status: getField(row, FIELD_ALIASES.status),
    };

    game.sortDate = parseDateTime(game.date, game.time);
    return game;
  }

  function normalizeHighlight(row) {
    const highlight = {
      athlete: getField(row, FIELD_ALIASES.athlete),
      sport: getField(row, FIELD_ALIASES.sport),
      description: getField(row, FIELD_ALIASES.description),
      photoUrl: getField(row, FIELD_ALIASES.photoUrl),
      date: getField(row, FIELD_ALIASES.date),
      active: getField(row, FIELD_ALIASES.active),
    };

    highlight.sortDate = parseDateTime(highlight.date, "");
    return highlight;
  }

  function getField(row, aliases) {
    for (const alias of aliases) {
      const key = normalizeKey(alias);
      if (row[key] != null && String(row[key]).trim() !== "") {
        return String(row[key]).trim();
      }
    }

    return "";
  }

  function findNextGame(games) {
    const pending = games.filter((game) => !isFinished(game) && !isCanceled(game));
    const future = pending.filter((game) => !game.sortDate || isTodayOrFuture(game.sortDate));
    return (future.length ? future : pending).sort(sortByDateAsc)[0] || null;
  }

  function getUpcomingGames(games) {
    return games
      .filter((game) => !isFinished(game) && !isCanceled(game))
      .filter((game) => !game.sortDate || isTodayOrFuture(game.sortDate))
      .sort(sortByDateAsc)
      .slice(0, 8);
  }

  function getLastResults(games) {
    return games.filter(isFinished).sort(sortByDateDesc).slice(0, 8);
  }

  function getTeamResult(game) {
    if (!isFinished(game)) return "";

    const scoreA = parseScore(game.scoreA);
    const scoreB = parseScore(game.scoreB);
    if (scoreA == null || scoreB == null || scoreA === scoreB) return "";

    const team = normalizeValue(TEAM_NAME);
    const teamA = normalizeValue(game.teamA);
    const teamB = normalizeValue(game.teamB);

    if (teamA.includes(team)) return scoreA > scoreB ? "win" : "loss";
    if (teamB.includes(team)) return scoreB > scoreA ? "win" : "loss";
    return "";
  }

  function makeMatchup(game) {
    if (game.teamA && game.teamB) return `${game.teamA} x ${game.teamB}`;
    return game.teamA || game.teamB || "NAO INFORMADO";
  }

  function makeScore(game) {
    if (game.scoreA !== "" && game.scoreB !== "") {
      return `${game.scoreA} x ${game.scoreB}`;
    }

    return "--";
  }

  function formatDateAndTime(game) {
    return [game.date, game.time].filter(Boolean).join(" as ");
  }

  function isFinished(game) {
    const status = normalizeValue(game.status);
    const hasScore = game.scoreA !== "" && game.scoreB !== "";

    return (
      status.includes("finalizado") ||
      status.includes("encerrado") ||
      status.includes("fim") ||
      status.includes("resultado") ||
      (hasScore && !isCanceled(game))
    );
  }

  function isCanceled(game) {
    const status = normalizeValue(game.status);
    return status.includes("cancelado") || status.includes("adiado");
  }

  function isToday(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  function isTodayOrFuture(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compared = new Date(date);
    compared.setHours(0, 0, 0, 0);
    return compared.getTime() >= today.getTime();
  }

  function sortByDateAsc(a, b) {
    const left = dateSortValue(a.sortDate);
    const right = dateSortValue(b.sortDate);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left - right;
  }

  function sortByDateDesc(a, b) {
    const left = dateSortValue(a.sortDate);
    const right = dateSortValue(b.sortDate);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return right - left;
  }

  function dateSortValue(date) {
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }

  function parseDateTime(dateValue, timeValue) {
    const dateText = String(dateValue || "").trim();
    if (!dateText) return null;

    const time = parseTime(timeValue);
    const googleDate = dateText.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
    if (googleDate) {
      return new Date(
        Number(googleDate[1]),
        Number(googleDate[2]),
        Number(googleDate[3]),
        time.hours ?? Number(googleDate[4] || 0),
        time.minutes ?? Number(googleDate[5] || 0),
        Number(googleDate[6] || 0)
      );
    }

    const brazilianDate = dateText.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2})[:h](\d{2})?)?/i
    );
    if (brazilianDate) {
      const year =
        brazilianDate[3].length === 2
          ? Number(`20${brazilianDate[3]}`)
          : Number(brazilianDate[3]);
      return new Date(
        year,
        Number(brazilianDate[2]) - 1,
        Number(brazilianDate[1]),
        time.hours ?? Number(brazilianDate[4] || 0),
        time.minutes ?? Number(brazilianDate[5] || 0)
      );
    }

    const isoDate = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoDate) {
      return new Date(
        Number(isoDate[1]),
        Number(isoDate[2]) - 1,
        Number(isoDate[3]),
        time.hours ?? 0,
        time.minutes ?? 0
      );
    }

    const parsed = new Date(dateText);
    if (!Number.isNaN(parsed.getTime())) {
      if (time.hours != null) parsed.setHours(time.hours, time.minutes || 0, 0, 0);
      return parsed;
    }

    return null;
  }

  function parseTime(value) {
    const match = String(value || "").match(/(\d{1,2})[:h](\d{2})?/i);
    if (!match) return {};
    return {
      hours: Number(match[1]),
      minutes: Number(match[2] || 0),
    };
  }

  function parseScore(value) {
    const number = Number(String(value || "").replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function normalizeKey(value) {
    return normalizeValue(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function normalizeValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    );
  }

  function hasAnyValue(row) {
    return Object.values(row).some((value) => String(value || "").trim() !== "");
  }

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "?";
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function resetPhoto() {
    elements.highlightPhoto.textContent = "?";
  }

  function withCacheBuster(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_=${Date.now()}`;
  }

  function setStatus(message, isError) {
    elements.syncStatus.textContent = message;
    elements.syncStatus.classList.toggle("error", Boolean(isError));
  }
})();
