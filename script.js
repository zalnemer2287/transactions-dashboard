// Stores all fetched transactions so filters can be applied on the full dataset
let allTransactions = [];

// Stores AID definitions from the AID API so exact AID strings and names can be matched in logs
let allAidItems = [];

// API endpoints used by this page
const API = {
  atmList: "https://dev.smartjournal.net/um/test/api/jr/txn/atmlist/v1",
  aidList: "https://dev.smartjournal.net/um/test/api/jr/txn/aidlist/v1",
  txnList: function (id, ts) {
    return `https://dev.smartjournal.net/um/test/api/jr/txn/txnlist/${id}/${ts}/v1?n=30`;
  },
  txnLog: function (atmId, devTime) {
    return `https://dev.smartjournal.net/um/test/api/jr/txn/log/v1?a=${atmId}&t=${devTime}`;
  }
};

// Function is used to allow live updates when loading logs
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ---------------------------------------
   Page startup
--------------------------------------- */

// Runs once the page HTML has loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeDatePicker();
  setupStaticUi();
  init();
});

/* ---------------------------------------
   General UI setup
--------------------------------------- */

// Sets up buttons, dropdown toggles, and simple page interactions
function setupStaticUi() {
  const atmDropdownBtn = document.getElementById("atmDropdownBtn");
  const atmDropdownPanel = document.getElementById("atmDropdownPanel");
  const aidDropdownBtn = document.getElementById("aidDropdownBtn");
  const aidDropdownPanel = document.getElementById("aidDropdownPanel");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsMenu = document.getElementById("settingsMenu");
  const transactionsBtn = document.getElementById("transactionsBtn");
  const clearDateBtn = document.getElementById("clearDateBtn");
  const dateInput = document.getElementById("dateRange");

  if (atmDropdownBtn && atmDropdownPanel) {
    atmDropdownBtn.addEventListener("click", function () {
      atmDropdownPanel.classList.toggle("hidden");
    });
  }

  if (aidDropdownBtn && aidDropdownPanel) {
    aidDropdownBtn.addEventListener("click", function () {
      aidDropdownPanel.classList.toggle("hidden");
    });
  }

  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener("click", function () {
      settingsMenu.classList.toggle("hidden");
    });
  }

  if (transactionsBtn) {
    transactionsBtn.addEventListener("click", function () {
      location.reload();
    });
  }

  if (clearDateBtn && dateInput && dateInput._flatpickr) {
    clearDateBtn.addEventListener("click", function () {
      dateInput._flatpickr.clear();
      applyFilters();
    });
  }

  document.addEventListener("click", function (event) {
    if (
      atmDropdownBtn &&
      atmDropdownPanel &&
      !atmDropdownBtn.contains(event.target) &&
      !atmDropdownPanel.contains(event.target)
    ) {
      atmDropdownPanel.classList.add("hidden");
    }

    if (
      aidDropdownBtn &&
      aidDropdownPanel &&
      !aidDropdownBtn.contains(event.target) &&
      !aidDropdownPanel.contains(event.target)
    ) {
      aidDropdownPanel.classList.add("hidden");
    }
  });
}

// Shows a simple alert for buttons or menu items that are intentionally not built
function notImplemented() {
  alert("Not implemented");
}

/* ---------------------------------------
   Date picker
--------------------------------------- */

// Attaches Flatpickr to the date range input and connects the calendar button
function initializeDatePicker() {
  const dateInput = document.getElementById("dateRange");
  const calendarBtn = document.getElementById("calendarBtn");

  if (dateInput && typeof flatpickr !== "undefined") {
    flatpickr(dateInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      allowInput: false,
      clickOpens: true
    });
  }

  if (calendarBtn && dateInput && dateInput._flatpickr) {
    calendarBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      dateInput._flatpickr.open();
    });
  }
}

/* ---------------------------------------
   API requests
--------------------------------------- */

// Fetches the ATM list used to populate the ATM filter dropdown
async function getAtmList() {
  const response = await fetch(API.atmList);
  return await response.json();
}

