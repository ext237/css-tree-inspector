(function (root) {
  "use strict";

  function inspectedPageTask(mode) {
    const VERSION = "1.0.0";

    function escapeIdentifier(value) {
      if (globalThis.CSS && typeof globalThis.CSS.escape === "function") {
        return globalThis.CSS.escape(value);
      }
      return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character.codePointAt(0).toString(16)} `);
    }

    function selectorPart(element) {
      let part = element.localName.toLowerCase();
      if (element.id) part += `#${escapeIdentifier(element.id)}`;
      for (const className of element.classList) part += `.${escapeIdentifier(className)}`;
      return part;
    }

    function selectorFor(element, rootElement) {
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        parts.unshift(selectorPart(current));
        if (current === rootElement) break;
        current = current.parentElement;
      }
      return parts.join(" > ");
    }

    function computedStyleObject(element, pseudo) {
      const style = getComputedStyle(element, pseudo || null);
      const names = Array.from(style).sort((left, right) => left.localeCompare(right));
      const output = {};
      for (const name of names) output[name] = style.getPropertyValue(name);
      return output;
    }

    function pseudoData(element, pseudo) {
      const style = getComputedStyle(element, pseudo);
      const content = style.getPropertyValue("content");
      const display = style.getPropertyValue("display");
      const visibility = style.getPropertyValue("visibility");
      const exists = content !== "none" && content !== "normal" && display !== "none" && visibility !== "hidden";
      return { exists, computedCSS: exists ? computedStyleObject(element, pseudo) : {} };
    }

    function safeAttributes(element) {
      const excluded = new Set(["id", "class", "value"]);
      const attributes = {};
      for (const attribute of element.attributes) {
        if (excluded.has(attribute.name.toLowerCase())) continue;
        attributes[attribute.name] = attribute.value;
      }
      return attributes;
    }

    function directTextNodes(element) {
      if (["input", "textarea", "select", "option"].includes(element.localName.toLowerCase())) return [];
      const output = [];
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        const value = node.nodeValue || "";
        if (!/\S/.test(value)) continue;
        output.push({ text: value });
      }
      return output;
    }

    function dimensions(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left
      };
    }

    function inspectElement(element, rootElement) {
      const children = [];
      for (const child of element.children) children.push(inspectElement(child, rootElement));
      return {
        tagName: element.localName.toLowerCase(),
        id: element.id || null,
        classes: Array.from(element.classList),
        selector: selectorFor(element, rootElement),
        attributes: safeAttributes(element),
        dimensions: dimensions(element),
        computedCSS: computedStyleObject(element),
        pseudoElements: {
          before: pseudoData(element, "::before"),
          after: pseudoData(element, "::after")
        },
        textNodes: directTextNodes(element),
        shadowRoot: element.shadowRoot ? { supported: false, mode: element.shadowRoot.mode || "open" } : null,
        subTreeElements: children
      };
    }

    function cssBlock(selector, properties) {
      const lines = Object.entries(properties).map(([name, value]) => `    ${name}: ${value};`);
      return `${selector} {\n${lines.join("\n")}\n}`;
    }

    function cssReport(rootElement) {
      const blocks = [];
      const elements = [rootElement, ...rootElement.querySelectorAll("*")];
      for (const element of elements) {
        const selector = selectorFor(element, rootElement);
        blocks.push(cssBlock(selector, computedStyleObject(element)));
        const before = pseudoData(element, "::before");
        const after = pseudoData(element, "::after");
        if (before.exists) blocks.push(cssBlock(`${selector}::before`, before.computedCSS));
        if (after.exists) blocks.push(cssBlock(`${selector}::after`, after.computedCSS));
      }
      return blocks.join("\n\n");
    }

    try {
      const selected = globalThis.$0;
      if (!selected) return { ok: false, code: "NO_SELECTION", message: "Select an element in the Elements panel first." };
      if (selected.nodeType !== Node.ELEMENT_NODE) return { ok: false, code: "NOT_ELEMENT", message: "The selected node is not an HTML element." };

      if (mode === "summary") {
        return { ok: true, summary: selectorPart(selected), url: location.href };
      }
      if (mode === "css") return { ok: true, mode, output: cssReport(selected) };
      if (mode === "json") {
        const report = {
          meta: { generator: "CSS Tree Inspector", version: VERSION, url: location.href, generatedAt: new Date().toISOString() },
          rootElement: inspectElement(selected, selected)
        };
        return { ok: true, mode, output: JSON.stringify(report, null, 2) };
      }
      return { ok: false, code: "BAD_MODE", message: "Unknown inspection mode." };
    } catch (error) {
      return { ok: false, code: "INSPECTION_FAILED", message: "Unable to inspect the selected element.", detail: String(error && error.message ? error.message : error) };
    }
  }

  root.CSS_TREE_INSPECTOR_EXPRESSION = function (mode) {
    return `(${inspectedPageTask.toString()})(${JSON.stringify(mode)})`;
  };
})(globalThis);
