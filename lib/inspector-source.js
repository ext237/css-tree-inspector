(function (root) {
  "use strict";

  function inspectedPageTask(mode) {
    const VERSION = "1.4.0";
    const STATE_PSEUDO_CLASSES = new Set([
      "active", "any-link", "checked", "default", "disabled", "enabled", "focus",
      "focus-visible", "focus-within", "fullscreen", "in-range", "indeterminate",
      "invalid", "link", "open", "optional", "out-of-range", "placeholder-shown",
      "popover-open", "read-only", "read-write", "required", "target", "user-invalid",
      "user-valid", "valid", "visited", "hover"
    ]);

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

    function atRuleHeader(rule) {
      const openingBrace = rule.cssText ? rule.cssText.indexOf("{") : -1;
      return openingBrace > 0 ? rule.cssText.slice(0, openingBrace).trim() : "";
    }

    function collectStyleRules() {
      const rules = [];
      const accessIssues = [];
      const issueKeys = new Set();
      let sourceOrder = 0;

      function recordAccessIssue(sheet, error) {
        const url = (sheet && sheet.href) || "(inline stylesheet)";
        const errorName = (error && error.name) || "Error";
        const key = `${url}|${errorName}`;
        if (issueKeys.has(key)) return;
        issueKeys.add(key);
        let crossOrigin = false;
        try { crossOrigin = url !== "(inline stylesheet)" && new URL(url, location.href).origin !== location.origin; } catch (_) {}
        accessIssues.push({
          url,
          reason: errorName === "SecurityError" && crossOrigin
            ? "Cross-origin stylesheet rules are not accessible through CSSOM."
            : "Stylesheet rules could not be accessed through CSSOM.",
          error: errorName
        });
      }

      function visit(ruleList, atRuleContext, conditions, active) {
        for (const rule of Array.from(ruleList || [])) {
          if (rule.type === CSSRule.STYLE_RULE) {
            rules.push({
              selectors: splitSelectorList(rule.selectorText),
              style: rule.style,
              order: sourceOrder++,
              atRuleContext,
              conditions,
              active
            });
            continue;
          }
          if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet) {
            const importMedia = rule.media && rule.media.mediaText;
            const importContext = importMedia ? [...atRuleContext, `@media ${importMedia}`] : atRuleContext;
            const importActive = active && (!importMedia || matchMedia(importMedia).matches);
            const importConditions = importMedia
              ? [...conditions, { type: "media", condition: importMedia, currentlyMatches: matchMedia(importMedia).matches }]
              : conditions;
            try { visit(rule.styleSheet.cssRules, importContext, importConditions, importActive); }
            catch (error) { recordAccessIssue(rule.styleSheet || { href: rule.href }, error); }
            continue;
          }
          if (!rule.cssRules) continue;

          const header = atRuleHeader(rule);
          const childContext = header ? [...atRuleContext, header] : atRuleContext;
          let childConditions = conditions;
          let childActive = active;
          if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule) {
            const currentlyMatches = matchMedia(rule.conditionText).matches;
            childActive = active && currentlyMatches;
            childConditions = [...conditions, { type: "media", condition: rule.conditionText, currentlyMatches }];
          } else if (typeof CSSSupportsRule !== "undefined" && rule instanceof CSSSupportsRule) {
            childActive = active && CSS.supports(rule.conditionText);
          } else if (header.toLowerCase().startsWith("@container")) {
            childConditions = [...conditions, {
              type: "container",
              condition: header.slice("@container".length).trim(),
              currentlyMatches: null
            }];
          }
          visit(rule.cssRules, childContext, childConditions, childActive);
        }
      }

      const sheets = new Set([...Array.from(document.styleSheets), ...Array.from(document.adoptedStyleSheets || [])]);
      for (const sheet of sheets) {
        if (sheet.disabled) continue;
        const sheetMedia = sheet.media && sheet.media.mediaText;
        const sheetContext = sheetMedia ? [`@media ${sheetMedia}`] : [];
        const sheetActive = !sheetMedia || matchMedia(sheetMedia).matches;
        const sheetConditions = sheetMedia
          ? [{ type: "media", condition: sheetMedia, currentlyMatches: sheetActive }]
          : [];
        try { visit(sheet.cssRules, sheetContext, sheetConditions, sheetActive); }
        catch (error) { recordAccessIssue(sheet, error); }
      }
      return { rules, accessIssues };
    }

    const stylesheetData = collectStyleRules();
    const styleRules = stylesheetData.rules;
    const stylesheetAccessIssues = stylesheetData.accessIssues;
    const winnerCache = new WeakMap();

    function selectorForPseudo(selector, pseudo) {
      const pseudoPattern = /::(before|after)\b/gi;
      const matches = Array.from(selector.matchAll(pseudoPattern));
      if (!pseudo) return matches.length ? null : selector;
      if (!matches.length || `::${matches[matches.length - 1][1].toLowerCase()}` !== pseudo) return null;
      return selector.replace(pseudoPattern, "");
    }

    function topLevelCompoundBoundaries(selector) {
      const boundaries = [];
      let parentheses = 0;
      let brackets = 0;
      let quote = "";
      for (let index = 0; index < selector.length; index += 1) {
        const character = selector[index];
        if (quote) {
          if (character === "\\") index += 1;
          else if (character === quote) quote = "";
          continue;
        }
        if (character === "\"" || character === "'") { quote = character; continue; }
        if (character === "[") { brackets += 1; continue; }
        if (character === "]") { brackets -= 1; continue; }
        if (brackets) continue;
        if (character === "(") { parentheses += 1; continue; }
        if (character === ")") { parentheses -= 1; continue; }
        if (parentheses === 0 && (/[>+~]/.test(character) || /\s/.test(character))) boundaries.push(index);
      }
      return boundaries;
    }

    function analyzeStateSelector(selector) {
      const occurrences = [];
      const functionStack = [];
      let potentialSelector = "";
      let brackets = 0;
      let quote = "";

      for (let index = 0; index < selector.length; index += 1) {
        const character = selector[index];
        if (quote) {
          potentialSelector += character;
          if (character === "\\" && index + 1 < selector.length) potentialSelector += selector[++index];
          else if (character === quote) quote = "";
          continue;
        }
        if (character === "\"" || character === "'") { quote = character; potentialSelector += character; continue; }
        if (character === "\\") {
          potentialSelector += character;
          if (index + 1 < selector.length) potentialSelector += selector[++index];
          continue;
        }
        if (character === "[") { brackets += 1; potentialSelector += character; continue; }
        if (character === "]") { brackets -= 1; potentialSelector += character; continue; }

        if (!brackets && character === ":" && selector[index + 1] !== ":") {
          const nameMatch = selector.slice(index + 1).match(/^[a-zA-Z-]+/);
          if (nameMatch) {
            const name = nameMatch[0].toLowerCase();
            const end = index + 1 + nameMatch[0].length;
            if (STATE_PSEUDO_CLASSES.has(name)) {
              occurrences.push({ state: `:${name}`, index });
              potentialSelector += functionStack.includes("not") ? ":not(*)" : ":where(*)";
              index = end - 1;
              continue;
            }
            potentialSelector += selector.slice(index, end);
            if (selector[end] === "(") {
              potentialSelector += "(";
              functionStack.push(name);
              index = end;
            } else {
              index = end - 1;
            }
            continue;
          }
        }

        if (!brackets && character === "(") functionStack.push("");
        else if (!brackets && character === ")") functionStack.pop();
        potentialSelector += character;
      }

      if (!occurrences.length) return null;
      const boundaries = topLevelCompoundBoundaries(selector);
      const finalBoundary = boundaries.length ? boundaries[boundaries.length - 1] : -1;
      const stateTargets = occurrences.map((occurrence) => {
        const previous = boundaries.filter((position) => position < occurrence.index).at(-1) ?? -1;
        const next = boundaries.find((position) => position > occurrence.index) ?? selector.length;
        return {
          state: occurrence.state,
          selectorPart: selector.slice(previous + 1, next).trim(),
          appliesToCurrentElement: occurrence.index > finalBoundary
        };
      });
      return {
        potentialSelector,
        states: Array.from(new Set(occurrences.map((occurrence) => occurrence.state))),
        stateTargets
      };
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
        if (!rule.active) continue;
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

    function authoredDeclarations(style) {
      const declarations = [];
      const cssText = style.cssText;
      let start = 0;
      let parentheses = 0;
      let quote = "";

      function appendDeclaration(text) {
        const declaration = text.trim();
        if (!declaration) return;
        let colon = -1;
        let depth = 0;
        let declarationQuote = "";
        for (let index = 0; index < declaration.length; index += 1) {
          const character = declaration[index];
          if (declarationQuote) {
            if (character === "\\") index += 1;
            else if (character === declarationQuote) declarationQuote = "";
          } else if (character === "\"" || character === "'") declarationQuote = character;
          else if (character === "(") depth += 1;
          else if (character === ")") depth -= 1;
          else if (character === ":" && depth === 0) { colon = index; break; }
        }
        if (colon < 1) return;
        const property = declaration.slice(0, colon).trim();
        let value = declaration.slice(colon + 1).trim();
        const important = /\s*!important\s*$/i.test(value);
        if (important) value = value.replace(/\s*!important\s*$/i, "").trim();
        declarations.push({ property, value, important });
      }

      for (let index = 0; index < cssText.length; index += 1) {
        const character = cssText[index];
        if (quote) {
          if (character === "\\") index += 1;
          else if (character === quote) quote = "";
        } else if (character === "\"" || character === "'") quote = character;
        else if (character === "(") parentheses += 1;
        else if (character === ")") parentheses -= 1;
        else if (character === ";" && parentheses === 0) {
          appendDeclaration(cssText.slice(start, index));
          start = index + 1;
        }
      }
      appendDeclaration(cssText.slice(start));
      return declarations;
    }

    function stateDeclarations(style, element) {
      const rawValues = new Map();
      const priorities = new Map();
      for (const declaration of authoredDeclarations(style)) {
        rawValues.set(declaration.property, declaration.value);
        priorities.set(declaration.property, declaration.important);
      }

      const visited = new Set();
      function trace(value) {
        for (const property of varReferences(value)) {
          if (visited.has(property)) continue;
          visited.add(property);
          let dependency = rawValues.get(property);
          if (dependency === undefined) dependency = customPropertySource(element, null, property);
          if (dependency === null || dependency === undefined) continue;
          if (!rawValues.has(property)) rawValues.set(property, dependency);
          trace(dependency);
        }
      }
      for (const value of Array.from(rawValues.values())) trace(value);

      const declarations = {};
      for (const property of Array.from(rawValues.keys()).sort((left, right) => left.localeCompare(right))) {
        declarations[property] = `${rawValues.get(property)}${priorities.get(property) ? " !important" : ""}`;
      }
      return declarations;
    }

    const stateRuleCache = new WeakMap();
    const stateSelectorAnalysisCache = new Map();

    function cachedStateAnalysis(selector) {
      if (!stateSelectorAnalysisCache.has(selector)) {
        stateSelectorAnalysisCache.set(selector, analyzeStateSelector(selector));
      }
      return stateSelectorAnalysisCache.get(selector);
    }

    function stateRuleRecords(element, pseudo) {
      let elementCache = stateRuleCache.get(element);
      if (!elementCache) {
        elementCache = new Map();
        stateRuleCache.set(element, elementCache);
      }
      const cacheKey = pseudo || "element";
      if (elementCache.has(cacheKey)) return elementCache.get(cacheKey);

      const records = [];
      for (const rule of styleRules) {
        for (const selector of rule.selectors) {
          if (!selector.includes(":")) continue;
          const matchSelector = selectorForPseudo(selector, pseudo || null);
          if (!matchSelector) continue;
          const analysis = cachedStateAnalysis(matchSelector);
          if (!analysis) continue;
          try {
            if (!element.matches(analysis.potentialSelector)) continue;
          } catch (_) {
            continue;
          }
          records.push({
            identity: `${rule.order}|${selector}`,
            data: {
              selector,
              states: analysis.states,
              stateTargets: analysis.stateTargets,
              declarations: stateDeclarations(rule.style, element),
              atRuleContext: rule.atRuleContext,
              conditions: rule.conditions
            }
          });
        }
      }
      elementCache.set(cacheKey, records);
      return records;
    }

    function stateCSS(element, pseudo) {
      return stateRuleRecords(element, pseudo).map((record) => record.data);
    }

    const conditionalRuleCache = new WeakMap();

    function conditionalRuleRecords(element, pseudo) {
      let elementCache = conditionalRuleCache.get(element);
      if (!elementCache) {
        elementCache = new Map();
        conditionalRuleCache.set(element, elementCache);
      }
      const cacheKey = pseudo || "element";
      if (elementCache.has(cacheKey)) return elementCache.get(cacheKey);

      const records = [];
      for (const rule of styleRules) {
        if (!rule.conditions.length) continue;
        for (const selector of rule.selectors) {
          const matchSelector = selectorForPseudo(selector, pseudo || null);
          if (!matchSelector) continue;
          const analysis = selector.includes(":") ? cachedStateAnalysis(matchSelector) : null;
          const potentialSelector = analysis ? analysis.potentialSelector : matchSelector;
          try { if (!element.matches(potentialSelector)) continue; } catch (_) { continue; }
          const data = {
            conditions: rule.conditions,
            selector,
            declarations: stateDeclarations(rule.style, element),
            atRuleContext: rule.atRuleContext
          };
          if (analysis) {
            data.states = analysis.states;
            data.stateTargets = analysis.stateTargets;
          }
          records.push({ identity: `${rule.order}|${selector}`, data });
        }
      }
      elementCache.set(cacheKey, records);
      return records;
    }

    function conditionalCSS(element, pseudo) {
      return conditionalRuleRecords(element, pseudo).map((record) => record.data);
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
        const value = computed.getPropertyValue(property) || relevant.get(property).candidate.value;
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
      return {
        exists,
        computedCSS: exists ? relevantComputedStyle(element, pseudo) : {},
        stateCSS: stateCSS(element, pseudo),
        conditionalCSS: conditionalCSS(element, pseudo)
      };
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
        stateCSS: stateCSS(element),
        conditionalCSS: conditionalCSS(element),
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

    function indentCSS(css) {
      return css.split("\n").map((line) => `    ${line}`).join("\n");
    }

    function stateCSSBlock(stateRule) {
      let block = cssBlock(stateRule.selector, stateRule.declarations);
      for (const context of [...stateRule.atRuleContext].reverse()) {
        block = `${context} {\n${indentCSS(block)}\n}`;
      }
      return block;
    }

    function cssReport(rootElement) {
      const blocks = [];
      const authoredStateRules = new Map();
      const authoredConditionalRules = new Map();
      const elements = [rootElement, ...rootElement.querySelectorAll("*")];
      for (const element of elements) {
        const selector = selectorFor(element, rootElement);
        blocks.push(cssBlock(selector, relevantComputedStyle(element)));
        const before = pseudoData(element, "::before");
        const after = pseudoData(element, "::after");
        if (before.exists) blocks.push(cssBlock(`${selector}::before`, before.computedCSS));
        if (after.exists) blocks.push(cssBlock(`${selector}::after`, after.computedCSS));
        for (const record of [
          ...stateRuleRecords(element, null),
          ...stateRuleRecords(element, "::before"),
          ...stateRuleRecords(element, "::after")
        ]) {
          if (!record.data.conditions.length && !authoredStateRules.has(record.identity)) authoredStateRules.set(record.identity, record);
        }
        for (const record of [
          ...conditionalRuleRecords(element, null),
          ...conditionalRuleRecords(element, "::before"),
          ...conditionalRuleRecords(element, "::after")
        ]) {
          if (!authoredConditionalRules.has(record.identity)) authoredConditionalRules.set(record.identity, record);
        }
      }
      const stateBlocks = Array.from(authoredStateRules.values())
        .sort((left, right) => Number(left.identity.split("|")[0]) - Number(right.identity.split("|")[0]))
        .map((record) => stateCSSBlock(record.data));
      blocks.push(...stateBlocks);
      const conditionalBlocks = Array.from(authoredConditionalRules.values())
        .sort((left, right) => Number(left.identity.split("|")[0]) - Number(right.identity.split("|")[0]))
        .map((record) => stateCSSBlock(record.data));
      blocks.push(...conditionalBlocks);
      if (stylesheetAccessIssues.length) {
        const lines = ["/*", "CSS Tree Inspector: Inaccessible stylesheets", ""];
        for (const issue of stylesheetAccessIssues) lines.push(issue.url, `Reason: ${issue.reason}`, "");
        lines.push("*/");
        blocks.push(lines.join("\n"));
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
          corsIssues: stylesheetAccessIssues,
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