// Fetches the AID list used to populate the AID filter dropdown
async function getAidList() {
  const response = await fetch(API.aidList);
  return await response.json();
}

// Fetches ATM id and timestamp pairs used to request transaction batches
async function getAtmIdTsPairs() {
  const response = await fetch(API.atmList);
  const data = await response.json();

  return data.map(function (item) {
    return {
      id: item.id,
      ts: item.ts
    };
  });
}

// Fetches transactions for one ATM id / timestamp pair
async function fetchTransactionsForPair(id, ts) {
  const response = await fetch(API.txnList(id, ts));
  const data = await response.json();
  return data.txn || [];
}

// Fetches the detailed transaction log using the ATM id and devTime for a transaction
async function fetchTransactionLog(atmId, devTime) {
  const response = await fetch(API.txnLog(atmId, devTime));
  return await response.text();
}

/* ---------------------------------------
   Table formatting helpers
--------------------------------------- */

// Converts API devTime format into MM/DD/YYYY for display in the table
function formatDevTime(devTime) {
  if (!devTime) return "";

  const value = String(devTime);
  if (value.length !== 14) return value;

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);

  return `${month}/${day}/${year}`;
}

// Converts API devTime into a JavaScript Date so date range filtering can work
function parseDevTimeToDate(devTime) {
  if (!devTime) return null;

  const value = String(devTime);
  if (value.length !== 14) return null;

  const year = parseInt(value.slice(0, 4), 10);
  const month = parseInt(value.slice(4, 6), 10) - 1;
  const day = parseInt(value.slice(6, 8), 10);

  return new Date(year, month, day);
}

// Builds the Description column text using whatever transaction fields are available
function buildDescription(txn) {
  const parts = [];

  if (txn.ttp && txn.ttp.descr) {
    parts.push(txn.ttp.descr);
  } else if (txn.ttp && txn.ttp.txt) {
    parts.push(txn.ttp.txt);
  } else if (txn.ttp && txn.ttp.id) {
    parts.push(`TTP ${txn.ttp.id}`);
  }

  if (txn.hst && txn.hst.descr) {
    parts.push(txn.hst.descr);
  } else if (txn.hst && txn.hst.txt) {
    parts.push(txn.hst.txt);
  } else if (txn.hst && txn.hst.id) {
    parts.push(`HST ${txn.hst.id}`);
  }

  return parts.join(" - ");
}

// Builds the Transaction Serial Number / code value shown in the last column
function buildCode(txn) {
  if (txn.ref) return txn.ref;
  if (txn.hst && txn.hst.txt) return txn.hst.txt;
  if (txn.hst && txn.hst.id) return `HST ${txn.hst.id}`;
  return "";
}

// Escapes HTML before inserting text into the table
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Converts newline characters into <br> tags for table display
function formatMultilineHtml(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

// Builds the final Code cell display using the original code plus extracted log details
function buildDisplayCode(txn) {
  const lines = [];
  const baseCode = buildCode(txn);

  if (baseCode) {
    lines.push(baseCode);
  }

  if (txn.extractedAid) {
    lines.push(`AID: ${txn.extractedAid}`);
  }

  if (txn.extractedAidName) {
    lines.push(`EMV: ${txn.extractedAidName}`);
  }

  if (txn.extractedStatus) {
    lines.push(`Status: ${txn.extractedStatus}`);
  }

  if (txn.extractedSequence) {
    lines.push(`SEQ: ${txn.extractedSequence}`);
  }

  if (txn.extractedTime) {
    lines.push(`Time: ${txn.extractedTime}`);
  }

  if (lines.length === 0) {
    return "";
  }

  return lines.join("\n");
}

/* ---------------------------------------
   Transaction log extraction helpers
--------------------------------------- */

// Removes HTML tags from the log response so text patterns can be searched reliably
function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

// Normalizes spacing in extracted log text
function normalizeLogText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n");
}

