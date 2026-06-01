(function () {
  const CONFIG = window.SITE_CONFIG || {};
  const TAB_NAMES = {
    games: "Jogos",
    highlights: "Destaques",
  };

  const FIELD_ALIASES = {
    date: ["data"],
    time: ["hora", "horario", "horario_do_jogo"],
    sport: ["modalidade"],
    gender: ["genero", "categoria"],
    teamA: ["atletica_a", "atletica_a_", "atletica_a_nome"],
    teamB: ["atletica_b", "atletica_b_", "atletica_b_nome"],
    scoreA: ["placar_a", "placar_a_", "pontos_a"],
    scoreB: ["placar_b", "placar_b_", "pontos_b"],
    place: ["local", "lugar", "quadra"],
    status: ["status", "situacao"],
    athlete: ["atleta", "nome", "nome_atleta"],
    description: ["descricao", "descrição", "destaque"],
    photoUrl: ["foto_url", "foto", "imagem", "url_foto"],
    active: ["ativo", "ativa"],
  };

  const elements = {
    syncStatus: document.getElementById("syncStatus"),
    nextMatchTitle: document.getElementById("nextMatchTitle"),
    nextMatchMeta: document.getElementById("nextMatchMeta"),
    lastResultTitle: document.getElementById("lastResultTitle"),
    lastResultMeta: document.getElementById("lastResultMeta"),
    highlightName: document.getElementById("highlightName"),
    highlightDescription: document.getElementById("highlightDescription"),
    highlightPhoto: document.getElementById("highlightPhoto"),
    gamesTable: document.getElementById("gamesTable"),
    gamesCount: document.getElementById("gamesCount"),
    highlightsCount: document.getElementById("highlightsCount"),
    lastRead: document.getElementById("lastRead"),
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    setStatus("Lendo dados do Google Sheets...");

    try {
      const [games, highlights] = await Promise.all([
        loadTab(TAB_NAMES.games, CONFIG.JOGOS_CSV_URL),
        loadTab(TAB_NAMES.highlights, CONFIG.DESTAQUES_CSV_URL),
      ]);

      render({ games, highlights });
      setStatus("Dados atualizados ao carregar a página");
    } catch (error) {
      console.error(error);
      render({ games: [], highlights: [] });
      setStatus(error.message || "Não foi possível ler a planilha", true);
    }
  }

  async function loadTab(tabName, directCsvUrl) {
    if (directCsvUrl && directCsvUrl.trim()) {
      return fetchCsv(directCsvUrl);
    }

    if (!CONFIG.SHEET_URL || !CONFIG.SHEET_URL.trim()) {
      throw new Error("Configure o link público da planilha em config.js");
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
        reject(new Error(`Não foi possível acessar a aba ${tabName}`));
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

    throw new Error("Link da planilha inválido. Use uma URL pública do Google Sheets.");
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

  function render({ games, highlights }) {
    const normalizedGames = games.map(normalizeGame);
    const normalizedHighlights = highlights.map(normalizeHighlight);

    renderNextMatch(normalizedGames);
    renderLastResult(normalizedGames);
    renderHighlight(normalizedHighlights);
    renderGamesTable(normalizedGames);

    elements.gamesCount.textContent = String(normalizedGames.length);
    elements.highlightsCount.textContent = String(normalizedHighlights.length);
    elements.lastRead.textContent = new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
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

  function renderNextMatch(games) {
    const nextMatch = games
      .filter((game) => !isFinished(game) && !isCanceled(game))
      .sort(sortByDateAsc)[0];

    if (!nextMatch) {
      elements.nextMatchTitle.textContent = "NÃO INFORMADO";
      elements.nextMatchMeta.textContent = "Nenhum próximo confronto ativo na planilha";
      return;
    }

    elements.nextMatchTitle.textContent = makeMatchup(nextMatch);
    elements.nextMatchMeta.textContent = [
      nextMatch.sport,
      nextMatch.gender,
      formatDateAndTime(nextMatch),
      nextMatch.place,
      nextMatch.status,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  function renderLastResult(games) {
    const lastResult = games.filter(isFinished).sort(sortByDateDesc)[0];

    if (!lastResult) {
      elements.lastResultTitle.textContent = "NÃO INFORMADO";
      elements.lastResultMeta.textContent = "Nenhum resultado finalizado na planilha";
      return;
    }

    elements.lastResultTitle.textContent = `${makeMatchup(lastResult)} ${makeScore(lastResult)}`;
    elements.lastResultMeta.textContent = [
      lastResult.sport,
      lastResult.gender,
      formatDateAndTime(lastResult),
      lastResult.place,
      lastResult.status,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  function renderHighlight(highlights) {
    const activeHighlight = highlights
      .filter((highlight) => normalizeValue(highlight.active) === "sim")
      .sort(sortByDateDesc)[0];

    resetPhoto();

    if (!activeHighlight) {
      elements.highlightName.textContent = "NÃO INFORMADO";
      elements.highlightDescription.textContent = "Nenhum destaque ativo na planilha";
      return;
    }

    elements.highlightName.textContent = activeHighlight.athlete || "NÃO INFORMADO";
    elements.highlightDescription.textContent = [
      activeHighlight.sport,
      activeHighlight.description,
      activeHighlight.date,
    ]
      .filter(Boolean)
      .join(" • ");

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

  function renderGamesTable(games) {
    elements.gamesTable.textContent = "";

    if (!games.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      cell.className = "empty";
      cell.textContent = "Nenhum jogo encontrado na aba Jogos";
      row.appendChild(cell);
      elements.gamesTable.appendChild(row);
      return;
    }

    games.sort(sortByDateAsc).forEach((game) => {
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
      status.className = `status ${normalizeKey(game.status)}`;
      status.textContent = game.status || "--";
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

  function resetPhoto() {
    elements.highlightPhoto.textContent = "?";
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

  function makeMatchup(game) {
    if (game.teamA && game.teamB) return `${game.teamA} x ${game.teamB}`;
    return game.teamA || game.teamB || "NÃO INFORMADO";
  }

  function makeScore(game) {
    if (game.scoreA !== "" && game.scoreB !== "") {
      return `${game.scoreA} x ${game.scoreB}`;
    }

    return "--";
  }

  function formatDateAndTime(game) {
    return [game.date, game.time].filter(Boolean).join(" às ");
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

    const brazilianDate = dateText.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (brazilianDate) {
      const year =
        brazilianDate[3].length === 2
          ? Number(`20${brazilianDate[3]}`)
          : Number(brazilianDate[3]);
      return new Date(
        year,
        Number(brazilianDate[2]) - 1,
        Number(brazilianDate[1]),
        time.hours ?? 0,
        time.minutes ?? 0
      );
    }

    const isoDate = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
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

  function withCacheBuster(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_=${Date.now()}`;
  }

  function setStatus(message, isError) {
    elements.syncStatus.textContent = message;
    elements.syncStatus.classList.toggle("error", Boolean(isError));
  }
})();
