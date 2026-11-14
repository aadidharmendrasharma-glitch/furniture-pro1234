
const HISTORY_KEY = "FurniturePro_All_Saved_Bills";
const CURRENT_KEY = "FurniturePro_Current_Bill";

let currentBillId = null;
let autoSaveTimer = null;

const $ = id => document.getElementById(id);

function setStatus(message) {
    $("saveStatus").textContent = message;
}

function makeId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
}

function getBills() {
    try {
        const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function getBillData() {
    return {
        billNo: $("billNo").value,
        billDate: $("billDate").value,
        customerName: $("customerName").value,
        customerMobile: $("customerMobile").value,
        customerAddress: $("customerAddress").value,
        advance: $("advance").value,
        notes: $("notes").value,

        products: Array.from(
            document.querySelectorAll("#productBody tr")
        ).map(row => ({
            product: row.querySelector(".product").value,
            length: row.querySelector(".length").value,
            width: row.querySelector(".width").value,
            qty: row.querySelector(".qty").value,
            rate: row.querySelector(".rate").value
        }))
    };
}

// ADD PRODUCT
function addProduct() {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input class="product" placeholder="Product Name"></td>
        <td><input class="length" type="number" min="0" step="any" value="0"></td>
        <td><input class="width" type="number" min="0" step="any" value="0"></td>
        <td class="size">0.00</td>
        <td><input class="qty" type="number" min="0" step="1" value="1"></td>
        <td class="sqft">0.00</td>
        <td><input class="rate" type="number" min="0" step="any" value="375"></td>
        <td class="amount">₹ 0.00</td>
        <td class="no-print">
            <button class="delete-btn" onclick="deleteProduct(this)">Delete</button>
        </td>
    `;

    $("productBody").appendChild(row);
    calculateBill();
}

// CALCULATE BILL
function calculateBill() {
    let totalSqFt = 0;
    let grandTotal = 0;

    document.querySelectorAll("#productBody tr").forEach(row => {
        const length = Number(row.querySelector(".length").value) || 0;
        const width = Number(row.querySelector(".width").value) || 0;
        const qty = Number(row.querySelector(".qty").value) || 0;
        const rate = Number(row.querySelector(".rate").value) || 0;

        const size = length * width;
        const sqft = size * qty;
        const amount = sqft * rate;

        row.querySelector(".size").textContent = size.toFixed(2);
        row.querySelector(".sqft").textContent = sqft.toFixed(2);
        row.querySelector(".amount").textContent =
            "₹ " + amount.toFixed(2);

        totalSqFt += sqft;
        grandTotal += amount;
    });

    const advance = Number($("advance").value) || 0;

    $("totalSqFt").textContent = totalSqFt.toFixed(2);
    $("grandTotal").textContent = grandTotal.toFixed(2);
    $("remaining").textContent = (grandTotal - advance).toFixed(2);
}

// DELETE PRODUCT
function deleteProduct(button) {
    if (!confirm("Delete this product?")) return;

    button.closest("tr").remove();
    calculateBill();
    scheduleAutoSave();
}

// SAVE CURRENT WORK
function saveCurrent() {
    try {
        localStorage.setItem(CURRENT_KEY, JSON.stringify({
            billId: currentBillId,
            bill: getBillData()
        }));

        setStatus("✓ Current bill automatically saved.");
    } catch {
        setStatus("Storage full or unavailable. Download backup.");
    }
}

// AUTO SAVE
function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveCurrent, 400);
}

document.addEventListener("input", event => {
    if (event.target.closest(".container")) {
        if (
            event.target.matches(".length, .width, .qty, .rate") ||
            event.target.id === "advance"
        ) {
            calculateBill();
        }

        scheduleAutoSave();
    }
});

// SAVE BILL TO HISTORY
function saveBillToHistory() {
    const bill = getBillData();

    if (!bill.billNo.trim()) {
        alert("Please enter Bill Number.");
        return;
    }

    if (!bill.customerName.trim()) {
        alert("Please enter Customer Name.");
        return;
    }

    if (!bill.products.length) {
        alert("Please add at least one product.");
        return;
    }

    let bills = getBills();

    const existing = bills.find(
        item => item.bill.billNo === bill.billNo.trim()
    );

    if (existing && existing.id !== currentBillId) {
        alert("This Bill Number already exists. Please use another number.");
        return;
    }

    if (existing && !confirm("Update this existing bill?")) {
        return;
    }

    calculateBill();

    const total = $("grandTotal").textContent;

    const savedItem = {
        id: currentBillId || makeId(),
        savedAt: new Date().toISOString(),
        total: total,
        bill: bill
    };

    const index = bills.findIndex(item => item.id === savedItem.id);

    if (index >= 0) {
        bills[index] = savedItem;
    } else {
        bills.push(savedItem);
    }

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(bills));

        currentBillId = savedItem.id;

        saveCurrent();
        renderBillHistory();

        alert("Bill saved successfully!");
    } catch {
        alert("Unable to save. Download a backup or free browser storage.");
    }
}

// DISPLAY BILL HISTORY
function renderBillHistory() {
    const tbody = $("savedBillsList");
    const search = ($("searchBill").value || "").toLowerCase();

    const bills = getBills();

    const filtered = bills.filter(item => {
        const bill = item.bill || {};

        return (
            String(bill.billNo || "").toLowerCase().includes(search) ||
            String(bill.customerName || "").toLowerCase().includes(search) ||
            String(bill.customerMobile || "").toLowerCase().includes(search)
        );
    });

    tbody.innerHTML = "";

    if (!filtered.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "No Saved Bills Found";
        row.appendChild(cell);
        tbody.appendChild(row);
    }

    filtered.forEach(item => {
        const row = document.createElement("tr");

        [
            item.bill.billNo,
            item.bill.billDate,
            item.bill.customerName,
            item.bill.customerMobile,
            "₹ " + item.total
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value || "-";
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "history-actions";

        const view = document.createElement("button");
        view.textContent = "View";
        view.className = "view-btn";
        view.onclick = () => openSavedBill(item.id);

        const print = document.createElement("button");
        print.textContent = "Print";
        print.className = "print-btn";
        print.onclick = () => printSavedBill(item.id);

        const del = document.createElement("button");
        del.textContent = "Delete";
        del.className = "delete-btn";
        del.onclick = () => deleteSavedBill(item.id);

        actions.append(view, print, del);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });

    $("billCount").textContent = "Total Saved Bills: " + bills.length;
}

// OPEN OLD BILL
function openSavedBill(id) {
    const item = getBills().find(b => b.id === id);

    if (!item) {
        alert("Bill not found.");
        return;
    }

    if (!confirm("Open this bill? Unsaved current changes may be replaced.")) {
        return;
    }

    currentBillId = item.id;
    loadBillIntoForm(item.bill);

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// LOAD BILL INTO FORM
function loadBillIntoForm(bill) {
    $("billNo").value = bill.billNo || "";
    $("billDate").value = bill.billDate || "";
    $("customerName").value = bill.customerName || "";
    $("customerMobile").value = bill.customerMobile || "";
    $("customerAddress").value = bill.customerAddress || "";
    $("advance").value = bill.advance || "0";
    $("notes").value = bill.notes || "";

    $("productBody").innerHTML = "";

    bill.products.forEach(product => {
        addProduct();

        const row = $("productBody").lastElementChild;

        row.querySelector(".product").value = product.product;
        row.querySelector(".length").value = product.length;
        row.querySelector(".width").value = product.width;
        row.querySelector(".qty").value = product.qty;
        row.querySelector(".rate").value = product.rate;
    });

    calculateBill();
    saveCurrent();
}

// PRINT OLD BILL
function printSavedBill(id) {
    const item = getBills().find(b => b.id === id);

    if (!item) {
        alert("Bill not found.");
        return;
    }

    if (!confirm("Load this saved bill and print it?")) return;

    currentBillId = item.id;
    loadBillIntoForm(item.bill);

    setTimeout(() => window.print(), 300);
}

// DELETE OLD BILL
function deleteSavedBill(id) {
    if (!confirm("Permanently delete this saved bill?")) return;

    const bills = getBills().filter(item => item.id !== id);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(bills));

        if (currentBillId === id) {
            currentBillId = null;
        }

        renderBillHistory();
        alert("Bill deleted successfully.");
    } catch {
        alert("Unable to delete bill.");
    }
}

// NEW BILL
function newBill() {
    if (!confirm("Create a new bill? Save current bill first if required.")) {
        return;
    }

    currentBillId = null;

    $("billNo").value = "";
    $("customerName").value = "";
    $("customerMobile").value = "";
    $("customerAddress").value = "";
    $("advance").value = "0";
    $("notes").value = "";
    $("productBody").innerHTML = "";

    $("billDate").value = new Date().toISOString().split("T")[0];

    addProduct();
    calculateBill();
    saveCurrent();
}

// DOWNLOAD BACKUP
function downloadBackup() {
    try {
        const backup = {
            version: 1,
            createdAt: new Date().toISOString(),
            bills: getBills(),
            current: {
                billId: currentBillId,
                bill: getBillData()
            }
        };

        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "FurniturePro_Backup_" +
            new Date().toISOString().slice(0, 10) + ".json";

        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch {
        alert("Backup download failed.");
    }
}

// RESTORE BACKUP
function restoreBackup(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("Backup file is too large.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const backup = JSON.parse(reader.result);

            if (
                backup.version !== 1 ||
                !Array.isArray(backup.bills) ||
                backup.bills.length > 10000
            ) {
                throw new Error("Invalid backup");
            }

            backup.bills.forEach(item => {
                if (
                    !item ||
                    typeof item.id !== "string" ||
                    !item.bill ||
                    !Array.isArray(item.bill.products) ||
                    item.bill.products.length > 500
                ) {
                    throw new Error("Invalid bill");
                }

                ["billNo", "billDate", "customerName",
                 "customerMobile", "customerAddress", "advance", "notes"]
                    .forEach(key => {
                        if (typeof item.bill[key] !== "string") {
                            throw new Error("Invalid field");
                        }
                    });

                item.bill.products.forEach(product => {
                    ["product", "length", "width", "qty", "rate"]
                        .forEach(key => {
                            if (typeof product[key] !== "string") {
                                throw new Error("Invalid product");
                            }
                        });
                });
            });

            if (!confirm("Restore backup? Existing saved bills will be replaced.")) {
                return;
            }

            const current = backup.current;

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(backup.bills)
            );

            if (current && current.bill) {
                loadBillIntoForm(current.bill);
                currentBillId = current.billId || null;
                saveCurrent();
            } else {
                currentBillId = null;
                newBill();
            }

            renderBillHistory();

            alert("Backup restored successfully!");

        } catch {
            alert("Invalid or damaged backup file.");
        } finally {
            event.target.value = "";
        }
    };

    reader.onerror = () => {
        alert("Could not read backup file.");
        event.target.value = "";
    };

    reader.readAsText(file);
}

// LOAD PREVIOUS WORK
function loadPreviousWork() {
    $("billDate").value = new Date().toISOString().split("T")[0];

    try {
        const saved = JSON.parse(localStorage.getItem(CURRENT_KEY) || "null");

        if (saved && saved.bill) {
            currentBillId = saved.billId || null;
            loadBillIntoForm(saved.bill);
        } else {
            addProduct();
        }
    } catch {
        addProduct();
        setStatus("Unable to load previous work. Check your backup.");
    }

    renderBillHistory();
}

// SEARCH
$("searchBill").addEventListener("input", renderBillHistory);

// RESTORE BUTTON
$("restoreFile").addEventListener("change", restoreBackup);

// START SOFTWARE
loadPreviousWork();
