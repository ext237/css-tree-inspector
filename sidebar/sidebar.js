"use strict";

const selectedElement = document.querySelector("#selectedElement");
const staleNotice = document.querySelector("#staleNotice");
const status = document.querySelector("#status");
const result = document.querySelector("#result code");
const resultViewer = document.querySelector("#resultViewer");
const cssAction = document.querySelector("#cssAction");
const jsonAction = document.querySelector("#jsonAction");
const includeAttributes = document.querySelector("#includeAttributes");
const jsonCssFormats = document.querySelectorAll('input[name="jsonCssFormat"]');
const copyAction = document.querySelector("#copyAction");
const refreshAction = document.querySelector("#refreshAction");
const clearAction = document.querySelector("#clearAction");
const workingOverlay = document.querySelector("#workingOverlay");
const workingMessage = document.querySelector("#workingMessage");

let currentMode = null;
let currentOutput = "";
let isWorking = false;
let copyTimer = null;

function evaluate(mode, recoveredStyleSheets = []) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      CSS_TREE_INSPECTOR_EXPRESSION(mode, {
        includeAllAttributes: includeAttributes.checked,
        combineStyles: document.querySelector('input[name="jsonCssFormat"]:checked').value === "definitions",
        recoveredStyleSheets
      }),
      (value, exceptionInfo) => {
        if (exceptionInfo && (exceptionInfo.isException || exceptionInfo.isError)) {
          reject(new Error(exceptionInfo.value || exceptionInfo.description || "DevTools evaluation failed."));
          return;
        }
        resolve(value);
      }
    );
  });
}

function inspectedResources() {
  return new Promise((resolve) => chrome.devtools.inspectedWindow.getResources(resolve));
}

function resourceContent(resource) {
  return new Promise((resolve) => {
    resource.getContent((content, encoding) => {
      try {
        resolve(encoding === "base64" ? atob(content) : content);
      } catch (_) {
        resolve(null);
      }
    });
  });
}

async function recoverStyleSheets(urls) {
  if (!urls || !urls.length) return [];
  const wanted = new Set(urls.map((url) => new URL(url).href));
  const resources = await inspectedResources();
  const matches = resources.filter((resource) => {
    try { return wanted.has(new URL(resource.url).href); } catch (_) { return false; }
  });
  const recovered = await Promise.all(matches.map(async (resource) => ({
    url: resource.url,
    content: await resourceContent(resource)
  })));
  return recovered.filter((sheet) => typeof sheet.content === "string");
}

function setWorking(working) {
  isWorking = working;
  cssAction.disabled = working;
  jsonAction.disabled = working;
  refreshAction.disabled = working || !currentMode;
  workingOverlay.classList.toggle("is-visible", working);
  workingOverlay.setAttribute("aria-hidden", String(!working));
}

async function updateSelection(markStale = false) {
  try {
    const response = await evaluate("summary");
    selectedElement.textContent = response && response.ok ? response.summary : (response && response.message) || "No element selected";
  } catch (error) {
    selectedElement.textContent = "Unable to read selection";
  }
  if (markStale && currentOutput) staleNotice.hidden = false;
}

async function generate(mode) {
  if (isWorking) return;
  resultViewer.hidden = false;
  workingMessage.textContent = mode === "css" ? "Generating CSS report..." : "Building JSON report...";
  setWorking(true);
  status.textContent = mode === "css" ? "Generating computed CSS…" : "Building JSON tree…";
  staleNotice.hidden = true;
  await new Promise((resolve) => requestAnimationFrame(resolve));

  try {
    let response = await evaluate(mode);
    if (!response || !response.ok) throw Object.assign(new Error((response && response.message) || "Unable to inspect the selected element."), { expected: true });
    const recoveredStyleSheets = await recoverStyleSheets(response.inaccessibleStylesheetUrls);
    if (recoveredStyleSheets.length) {
      response = await evaluate(mode, recoveredStyleSheets);
      if (!response || !response.ok) throw Object.assign(new Error((response && response.message) || "Unable to inspect the selected element."), { expected: true });
    }
    currentMode = mode;
    currentOutput = response.output;
    result.textContent = currentOutput;
    status.textContent = `${mode.toUpperCase()} report ready · ${currentOutput.length.toLocaleString()} characters`;
    copyAction.disabled = false;
    clearAction.disabled = false;
  } catch (error) {
    currentMode = null;
    currentOutput = "";
    result.textContent = error.message || "Unable to inspect the selected element.";
    status.textContent = "Inspection failed";
    copyAction.disabled = true;
    clearAction.disabled = false;
    if (!error.expected) console.error("CSS Tree Inspector:", error);
  } finally {
    setWorking(false);
    await updateSelection(false);
  }
}

cssAction.addEventListener("click", () => generate("css"));
jsonAction.addEventListener("click", () => generate("json"));
refreshAction.addEventListener("click", () => currentMode && generate(currentMode));
includeAttributes.addEventListener("change", () => {
  if (currentMode === "json" && currentOutput) staleNotice.hidden = false;
});
for (const option of jsonCssFormats) {
  option.addEventListener("change", () => {
    if (currentMode === "json" && currentOutput) staleNotice.hidden = false;
  });
}

copyAction.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentOutput);
    status.textContent = "Copied";
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { status.textContent = `${currentMode.toUpperCase()} report ready`; }, 1600);
  } catch (error) {
    status.textContent = "Copy failed — select the report text and copy manually";
  }
});

clearAction.addEventListener("click", () => {
  currentMode = null;
  currentOutput = "";
  result.textContent = "";
  status.textContent = "Ready";
  staleNotice.hidden = true;
  copyAction.disabled = true;
  refreshAction.disabled = true;
  clearAction.disabled = true;
  resultViewer.hidden = true;
});

chrome.devtools.panels.elements.onSelectionChanged.addListener(() => updateSelection(true));
chrome.devtools.network.onNavigated.addListener(() => {
  selectedElement.textContent = "Page navigated — select an element";
  if (currentOutput) staleNotice.hidden = false;
});

updateSelection(false);
