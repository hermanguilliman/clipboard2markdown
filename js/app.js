import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

(() => {
  const pasteElement = document.getElementById("paste");
  const markdownElement = document.getElementById("markdown");
  const commandElement = document.getElementById("cmd-key");
  const listRegex = /^(\s)*((\d+\.)(\s)|(-|\*)|(\[\^(\d|[a-z0-9-_])+\]:))/;
  const isMac = navigator.userAgent.includes("Mac");

  const search = new URLSearchParams(location.search);
  const cleanup = !search.has("cleanup") || search.get("cleanup") === "yes";

  if (commandElement && !isMac) {
    commandElement.textContent = "CTRL";
  }

  const STORAGE_KEY = "clipboard2markdown-settings";
  const THEME_KEY = "clipboard2markdown-theme";

  const defaultSettings = {
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {}
    return { ...defaultSettings };
  };

  const loadTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  };

  let settings = loadSettings();
  let currentTheme = loadTheme();

  document.documentElement.setAttribute("data-theme", currentTheme);

  const createService = () => {
    const s = new TurndownService({
      headingStyle: settings.headingStyle,
      bulletListMarker: settings.bulletListMarker,
      codeBlockStyle: settings.codeBlockStyle,
      fence: "```",
      emDelimiter: settings.emDelimiter,
      strongDelimiter: settings.strongDelimiter,
      linkStyle: "inlined",
      linkReferenceStyle: "full",
    });
    s.use(gfm);
    return s;
  };

  let turndownService = createService();

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  };

  const saveTheme = () => {
    try {
      localStorage.setItem(THEME_KEY, currentTheme);
    } catch {}
  };

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (String.fromCharCode(event.which).toLowerCase() === "v") {
        pasteElement.innerHTML = "";
        pasteElement.focus();
      }
    }
  });

  const pasteHint = document.getElementById("paste-hint");
  let dragCounter = 0;

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (pasteHint) pasteHint.classList.add("is-dragging");
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (pasteHint) pasteHint.classList.remove("is-dragging");
    }
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (pasteHint) pasteHint.classList.remove("is-dragging");

    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => convert(event.target.result);
    reader.readAsText(file);
  });

  pasteElement.addEventListener("paste", () => {
    requestAnimationFrame(() => {
      convert(pasteElement.textContent.trim());
    });
  });

  const convert = (html) => {
    try {
      if (!html) return;

      const regex = /^(\<\!DOCTYPE\ html\>|\<html\>)/;

      if (regex.test(html)) {
        const match = html.match(
          /<body[^>]*>([^<]*(?:(?!<\/?body)<[^<]*)*)<\/body\s*>/i
        );
        if (match && match[1]) pasteElement.innerHTML = match[1];
      }

      pasteElement.querySelectorAll("li + ol, li + ul").forEach((ul) => {
        if (!cleanup) return;

        const li = ul.previousElementSibling;
        li.appendChild(ul);
      });

      pasteElement
        .querySelectorAll(
          'ul[class*="lst-"][class*="-0"] + ul[class*="lst-"][class*="-1"], ol[class*="lst-"][class*="-0"] + ol[class*="lst-"][class*="-1"]'
        )
        .forEach((currentUl) => {
          if (!cleanup) return;

          const previousUl = currentUl.previousElementSibling;
          const li = previousUl.lastElementChild;
          li.appendChild(currentUl);
        });

      html = pasteElement.innerHTML.replace(
        /(<span style="[^"]*font-weight:[ ]*(?:bold|[6-9]00)[^"]*">)(.*?)(<\/span>)/gi,
        "$1<strong>$2</strong>$3"
      );

      const untouchedMarkdown = turndownService.turndown(html);

      let markdown = untouchedMarkdown;

      markdown = markdown.replace(
        /https:\/\/www\.google\.com\/url\?q=(https?:\/\/[^&]+)(&[^\)]*)?/g,
        (fullUrl, redirectUrl) => {
          if (!redirectUrl) return fullUrl;
          if (!/\?/.test(redirectUrl)) return redirectUrl;

          const [url, query] = redirectUrl.split("?");
          const [search, hash] = decodeURIComponent(query).split("#");
          const newUrl = new URL(url);
          newUrl.search = new URLSearchParams(search);
          if (hash) newUrl.hash = hash;
          return newUrl.toString();
        }
      );

      markdown = markdown.replace(/\[\\\[(\d+)\\\]\](\([^)]+\))?/g, "[^$1]");

      const footnoteMatches = (
        markdown.match(/\[\^(\d|[a-z0-9-_]+)+\]/g) || []
      ).map((note) => note.match(/(\d|[a-z0-9-_]+)/)[0]);

      footnoteMatches.forEach((match) => {
        markdown = markdown.replace(
          new RegExp(`\\[\\^${match}\\]`, "g"),
          (match, offset) => {
            const index = markdown.indexOf(match, offset);
            const lastIndex = markdown.lastIndexOf(match);

            if (index === lastIndex) {
              return match + ":";
            }

            return match;
          }
        );
      });

      markdown = markdown.replace(/\[\^(\d|[a-z0-9-_])+\]:+/g, "[^$1]:");

      markdown = markdown
        .split("\n")
        .map((line) => line.replace(/\s+$/, ""))
        .join("\n")
        .replace(/\n\n(\n)+/g, "\n\n")
        .split("\n")
        .reduce((lines, line) => {
          if (lines.length <= 2) return [...lines, line];

          const firstBack = lines[lines.length - 1];
          const secondBack = lines[lines.length - 2];

          if (firstBack !== "") return [...lines, line];

          if (
            listRegex.test(line) &&
            firstBack === "" &&
            listRegex.test(secondBack) &&
            !/^\*\*/.test(secondBack.replace(/\s/g, ""))
          ) {
            lines.pop();
          }

          return [...lines, line];
        }, [])
        .join("\n");

      if (!cleanup) markdown = untouchedMarkdown;
      markdown = markdown.trim();

      markdownElement.value = markdown + "\n";
      markdownElement.classList.remove("error");
      if (copyBtn) copyBtn.disabled = false;

      markdownElement.focus();
      markdownElement.select();

      addToHistory(markdownElement.value);
    } catch (error) {
      markdownElement.value = `\u041E\u0448\u0438\u0431\u043A\u0430: ${error.message}`;
      markdownElement.classList.add("error");
    }
  };

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = currentTheme === "dark" ? "\u263E" : "\u2600";
    themeToggle.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", currentTheme);
      themeToggle.textContent = currentTheme === "dark" ? "\u263E" : "\u2600";
      saveTheme();
    });
  }

  const settingsPanel = document.getElementById("settings-panel");
  if (settingsPanel) {
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        settingsPanel.open = !settingsPanel.open;
      });
    }
    const selects = settingsPanel.querySelectorAll("select");
    selects.forEach((select) => {
      const key = select.id.replace("setting-", "");
      if (settings[key]) select.value = settings[key];
      select.addEventListener("change", () => {
        settings[key] = select.value;
        saveSettings();
        turndownService = createService();
      });
    });
  }

  const HISTORY_KEY = "clipboard2markdown-history";
  const MAX_HISTORY = 10;

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  };

  const saveHistory = (entries) => {
    while (entries.length > MAX_HISTORY) entries.shift();
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
      return { ok: true, warning: false };
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.code === 22) {
        if (entries.length > 1) {
          entries.shift();
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
            return { ok: true, warning: true };
          } catch {}
        }
        return { ok: false, warning: true };
      }
      return { ok: true, warning: false };
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d;
    if (diff < 60000) return "\u0422\u041E\u041B\u042C\u041A\u041E \u0427\u0422\u041E";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}\u041C \u041D\u0410\u0417\u0410\u0414`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}\u0427 \u041D\u0410\u0417\u0410\u0414`;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const historyPanel = document.getElementById("history-panel");
  const historyList = document.getElementById("history-list");
  const historyCount = document.getElementById("history-count");
  const historyWarning = document.getElementById("history-warning");

  const renderHistory = () => {
    const entries = loadHistory();
    if (!historyList) return;
    historyList.innerHTML = "";
    if (entries.length === 0) {
      if (historyPanel) historyPanel.style.display = "none";
      return;
    }
    if (historyPanel) historyPanel.style.display = "";
    if (historyCount) historyCount.textContent = `(${entries.length})`;
    const reversed = [...entries].reverse();
    reversed.forEach((entry) => {
      const div = document.createElement("div");
      div.className = "nd-history-entry";
      const time = document.createElement("span");
      time.className = "nd-history-time";
      time.textContent = formatTime(entry.timestamp);
      const preview = document.createElement("span");
      preview.className = "nd-history-preview";
      preview.textContent = entry.preview || "";
      const btn = document.createElement("button");
      btn.className = "nd-history-copy";
      btn.textContent = "\u041A\u041E\u041F\u0418\u0420\u041E\u0412\u0410\u0422\u042C";
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(entry.text); }
        catch {
          const ta = document.createElement("textarea");
          ta.value = entry.text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        btn.textContent = "\u2713";
        setTimeout(() => { btn.textContent = "\u041A\u041E\u041F\u0418\u0420\u041E\u0412\u0410\u0422\u042C"; }, 1500);
      });
      div.appendChild(time);
      div.appendChild(preview);
      div.appendChild(btn);
      div.addEventListener("click", () => {
        markdownElement.value = entry.text;
        if (copyBtn) copyBtn.disabled = false;
        markdownElement.focus();
        markdownElement.scrollIntoView({ behavior: "smooth" });
      });
      historyList.appendChild(div);
    });
  };

  const addToHistory = (text) => {
    if (!text) return;
    const entries = loadHistory();
    entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text,
      timestamp: Date.now(),
      preview: text.replace(/\s+/g, " ").slice(0, 100).trim(),
    });
    const result = saveHistory(entries);
    if (result.warning && historyWarning) {
      historyWarning.textContent = "\u26A0 \u0414\u041E\u0421\u0422\u0418\u0413\u041D\u0423\u0422 \u041B\u0418\u041C\u0418\u0422 \u0425\u0420\u0410\u041D\u0418\u041B\u0418\u0429\u0410, \u0421\u0422\u0410\u0420\u042B\u0415 \u0417\u0410\u041F\u0418\u0421\u0418 \u0423\u0414\u0410\u041B\u0415\u041D\u042B";
      historyWarning.style.display = "block";
    }
    renderHistory();
  };

  renderHistory();

  const copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = markdownElement.value;
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        markdownElement.focus();
        markdownElement.select();
        try {
          document.execCommand("copy");
        } catch {}
      }

      copyBtn.textContent = "\u2713";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C";
        copyBtn.classList.remove("copied");
      }, 1500);
    });
  }
})();
