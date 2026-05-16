(function () {
  "use strict";

  var STORAGE_KEY = "evelope_attribution_v1";
  var TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var CLICK_ID_KEYS = ["fbclid", "gclid", "ttclid"];
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

  function nowMs() {
    return Date.now();
  }

  function normalizeHost(rawUrl) {
    if (!rawUrl) {
      return "";
    }

    try {
      return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function isInternalHost(host) {
    if (!host) {
      return true;
    }

    return (
      host === "evelope.si" ||
      host === "evelope.app" ||
      host.endsWith(".evelope.si") ||
      host.endsWith(".evelope.app")
    );
  }

  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return parsed;
    } catch (error) {
      return null;
    }
  }

  function isExpired(record) {
    if (!record || typeof record.expiresAt !== "number") {
      return true;
    }

    return record.expiresAt <= nowMs();
  }

  function writeStorage(record) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
      // Ignore storage errors (private mode/quota).
    }
  }

  function createRecordFromCurrentPage() {
    var searchParams = new URLSearchParams(window.location.search);
    var sourceHost = normalizeHost(document.referrer);
    var capturedAt = nowMs();
    var record = {
      capturedAt: capturedAt,
      expiresAt: capturedAt + TTL_MS
    };

    if (sourceHost && !isInternalHost(sourceHost)) {
      record.sourceHost = sourceHost;
      record.utmSource = sourceHost;
    }

    UTM_KEYS.forEach(function (key) {
      var value = searchParams.get(key);
      if (value) {
        if (key === "utm_source") {
          record.utmSource = value;
        } else if (key === "utm_medium") {
          record.utmMedium = value;
        } else if (key === "utm_campaign") {
          record.utmCampaign = value;
        }
      }
    });

    CLICK_ID_KEYS.forEach(function (key) {
      var value = searchParams.get(key);
      if (value) {
        record[key] = value;
      }
    });

    if (
      !record.sourceHost &&
      !record.utmSource &&
      !record.utmMedium &&
      !record.utmCampaign &&
      !record.fbclid &&
      !record.gclid &&
      !record.ttclid
    ) {
      return null;
    }

    return record;
  }

  function captureFirstTouchAttribution() {
    var existing = readStorage();
    if (existing && !isExpired(existing)) {
      return existing;
    }

    var next = createRecordFromCurrentPage();
    if (!next) {
      return null;
    }

    writeStorage(next);
    return next;
  }

  function getCurrentAttribution() {
    var record = readStorage();
    if (!record) {
      return null;
    }

    if (isExpired(record)) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        // Ignore.
      }
      return null;
    }

    return record;
  }

  function buildEvelopeAppUrl() {
    var destination = new URL("https://evelope.app");
    var currentParams = new URLSearchParams(window.location.search);
    var record = getCurrentAttribution();
    var outboundSource = record ? (record.sourceHost || record.utmSource) : "";

    if (outboundSource) {
      destination.searchParams.set("utm_source", outboundSource);
      if (record.sourceHost) {
        destination.searchParams.set("ref_host", record.sourceHost);
      }
      destination.searchParams.set("utm_medium", (record && record.utmMedium) || "referral");
    }

    var campaign = currentParams.get("s");
    if (campaign) {
      destination.searchParams.set("utm_campaign", campaign);
    } else if (record && record.utmCampaign) {
      destination.searchParams.set("utm_campaign", record.utmCampaign);
    }

    CLICK_ID_KEYS.forEach(function (key) {
      var value = currentParams.get(key);
      if (!value && record) {
        value = record[key];
      }
      if (value) {
        destination.searchParams.set(key, value);
      }
    });

    return destination.toString();
  }

  window.EvelopeAttribution = {
    captureFirstTouchAttribution: captureFirstTouchAttribution,
    getCurrentAttribution: getCurrentAttribution,
    buildEvelopeAppUrl: buildEvelopeAppUrl
  };

  captureFirstTouchAttribution();
})();
