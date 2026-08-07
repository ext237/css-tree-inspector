"use strict";

chrome.devtools.panels.elements.createSidebarPane("CSS Tree Inspector", (sidebar) => {
  sidebar.setPage("sidebar/sidebar.html");
});
