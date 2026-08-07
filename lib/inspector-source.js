(function (root) {
  "use strict";

  function inspectedPageTask(mode) {
    const VERSION = "1.2.0";

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

    function splitSelectorList(selectorText) {
      const selectors = [];
      let start = 0;
      let depth = 0;
      let quote = "";
      for (let index = 0; index < selectorText.length; index += 1) {
        const character = selectorText[index];
        if (quote) {
          if (character === "\\") index += 1;
          else if (character === quote) quote = "";
        } else if (character === "\"" || character === "'") quote = character;
        else if (character === "(" || character === "[") depth += 1;
        else if (character === ")" || character === "]") depth -= 1;
        else if (character === "," && depth === 0) {
          selectors.push(selectorText.slice(start, index).trim());
          start = index + 1;
        }
      }
      selectors.push(selectorText.slice(start).trim());
      return selectors.filter(Boolean);
    }

    function selectorSpecificity(selector) {
      const normalized = selector
        .replace(/:where\((?:[^()]|\([^()]*\))*\)/g, "")
        .replace(/\\./g, "x")
        .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
      const ids = (normalized.match(/#[\w-]+/g) || []).length;
      const classes = (normalized.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
      const pseudoElements = (normalized.match(/::[\w-]+/g) || []).length;
      const withoutQualifiers = normalized
        .replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?/g, " ")
        .replace(/[>+~*,]/g, " ");
      const types = (withoutQualifiers.match(/(?:^|\s|\|)[a-zA-Z][\w-]*/g) || []).length + pseudoElements;
      return [ids, classes, types];
    }

    function compareSpecificity(left, right) {
      for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return left[index] - right[index];
      }
      return 0;
    }

    function collectStyleRules() {
      const rules = [];
      let sourceOrder = 0;

      function visit(ruleList) {
        for (const rule of Array.from(ruleList || [])) {
          if (rule.type === CSSRule.STYLE_RULE) {
            rules.push({ selectors: splitSelectorList(rule.selectorText), style: rule.style, order: sourceOrder++ });
            continue;
          }
          if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches) continue;
          if (typeof CSSSupportsRule !== "undefined" && rule instanceof CSSSupportsRule && !CSS.supports(rule.conditionText)) continue;
          if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet) {
            try { visit(rule.styleSheet.cssRules); } catch (_) { /* Inaccessible imports are skipped. */ }
            continue;
          }
          if (rule.cssRules) visit(rule.cssRules);
        }
      }

      const sheets = new Set([...Array.from(document.styleSheets), ...Array.from(document.adoptedStyleSheets || [])]);
      for (const sheet of sheets) {
        if (sheet.disabled || (sheet.media && sheet.media.mediaText && !matchMedia(sheet.media.mediaText).matches)) continue;
        try { visit(sheet.cssRules); } catch (_) { /* Cross-origin stylesheets are intentionally skipped. */ }
      }
      return rules;
    }

    const styleRules = collectStyleRules();
    const winnerCache = new WeakMap();

    function selectorForPseudo(selector, pseudo) {
      const pseudoPattern = /::(before|after)\b/gi;
      const matches = Array.from(selector.matchAll(pseudoPattern));
      if (!pseudo) return matches.length ? null : selector;
      if (!matches.length || `::${matches[matches.length - 1][1].toLowerCase()}` !== pseudo) return null;
      return selector.replace(pseudoPattern, "");
    }

    function candidateWins(candidate, winner) {
      if (!winner) return true;
      if (candidate.important !== winner.important) return candidate.important;
      if (candidate.inline !== winner.inline) return candidate.inline;
      const specificityDifference = compareSpecificity(candidate.specificity, winner.specificity);
      return specificityDifference > 0 || (specificityDifference === 0 && candidate.order >= winner.order);
    }

    function winningDeclarations(element, pseudo) {
      let elementCache = winnerCache.get(element);
      if (!elementCache) {
        elementCache = new Map();
        winnerCache.set(element, elementCache);
      }
      const cacheKey = pseudo || "element";
      if (elementCache.has(cacheKey)) return elementCache.get(cacheKey);

      const winners = new Map();
      for (const rule of styleRules) {
        for (const selector of rule.selectors) {
          const matchSelector = selectorForPseudo(selector, pseudo);
          if (!matchSelector) continue;
          try {
            if (!element.matches(matchSelector)) continue;
          } catch (_) {
            continue;
          }
          const specificity = selectorSpecificity(selector);
          for (const property of Array.from(rule.style)) {
            const candidate = {
              value: rule.style.getPropertyValue(property).trim(),
              important: rule.style.getPropertyPriority(property) === "important",
              inline: false,
              specificity,
              order: rule.order
            };
            if (candidateWins(candidate, winners.get(property))) winners.set(property, candidate);
          }
        }
      }

      if (!pseudo) {
        for (const property of Array.from(element.style)) {
          const candidate = {
            value: element.style.getPropertyValue(property).trim(),
            important: element.style.getPropertyPriority(property) === "important",
            inline: true,
            specificity: [1, 0, 0],
            order: Number.MAX_SAFE_INTEGER
          };
          if (candidateWins(candidate, winners.get(property))) winners.set(property, candidate);
        }
      }
      elementCache.set(cacheKey, winners);
      return winners;
    }

    function varReferences(value) {
      return Array.from(String(value).matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1]);
    }

    function customPropertySource(element, pseudoWinners, property) {
      if (pseudoWinners && pseudoWinners.has(property)) return pseudoWinners.get(property).value;
      let current = element;
      while (current) {
        const candidate = winningDeclarations(current, null).get(property);
        if (candidate) return candidate.value;
        current = current.parentElement;
      }
      const computedValue = getComputedStyle(element).getPropertyValue(property).trim();
      return computedValue || null;
    }

    function addCustomDependencies(output, element, pseudoWinners, sourceValue, visited) {
      for (const property of varReferences(sourceValue)) {
        if (visited.has(property)) continue;
        visited.add(property);
        const value = customPropertySource(element, pseudoWinners, property);
        if (value === null) continue;
        output[property] = value;
        addCustomDependencies(output, element, pseudoWinners, value, visited);
      }
    }

    function relevantComputedStyle(element, pseudo) {
      const computed = getComputedStyle(element, pseudo || null);
      const winners = winningDeclarations(element, pseudo || null);
      const relevant = new Map();

      for (const [property, candidate] of winners) {
        if (!property.startsWith("--")) relevant.set(property, { candidate, sourceElement: element, pseudoWinners: winners });
      }

      if (!pseudo) {
        let ancestor = element.parentElement;
        while (ancestor) {
          const ancestorComputed = getComputedStyle(ancestor);
          for (const [property, candidate] of winningDeclarations(ancestor, null)) {
            if (property.startsWith("--") || relevant.has(property)) continue;
            const value = computed.getPropertyValue(property);
            if (value && value === ancestorComputed.getPropertyValue(property)) {
              relevant.set(property, { candidate, sourceElement: ancestor, pseudoWinners: null });
            }
          }
          ancestor = ancestor.parentElement;
        }
      } else {
        const elementComputed = getComputedStyle(element);
        for (const [property, candidate] of winningDeclarations(element, null)) {
          if (property.startsWith("--") || relevant.has(property)) continue;
          const value = computed.getPropertyValue(property);
          if (value && value === elementComputed.getPropertyValue(property)) {
            relevant.set(property, { candidate, sourceElement: element, pseudoWinners: null });
          }
        }
      }

      const output = {};
      const customProperties = {};
      const visitedCustomProperties = new Set();
      for (const source of relevant.values()) {
        addCustomDependencies(
          customProperties,
          source.sourceElement,
          source.pseudoWinners,
          source.candidate.value,
          visitedCustomProperties
        );
      }
      for (const property of Object.keys(customProperties).sort((left, right) => left.localeCompare(right))) {
        output[property] = customProperties[property];
      }
      for (const property of Array.from(relevant.keys()).sort((left, right) => left.localeCompare(right))) {
        const value = computed.getPropertyValue(property);
        if (value) output[property] = value;
      }
      return output;
    }

    function pseudoData(element, pseudo) {
      const style = getComputedStyle(element, pseudo);
      const content = style.getPropertyValue("content");
      const display = style.getPropertyValue("display");
      const visibility = style.getPropertyValue("visibility");
      const exists = content !== "none" && content !== "normal" && display !== "none" && visibility !== "hidden";
      return { exists, computedCSS: exists ? relevantComputedStyle(element, pseudo) : {} };
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
        computedCSS: relevantComputedStyle(element),
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
        blocks.push(cssBlock(selector, relevantComputedStyle(element)));
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
          rootElement: inspectElement(selected, selected),
          outerHTML: selected.outerHTML
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
