/**
 * HTML to Markdown Converter
 * Converts HTML content to Markdown format following Pandoc-style conventions
 */

(function () {
  "use strict";

  /**
   * Pandoc-style conversion rules
   * @see http://pandoc.org/README.html#pandocs-markdown
   */
  const pandocConverters = [
    // Convert H1 headers to Markdown with === underline
    {
      filter: "h1",
      replacement: (content) => {
        const underline = "=".repeat(content.length);
        return `\n\n${content}\n${underline}\n\n`;
      },
    },

    // Convert H2 headers to Markdown with --- underline
    {
      filter: "h2",
      replacement: (content) => {
        const underline = "-".repeat(content.length);
        return `\n\n${content}\n${underline}\n\n`;
      },
    },

    // Convert superscript
    {
      filter: "sup",
      replacement: (content) => `^${content}^`,
    },

    // Convert subscript
    {
      filter: "sub",
      replacement: (content) => `~${content}~`,
    },

    // Convert line breaks
    {
      filter: "br",
      replacement: () => "\\\n",
    },

    // Convert horizontal rules
    {
      filter: "hr",
      replacement: () => "\n\n* * * * *\n\n",
    },

    // Convert emphasis elements
    {
      filter: ["em", "i", "cite", "var"],
      replacement: (content) => `*${content}*`,
    },

    // Convert inline code elements
    {
      filter: (node) => {
        const hasSiblings = node.previousSibling || node.nextSibling;
        const isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
        const isCodeElem = ["CODE", "KBD", "SAMP", "TT"].includes(
          node.nodeName
        );
        return isCodeElem && !isCodeBlock;
      },
      replacement: (content) => `\`${content}\``,
    },

    // Convert links
    {
      filter: (node) => node.nodeName === "A" && node.getAttribute("href"),
      replacement: (content, node) => {
        const url = node.getAttribute("href");
        const titlePart = node.title ? ` "${node.title}"` : "";

        if (content === url) {
          return `<${url}>`;
        } else if (url === `mailto:${content}`) {
          return `<${content}>`;
        } else {
          return `[${content}](${url}${titlePart})`;
        }
      },
    },

    // Convert list items
    {
      filter: "li",
      replacement: (content, node) => {
        content = content.replace(/^\s+/, "").replace(/\n/gm, "\n    ");
        let prefix = "-   ";
        const parent = node.parentNode;

        if (/ol/i.test(parent.nodeName)) {
          const index = Array.prototype.indexOf.call(parent.children, node) + 1;
          prefix = `${index}. `;
          while (prefix.length < 4) prefix += " ";
        }

        return prefix + content;
      },
    },
  ];

  /**
   * Escapes special characters and normalizes punctuation
   * @see http://pandoc.org/README.html#smart-punctuation
   */
  const escape = (str) => {
    return str
      .replace(/[\u2018\u2019\u00b4]/g, "'") // Smart quotes to regular quotes
      .replace(/[\u201c\u201d\u2033]/g, '"') // Smart double quotes to regular quotes
      .replace(/[\u2212\u2022\u00b7\u25aa]/g, "-") // Various dashes/bullets to hyphen
      .replace(/[\u2013\u2015]/g, "--") // En dash to double hyphen
      .replace(/\u2014/g, "---") // Em dash to triple hyphen
      .replace(/\u2026/g, "...") // Ellipsis to three dots
      .replace(/[ ]+\n/g, "\n") // Remove trailing spaces
      .replace(/\s*\\\n/g, "\\\n") // Normalize line breaks
      .replace(/\s*\\\n\s*\\\n/g, "\n\n") // Convert double breaks
      .replace(/\s*\\\n\n/g, "\n\n") // Normalize paragraph breaks
      .replace(/\n-\n/g, "\n") // Remove single hyphens
      .replace(/\n\n\s*\\\n/g, "\n\n") // Clean up extra breaks
      .replace(/\n\n\n*/g, "\n\n") // Normalize multiple breaks
      .replace(/[ ]+$/gm, "") // Remove trailing spaces
      .replace(/^\s+|[\s\\]+$/g, ""); // Trim start/end
  };

  /**
   * Converts HTML string to Markdown
   */
  const convert = (str) => {
    return escape(toMarkdown(str, { converters: pandocConverters, gfm: true }));
  };

  /**
   * Inserts text at cursor position in textarea
   */
  const insert = (field, value) => {
    if (document.selection) {
      // IE support
      field.focus();
      const sel = document.selection.createRange();
      sel.text = value;
      sel.select();
    } else if (field.selectionStart || field.selectionStart == "0") {
      // Modern browsers
      const startPos = field.selectionStart;
      const endPos = field.selectionEnd;
      const beforeValue = field.value.substring(0, startPos);
      const afterValue = field.value.substring(endPos, field.value.length);

      field.value = beforeValue + value + afterValue;
      field.selectionStart = startPos + value.length;
      field.selectionEnd = startPos + value.length;
      field.focus();
    } else {
      // Fallback
      field.value += value;
      field.focus();
    }
  };

  // Set up paste event handling
  document.addEventListener("DOMContentLoaded", () => {
    const info = document.querySelector("#info");
    const pastebin = document.querySelector("#pastebin");
    const output = document.querySelector("#output");
    const wrapper = document.querySelector("#wrapper");

    // Listen for Ctrl+V / Cmd+V
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key == 'v') {
          pastebin.innerHTML = "";
          pastebin.focus();
          info.classList.add("hidden");
          wrapper.classList.add("hidden");
        }
    });

    // Handle paste events
    pastebin.addEventListener("paste", () => {
      setTimeout(() => {
        const html = pastebin.innerHTML;
        const markdown = convert(html);
        insert(output, markdown);
        wrapper.classList.remove("hidden");
        output.focus();
        output.select();
      }, 200);
    });
  });
})();
