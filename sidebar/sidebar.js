"use strict";

const selectedElement = document.querySelector("#selectedElement");
const staleNotice = document.querySelector("#staleNotice");
const status = document.querySelector("#status");
const result = document.querySelector("#result code");
const resultViewer = document.querySelector("#resultViewer");
const cssAction = document.querySelector("#cssAction");
const jsonAction = document.querySelector("#jsonAction");
const copyAction = document.querySelector("#copyAction");
const refreshAction = document.querySelector("#refreshAction");
const clearAction = document.querySelector("#clearAction");

let currentMode = null;
let currentOutput = "";
let isWorking = false;
let copyTimer = null;

function evaluate(mode) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      CSS_TREE_INSPECTOR_EXPRESSION(mode),
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

function setWorking(working) {
  isWorking = working;
  cssAction.disabled = working;
  jsonAction.disabled = working;
  refreshAction.disabled = working || !currentMode;
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
  setWorking(true);
  status.textContent = mode === "css" ? "Generating computed CSS…" : "Building JSON tree…";
  staleNotice.hidden = true;
  await new Promise((resolve) => requestAnimationFrame(resolve));

  try {
    const response = await evaluate(mode);
    if (!response || !response.ok) throw Object.assign(new Error((response && response.message) || "Unable to inspect the selected element."), { expected: true });
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