// Normalizes a label for looser name matching
function normalizeName(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Finds an AID list item by exact AID number match inside the log text
function findAidItemByAidValue(logText) {
  const upperText = logText.toUpperCase();

  for (const item of allAidItems) {
    const aidValue = String(item.aid || "").trim().toUpperCase();

    if (aidValue && upperText.includes(aidValue)) {
      return item;
    }
  }

  return null;
}

// Finds an AID list item by exact or near-exact AID / EMV name match inside the log text
function findAidItemByName(logText) {
  const normalizedLog = normalizeName(logText);

  for (const item of allAidItems) {
    const normalizedItemName = normalizeName(item.name);

    if (normalizedItemName && normalizedLog.includes(normalizedItemName)) {
      return item;
    }
  }

  return null;
}

// Tries to recover the full AID list item using either number or name
function findAidItemFromKnownList(logText) {
  const byAidValue = findAidItemByAidValue(logText);
  if (byAidValue) {
    return byAidValue;
  }

  const byName = findAidItemByName(logText);
  if (byName) {
    return byName;
  }

  return null;
}

// Looks for an AID using explicit patterns or general AID-like tokens
function extractAidValueFromPatterns(logText) {
  const explicitPatterns = [
    /EMV FINAL APP SELECTION SUCCESS:\s*([A-F0-9]{10,32})/i,
    /\bAID[:\s]+([A-F0-9]{10,32})\b/i,
    /\b([A][0-9A-F]{9,31})\b/i
  ];

  for (const pattern of explicitPatterns) {
    const match = logText.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }

  return "";
}

// Finds the matching list item from an extracted AID value
function findAidItemByExactAidValue(aidValue) {
  const normalizedAidValue = String(aidValue || "").trim().toUpperCase();

  for (const item of allAidItems) {
    const listAidValue = String(item.aid || "").trim().toUpperCase();

    if (listAidValue && listAidValue === normalizedAidValue) {
      return item;
    }
  }

  return null;
}

// Extracts a rough transaction outcome or status from the log text
function extractStatusFromLog(logText) {
  const statusPatterns = [
    { pattern: /TRANSACTION DATA\s*\((COMPLETED)\)/i, value: "COMPLETED" },
    { pattern: /"Status"\s*:\s*"([^"]+)"/i, valueFromMatch: true },
    { pattern: /Transaction canceled by host/i, value: "CANCELED BY HOST" },
    { pattern: /TRANSACTION ABORTED/i, value: "ABORTED" },
    { pattern: /NO HOST RESPONSE/i, value: "NO HOST RESPONSE" },
    { pattern: /INCONCLUSIVE/i, value: "INCONCLUSIVE" },
    { pattern: /DECLINED/i, value: "DECLINED" },
    { pattern: /COMPLETED/i, value: "COMPLETED" }
  ];

  for (const item of statusPatterns) {
    const match = logText.match(item.pattern);

    if (match) {
      if (item.valueFromMatch && match[1]) {
        return match[1].toUpperCase();
      }

      return item.value;
    }
  }

  return "";
}

// Extracts a sequence or trace value from the log text
function extractSequenceFromLog(logText) {
  const sequencePatterns = [
    /TRACE NO:\s*([0-9]+)/i,
    /Trans SEQ Number\s*\[([0-9]+)\]/i,
    /"seqNumber"\s*:\s*"([^"]+)"/i,
    /UUID:\s*<([^>]+)>/i
  ];

  for (const pattern of sequencePatterns) {
    const match = logText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return "";
}

