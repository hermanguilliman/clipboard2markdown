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

  const gfm = turndownPluginGfm.gfm;

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

  const dropbox = document.querySelector(".drop");

  dropbox.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();

    dropbox.classList.remove("active");

    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = (event) => convert(event.target.result);
    reader.readAsText(file);
  });

  dropbox.addEventListener("dragenter", () => {
    dropbox.classList.add("active");
  });

  dropbox.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  dropbox.addEventListener("dragleave", () => {
    dropbox.classList.remove("active");
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
      markdownElement.style.display = "block";
      markdownElement.classList.remove("error");

      const actions = document.getElementById("actions");
      if (actions) actions.style.display = "flex";

      markdownElement.focus();
      markdownElement.select();

      document.body.classList.add("has-markdown");
    } catch (error) {
      markdownElement.value = `\u041E\u0448\u0438\u0431\u043A\u0430: ${error.message}`;
      markdownElement.style.display = "block";
      markdownElement.classList.add("error");
      document.body.classList.add("has-markdown");
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
