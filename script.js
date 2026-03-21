// Stores all fetched transactions so filters can be applied on the full dataset
let allTransactions = [];

// API endpoints used by this page
const API = {
  atmList: "https://dev.smartjournal.net/um/test/api/jr/txn/atmlist/v1",
  aidList: "https://dev.smartjournal.net/um/test/api/jr/txn/aidlist/v1",
  txnList: function (id, ts) {
    return `https://dev.smartjournal.net/um/test/api/jr/txn/txnlist/${id}/${ts}/v1?n=30`;
  }
};

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
      <td>${formatDevTime(txn.devTime)}</td>
      <td>${txn.atm && txn.atm.txt ? txn.atm.txt : ""}</td>
      <td>${txn.pan || ""}</td>
      <td>${buildDescription(txn)}</td>
      <td>${buildCode(txn)}</td>
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
      <td colspan="5" class="tableMessage">${message}</td>
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
        buildCode(txn)
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
   Main initialization
--------------------------------------- */

// Loads dropdown data, fetches transactions, and displays the initial table state
async function init() {
  showTableMessage("Loading transactions...");

  const atmItems = await getAtmList();
  renderAtmDropdown(atmItems);
  setupAtmDropdownBehavior();

  const aidItems = await getAidList();
  renderAidDropdown(aidItems);
  setupAidDropdownBehavior();

  setupTextFilters();

  const pairs = await getAtmIdTsPairs();
  allTransactions = [];

  for (const pair of pairs) {
    try {
      const txns = await fetchTransactionsForPair(pair.id, pair.ts);

      if (txns.length > 0) {
        allTransactions = allTransactions.concat(txns);
      }
    } catch (error) {
      // Failed requests are ignored so the rest of the data can still load
    }
  }

  applyFilters();
}