// Extracts a useful timestamp-like value from the log text
function extractTimeFromLog(logText) {
  const timePatterns = [
    /\[([0-9]{4}\/[0-9]{2}\/[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2})\]/,
    /\b([0-9]{2}\/[0-9]{2}\/[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2})\b/,
    /\b([0-9]{2}\/[0-9]{2}\/[0-9]{2}\s+[0-9]{2}:[0-9]{2})\b/
  ];

  for (const pattern of timePatterns) {
    const match = logText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return "";
}

// Parses one raw log response and returns extracted values used by the table
function extractLogDetails(rawLogHtml) {
  const plainText = normalizeLogText(stripHtml(rawLogHtml));

  const matchedAidItem = findAidItemFromKnownList(plainText);
  const extractedPatternAid = extractAidValueFromPatterns(plainText);

  let extractedAid = "";
  let extractedAidName = "";

  if (matchedAidItem) {
    extractedAid = String(matchedAidItem.aid || "").trim().toUpperCase();
    extractedAidName = String(matchedAidItem.name || "").trim();
  } else if (extractedPatternAid) {
    extractedAid = extractedPatternAid;

    const mappedAidItem = findAidItemByExactAidValue(extractedPatternAid);
    if (mappedAidItem) {
      extractedAidName = String(mappedAidItem.name || "").trim();
    }
  }

  return {
    extractedAid: extractedAid,
    extractedAidName: extractedAidName,
    extractedStatus: extractStatusFromLog(plainText),
    extractedSequence: extractSequenceFromLog(plainText),
    extractedTime: extractTimeFromLog(plainText)
  };
}

/* ---------------------------------------
   Table rendering
--------------------------------------- */

// Renders transaction rows into the table body
function displayTransactions(transactions) {
  const tableBody = document.querySelector("#transactionsTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  transactions.forEach(function (txn) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(formatDevTime(txn.devTime))}</td>
      <td>${escapeHtml(txn.atm && txn.atm.txt ? txn.atm.txt : "")}</td>
      <td>${escapeHtml(txn.pan || "")}</td>
      <td>${escapeHtml(buildDescription(txn))}</td>
      <td>${formatMultilineHtml(buildDisplayCode(txn))}</td>
    `;

    tableBody.appendChild(row);
  });
}

// Shows a single full-width message row inside the table
function showTableMessage(message) {
  const tableBody = document.querySelector("#transactionsTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="tableMessage">${escapeHtml(message)}</td>
    </tr>
  `;
}

/* ---------------------------------------
   ATM filter dropdown
--------------------------------------- */

// Renders the ATM dropdown with an "All ATMs" option followed by sorted ATM names
function renderAtmDropdown(atmItems) {
  const panel = document.getElementById("atmDropdownPanel");
  if (!panel) return;

  panel.innerHTML = "";

  const allRow = document.createElement("label");
  allRow.className = "checkRow allOptionRow";
  allRow.innerHTML = `
    <span class="checkLabel allOptionLabel">All ATMs</span>
    <input type="checkbox" value="all" checked>
  `;
  panel.appendChild(allRow);

  atmItems.sort(function (a, b) {
    return (a.name || "").localeCompare(b.name || "", undefined, {
      sensitivity: "base"
    });
  });

  atmItems.forEach(function (item) {
    const row = document.createElement("label");
    row.className = "checkRow";
    row.innerHTML = `
      <span class="checkLabel">${item.name}</span>
      <input type="checkbox" value="${item.name}">
    `;
    panel.appendChild(row);
  });
}

// Updates the ATM dropdown button text based on the current selection
function updateAtmDropdownText() {
  const panel = document.getElementById("atmDropdownPanel");
  const textSpan = document.getElementById("atmDropdownText");
  if (!panel || !textSpan) return;

  const allCheckbox = panel.querySelector('input[value="all"]');
  const checkedOthers = Array.from(
    panel.querySelectorAll('input[type="checkbox"]:not([value="all"]):checked')
  );

  if (allCheckbox && allCheckbox.checked) {
    textSpan.textContent = "All ATMs";
  } else if (checkedOthers.length === 1) {
    const label = checkedOthers[0]
      .closest(".checkRow")
      .querySelector(".checkLabel");

    textSpan.textContent = label ? label.textContent.trim() : "1 ATM selected";
  } else if (checkedOthers.length > 1) {
    textSpan.textContent = `${checkedOthers.length} ATMs selected`;
  } else {
    textSpan.textContent = "All ATMs";
  }
}

// Attaches ATM checkbox behavior and re-runs filtering after ATM changes
function setupAtmDropdownBehavior() {
  const panel = document.getElementById("atmDropdownPanel");
  if (!panel) return;

  panel.addEventListener("change", function (event) {
    const changed = event.target;
    if (changed.type !== "checkbox") return;

    const allCheckbox = panel.querySelector('input[value="all"]');
    const otherCheckboxes = Array.from(
      panel.querySelectorAll('input[type="checkbox"]:not([value="all"])')
    );

    if (changed.value === "all" && changed.checked) {
      otherCheckboxes.forEach(function (checkbox) {
        checkbox.checked = false;
      });
    } else if (changed.value !== "all" && changed.checked && allCheckbox) {
      allCheckbox.checked = false;
    }

    const anyOtherChecked = otherCheckboxes.some(function (checkbox) {
      return checkbox.checked;
    });

    if (!anyOtherChecked && allCheckbox) {
      allCheckbox.checked = true;
    }

    updateAtmDropdownText();
    applyFilters();
  });

  updateAtmDropdownText();
}

// Returns the selected ATM names, or an empty array if "All ATMs" is active
function getSelectedAtmNames() {
  const panel = document.getElementById("atmDropdownPanel");
  if (!panel) return [];

  const allCheckbox = panel.querySelector('input[value="all"]');
  if (allCheckbox && allCheckbox.checked) {
    return [];
  }

  return Array.from(
    panel.querySelectorAll('input[type="checkbox"]:not([value="all"]):checked')
  ).map(function (checkbox) {
    return checkbox.value;
  });
}

/* ---------------------------------------
   AID filter dropdown
--------------------------------------- */

// Renders the AID dropdown with an "All applications" option followed by sorted AIDs
function renderAidDropdown(aidItems) {
  const panel = document.getElementById("aidDropdownPanel");
  if (!panel) return;

  panel.innerHTML = "";

  const allRow = document.createElement("label");
  allRow.className = "checkRow allOptionRow";
  allRow.innerHTML = `
    <span class="checkLabel allOptionLabel">All applications</span>
    <input type="checkbox" value="all" checked>
  `;
  panel.appendChild(allRow);

  aidItems.sort(function (a, b) {
    return (a.name || "").localeCompare(b.name || "", undefined, {
      sensitivity: "base"
    });
  });

  aidItems.forEach(function (item) {
    const row = document.createElement("label");
    row.className = "checkRow";

    row.innerHTML = `
      <div class="checkContent">
        <span class="checkLabel">${item.name || item.aid}</span>
        <span class="checkSubLabel">${item.aid || ""}</span>
      </div>
      <input type="checkbox" value="${item.aid || ""}">
    `;

    panel.appendChild(row);
  });
}

// Updates the AID dropdown button text based on the current selection
function updateAidDropdownText() {
  const panel = document.getElementById("aidDropdownPanel");
  const textSpan = document.getElementById("aidDropdownText");
  if (!panel || !textSpan) return;

  const allCheckbox = panel.querySelector('input[value="all"]');
  const checkedOthers = Array.from(
    panel.querySelectorAll('input[type="checkbox"]:not([value="all"]):checked')
  );

  if (allCheckbox && allCheckbox.checked) {
    textSpan.textContent = "All applications";
  } else if (checkedOthers.length === 1) {
    const label = checkedOthers[0]
      .closest(".checkRow")
      .querySelector(".checkLabel");

    textSpan.textContent = label
      ? label.textContent.trim()
      : "1 application selected";
  } else if (checkedOthers.length > 1) {
    textSpan.textContent = `${checkedOthers.length} applications selected`;
  } else {
    textSpan.textContent = "All applications";
  }
}

// Attaches AID checkbox behavior and keeps the dropdown state consistent
function setupAidDropdownBehavior() {
  const panel = document.getElementById("aidDropdownPanel");
  if (!panel) return;

  panel.addEventListener("change", function (event) {
    const changed = event.target;
    if (changed.type !== "checkbox") return;

    const allCheckbox = panel.querySelector('input[value="all"]');
    const otherCheckboxes = Array.from(
      panel.querySelectorAll('input[type="checkbox"]:not([value="all"])')
    );

    if (changed.value === "all" && changed.checked) {
      otherCheckboxes.forEach(function (checkbox) {
        checkbox.checked = false;
      });
    } else if (changed.value !== "all" && changed.checked && allCheckbox) {
      allCheckbox.checked = false;
    }

    const anyOtherChecked = otherCheckboxes.some(function (checkbox) {
      return checkbox.checked;
    });

    if (!anyOtherChecked && allCheckbox) {
      allCheckbox.checked = true;
    }

    updateAidDropdownText();
  });

  updateAidDropdownText();
}

/* ---------------------------------------
   Text filter value helpers
--------------------------------------- */

// Returns the current PAN filter text in lowercase for case-insensitive matching
function getPanFilterValue() {
  const input = document.getElementById("panFilter");
  return input ? input.value.trim().toLowerCase() : "";
}

// Returns the current Transaction Serial Number filter text in lowercase
function getSerialFilterValue() {
  const input = document.getElementById("serialFilter");
  return input ? input.value.trim().toLowerCase() : "";
}

// Returns the current "Search in results" text in lowercase
function getSearchFilterValue() {
  const input = document.getElementById("searchInput");
  return input ? input.value.trim().toLowerCase() : "";
}

// Returns the selected Flatpickr date range as an array of Date objects
function getSelectedDateRange() {
  const input = document.getElementById("dateRange");
  if (!input || !input._flatpickr) return [];
  return input._flatpickr.selectedDates || [];
}

/* ---------------------------------------
   Main filtering logic
--------------------------------------- */

// Applies all active filters to the full transaction dataset and refreshes the table
function applyFilters() {
  const selectedAtms = getSelectedAtmNames();
  const panFilter = getPanFilterValue();
  const serialFilter = getSerialFilterValue();
  const searchFilter = getSearchFilterValue();
  const selectedDates = getSelectedDateRange();

  const serialIsValid = /^[0-9]{1,4}$/.test(serialFilter);
  let filteredTransactions = allTransactions;

  // Date filter
  if (selectedDates.length === 2) {
    const start = new Date(selectedDates[0]);
    const end = new Date(selectedDates[1]);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    filteredTransactions = filteredTransactions.filter(function (txn) {
      const txnDate = parseDevTimeToDate(txn.devTime);
      if (!txnDate) return false;
      return txnDate >= start && txnDate <= end;
    });
  }

  // ATM filter
  if (selectedAtms.length > 0) {
    filteredTransactions = filteredTransactions.filter(function (txn) {
      return selectedAtms.includes((txn.atm && txn.atm.txt) || "");
    });
  }

  // PAN filter
  if (panFilter) {
    filteredTransactions = filteredTransactions.filter(function (txn) {
      return (txn.pan || "").toLowerCase().includes(panFilter);
    });
  }

  // Transaction Serial Number filter
  if (serialFilter) {
    if (!serialIsValid) {
      filteredTransactions = [];
    } else {
      filteredTransactions = filteredTransactions.filter(function (txn) {
        return buildCode(txn).toLowerCase().includes(serialFilter);
      });
    }
  }

  // Search in results filter
  if (searchFilter) {
    filteredTransactions = filteredTransactions.filter(function (txn) {
      const rowText = [
        formatDevTime(txn.devTime),
        (txn.atm && txn.atm.txt) || "",
        txn.pan || "",
        buildDescription(txn),
        buildDisplayCode(txn)
      ]
        .join(" ")
        .toLowerCase();

      return rowText.includes(searchFilter);
    });
  }

  displayTransactions(filteredTransactions);
}

/* ---------------------------------------
   Filter event listeners
--------------------------------------- */

// Connects all text and date inputs so filtering happens as the user interacts
function setupTextFilters() {
  const panInput = document.getElementById("panFilter");
  const serialInput = document.getElementById("serialFilter");
  const searchInput = document.getElementById("searchInput");
  const dateInput = document.getElementById("dateRange");

  if (panInput) {
    panInput.addEventListener("input", applyFilters);
  }

  if (serialInput) {
    serialInput.addEventListener("input", function () {
      const value = serialInput.value.trim();
      const isValid = /^[0-9]{1,4}$/.test(value);

      if (value === "") {
        serialInput.classList.remove("inputError");
        applyFilters();
        return;
      }

      if (!isValid) {
        serialInput.classList.add("inputError");
        applyFilters();
        return;
      }

      serialInput.classList.remove("inputError");
      applyFilters();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (dateInput && dateInput._flatpickr) {
    dateInput._flatpickr.config.onChange.push(function () {
      applyFilters();
    });
  }
}

/* ---------------------------------------
   log enrichment
--------------------------------------- */

async function enrichTransactionsWithLogs(transactions) {
  const batchSize = 5;
  let completedBatches = 0;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async function (txn) {
        try {
          const atmId = txn.atm && txn.atm.id;
          const devTime = txn.devTime;

          if (!atmId || !devTime) {
            return;
          }

          const rawLog = await fetchTransactionLog(atmId, devTime);
          const details = extractLogDetails(rawLog);

          txn.extractedAid = details.extractedAid;
          txn.extractedAidName = details.extractedAidName;
          txn.extractedStatus = details.extractedStatus;
          txn.extractedSequence = details.extractedSequence;
          txn.extractedTime = details.extractedTime;
        } catch (error) {
          // Log failures are ignored so the main table can still work
        }
      })
    );

    completedBatches += 1;

    // Refresh every 4 batches instead of every batch
    if (completedBatches % 4 === 0) {
      applyFilters();
    }
  }

  // Final refresh after all batches complete
  applyFilters();
}

/* ---------------------------------------
   Main initialization
--------------------------------------- */

// Loads dropdown data, fetches transactions, and displays the initial table state
async function init() {
  showTableMessage("Loading transactions...");

  const atmItems = await getAtmList();
  renderAtmDropdown(atmItems);
  setupAtmDropdownBehavior();

  allAidItems = await getAidList();
  renderAidDropdown(allAidItems);
  setupAidDropdownBehavior();

  setupTextFilters();

  const pairs = await getAtmIdTsPairs();
  allTransactions = [];

  // -------------------------------
  // STEP 1: Load transactions with progress
  // -------------------------------

  const totalPairs = pairs.length;
  let loadedPairs = 0;

  for (const pair of pairs) {
    try {
      const txns = await fetchTransactionsForPair(pair.id, pair.ts);

      if (txns.length > 0) {
        allTransactions = allTransactions.concat(txns);
      }
    } catch (error) {
      // ignore failures
    }

    loadedPairs++;
    showTableMessage(`Loading transactions (${loadedPairs} / ${totalPairs})...`);
    await sleep(0); // allow UI to update
  }

  // -------------------------------
  // STEP 2: Load logs with progress
  // -------------------------------

  const totalLogs = allTransactions.length;
  let loadedLogs = 0;

  showTableMessage(`Loading logs (0 / ${totalLogs})...`);

  const batchSize = 5;

  for (let i = 0; i < allTransactions.length; i += batchSize) {
    const batch = allTransactions.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async function (txn) {
        try {
          const atmId = txn.atm && txn.atm.id;
          const devTime = txn.devTime;

          if (!atmId || !devTime) return;

          const rawLog = await fetchTransactionLog(atmId, devTime);
          const details = extractLogDetails(rawLog);

          txn.extractedAid = details.extractedAid;
          txn.extractedAidName = details.extractedAidName;
          txn.extractedStatus = details.extractedStatus;
          txn.extractedSequence = details.extractedSequence;
          txn.extractedTime = details.extractedTime;
        } catch (error) {
          // ignore log failures
        }

        loadedLogs++;
        showTableMessage(`Loading logs (${loadedLogs} / ${totalLogs})...`);
        await sleep(0); // allow UI to repaint
      })
    );
  }

  // -------------------------------
  // STEP 3: Final render
  // -------------------------------

  applyFilters();
}