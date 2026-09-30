const DEFAULT_ROWS = [
  { type: "catalog", name: "Caldera", quantity: 0, unitPrice: 250000 },
  {
    type: "catalog",
    name: "Radiador / Secatoalla",
    quantity: 0,
    unitPrice: 140000,
  },
  { type: "catalog", name: "Boiler", quantity: 0, unitPrice: 300000 },
];

const VAT_RATE = 0.19;

const state = {
  rows: DEFAULT_ROWS.map((row) => ({ ...row })),
};

const elements = {
  rows: document.querySelector("#itemRows"),
  rowTemplate: document.querySelector("#rowTemplate"),
  difficultyOptions: [...document.querySelectorAll('input[name="projectDifficulty"]')],
  customDifficulty: document.querySelector("#customDifficulty"),
  addRowButton: document.querySelector("#addRowButton"),
  resetButton: document.querySelector("#resetButton"),
  exportButton: document.querySelector("#exportButton"),
  equipmentCost: document.querySelector("#equipmentCost"),
  difficultyCost: document.querySelector("#difficultyCost"),
  netTotal: document.querySelector("#netTotal"),
  vatCost: document.querySelector("#vatCost"),
  grandTotal: document.querySelector("#grandTotal"),
  totalUnits: document.querySelector("#totalUnits"),
};

const moneyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return moneyFormatter.format(Math.round(value));
}

function selectedDifficulty() {
  const selected = elements.difficultyOptions.find((option) => option.checked);
  if (selected?.value === "custom") {
    return Math.max(1000, toNumber(elements.customDifficulty.value));
  }
  return Math.max(0, toNumber(selected?.value));
}

function rowTotals(row) {
  const quantity = Math.max(0, toNumber(row.quantity));
  const unitPrice = Math.max(0, toNumber(row.unitPrice));

  return {
    equipment: unitPrice * quantity,
    total: unitPrice * quantity,
  };
}

function calculateTotals() {
  const totals = state.rows.reduce(
    (result, row) => {
      const rowResult = rowTotals(row);
      result.equipment += rowResult.equipment;
      result.units += Math.max(0, toNumber(row.quantity));
      return result;
    },
    { equipment: 0, units: 0 }
  );

  totals.difficulty = selectedDifficulty();
  totals.net = totals.equipment + totals.difficulty;
  totals.vat = totals.net * VAT_RATE;
  totals.grand = totals.net + totals.vat;
  return totals;
}

function renderSummary() {
  const totals = calculateTotals();
  elements.equipmentCost.textContent = formatMoney(totals.equipment);
  elements.difficultyCost.textContent = formatMoney(totals.difficulty);
  elements.netTotal.textContent = formatMoney(totals.net);
  elements.vatCost.textContent = formatMoney(totals.vat);
  elements.grandTotal.textContent = formatMoney(totals.grand);
  elements.totalUnits.textContent = `${totals.units.toLocaleString("es-CL")} ${
    totals.units === 1 ? "unidad" : "unidades"
  }`;
}

function refreshRow(tr, row) {
  tr.querySelector(".price-output").value = formatMoney(row.unitPrice);
  tr.querySelector(".subtotal-output").value = formatMoney(rowTotals(row).total);
}

function renderRows() {
  elements.rows.innerHTML = "";

  state.rows.forEach((row, index) => {
    const fragment = elements.rowTemplate.content.cloneNode(true);
    const tr = fragment.querySelector("tr");
    const itemName = fragment.querySelector(".item-name");
    const extraNameInput = fragment.querySelector(".extra-name-input");
    const quantityInput = fragment.querySelector(".quantity-input");
    const priceOutput = fragment.querySelector(".price-output");
    const extraPriceInput = fragment.querySelector(".extra-price-input");
    const deleteButton = fragment.querySelector(".delete-button");
    const isExtra = row.type === "extra";

    itemName.textContent = row.name;
    itemName.hidden = isExtra;
    extraNameInput.hidden = !isExtra;
    extraNameInput.value = row.name;
    quantityInput.value = row.quantity;
    priceOutput.hidden = isExtra;
    extraPriceInput.hidden = !isExtra;
    extraPriceInput.value = row.unitPrice;
    deleteButton.hidden = !isExtra;
    refreshRow(tr, row);

    extraNameInput.addEventListener("input", () => {
      row.name = extraNameInput.value;
    });

    extraPriceInput.addEventListener("input", () => {
      row.unitPrice = Math.max(0, toNumber(extraPriceInput.value));
      refreshRow(tr, row);
      renderSummary();
    });

    quantityInput.addEventListener("input", () => {
      row.quantity = Math.max(0, Math.floor(toNumber(quantityInput.value)) || 0);
      refreshRow(tr, row);
      renderSummary();
    });

    quantityInput.addEventListener("change", () => {
      quantityInput.value = row.quantity;
    });

    deleteButton.addEventListener("click", () => {
      if (row.type !== "extra") return;
      state.rows.splice(index, 1);
      update();
    });

    elements.rows.appendChild(fragment);
  });
}

function update() {
  renderRows();
  renderSummary();
}

function addExtra() {
  state.rows.push({
    type: "extra",
    name: "",
    quantity: 1,
    unitPrice: 0,
  });
  update();
  elements.rows.querySelector("tr:last-child .extra-name-input")?.focus();
}

function reset() {
  state.rows = DEFAULT_ROWS.map((row) => ({ ...row }));
  elements.difficultyOptions.forEach((option) => {
    option.checked = option.value === "200000";
  });
  elements.customDifficulty.value = 200000;
  elements.customDifficulty.disabled = true;
  update();
}

function exportCsv() {
  const totals = calculateTotals();
  const rows = [
    ["Item", "Cantidad", "Precio neto unitario", "Subtotal neto"],
    ...state.rows.map((row) => [
      row.name || "Extra",
      row.quantity,
      row.unitPrice,
      Math.round(rowTotals(row).total),
    ]),
    [],
    ["Equipos y extras", Math.round(totals.equipment)],
    ["Dificultad/Distancia", Math.round(totals.difficulty)],
    ["Total neto", Math.round(totals.net)],
    ["IVA 19%", Math.round(totals.vat)],
    ["Total con IVA", Math.round(totals.grand)],
  ];

  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "presupuesto-instalacion-montaje.csv";
  link.click();
  URL.revokeObjectURL(url);
}

elements.addRowButton.addEventListener("click", addExtra);
elements.resetButton.addEventListener("click", reset);
elements.exportButton.addEventListener("click", exportCsv);
elements.difficultyOptions.forEach((option) => {
  option.addEventListener("change", () => {
    const usesCustomAmount = option.checked && option.value === "custom";
    elements.customDifficulty.disabled = !usesCustomAmount;
    if (usesCustomAmount) elements.customDifficulty.focus();
    renderSummary();
  });
});
elements.customDifficulty.addEventListener("input", renderSummary);
elements.customDifficulty.addEventListener("change", () => {
  elements.customDifficulty.value = selectedDifficulty();
  renderSummary();
});

update();
