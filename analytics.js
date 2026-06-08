(function () {
  "use strict";

  var ANALYTICS_SRC = "https://cloud.umami.is/script.js";
  var WEBSITE_ID = "d12aa6b3-ee41-4fcf-a26c-6fa8b8524c9d";

  function injectAnalytics() {
    if (document.querySelector('script[data-evelope-analytics="true"]')) {
      return;
    }

    var script = document.createElement("script");
    script.defer = true;
    script.src = ANALYTICS_SRC;
    script.dataset.websiteId = WEBSITE_ID;
    script.dataset.evelopeAnalytics = "true";
    document.head.appendChild(script);
  }

  function scheduleAnalytics() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(injectAnalytics, { timeout: 2000 });
      return;
    }

    window.setTimeout(injectAnalytics, 1500);
  }

  if (document.readyState === "complete") {
    scheduleAnalytics();
    return;
  }

  window.addEventListener("load", scheduleAnalytics, { once: true });
})();
