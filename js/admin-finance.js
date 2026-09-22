/* =========================================================
AL YOSRA STORE
Financial Management System
========================================================= */


/* =========================================================
Global State
========================================================= */

let financeOrders = [];
let financeOrderItems = [];
let financeProducts = [];
let financeProductCosts = {};
const FINANCE_INVENTORY_PER_PAGE = 10;
let financeInventoryCurrentPage = 1;
let financeInventorySearchTerm = "";

const FINANCE_EXPENSES_PER_PAGE = 10;
let financeExpensesCurrentPage = 1;
let editingExpenseId = null;
let editingCapitalMovementId = null;
let financeCapitalMovements = [];
const FINANCE_CAPITAL_MOVEMENTS_PER_PAGE = 10;
let financeCapitalMovementsCurrentPage = 1;
let financeExpenses = [];
let capitalMovements = [];
let cashflowMovements = [];

let selectedFinanceOrder = null;
let selectedFinanceOrderItems = [];

let currentPeriod = "month";
let currentStartDate = null;
let currentEndDate = null;


/* =========================================================
DOM Helpers
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);
    if (element) {
        element.textContent = value;
    }
}

function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return "0.00 $";
    }
    return `${number.toFixed(2)} $`;
}

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return "0";
    }
    return number.toLocaleString("ar-EG");
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
Toast
========================================================= */

let financeToastTimer = null;

function showFinanceToast(message, type = "success") {
    const toast = getElement("financeToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("show", "success", "error", "warning");
    toast.classList.add(type);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    clearTimeout(financeToastTimer);
    financeToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


/* =========================================================
Authentication
========================================================= */

async function checkFinanceAccess() {
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
            window.location.href = "admin-login.html";
            return;
        }

        const { data: isAdmin, error: adminError } = await supabaseClient.rpc("is_admin");

        if (adminError) throw adminError;

        if (!isAdmin) {
            await supabaseClient.auth.signOut();
            window.location.href = "admin-login.html";
            return;
        }

        await initializeFinancePage();

    } catch (error) {
        console.error("Finance authentication error:", error);
        window.location.href = "admin-login.html";
    }
}


/* =========================================================
Initialization
========================================================= */

async function initializeFinancePage() {
    initializeFinanceControls();
    initializeFinanceNavigation();
    initializeFinanceModals();
    initializeFinanceActions();
    initializeFinanceForms();

    setDefaultDateRange();
    setupFinanceInventoryPaginationContainer();
    setupFinanceExpensesPaginationContainer();

    await loadFinanceData();
}

/* =========================================================
Controls
========================================================= */

function initializeFinanceControls() {
    const periodSelect = getElement("financePeriod");

    if (periodSelect) {
        periodSelect.addEventListener("change", async function () {
            currentPeriod = this.value;
            financeExpensesCurrentPage = 1;
            updateCustomDateVisibility();

            if (currentPeriod !== "custom") {
                await loadFinanceData();
            }
        });
    }

    const applyDateButton = getElement("applyDateRangeButton");

    if (applyDateButton) {
        applyDateButton.addEventListener("click", async function () {
            const start = getElement("financeStartDate")?.value;
            const end = getElement("financeEndDate")?.value;

            if (!start || !end) {
                showFinanceToast("يرجى تحديد تاريخ البداية والنهاية.", "warning");
                return;
            }

            if (start > end) {
                showFinanceToast("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.", "warning");
                return;
            }

            currentStartDate = start;
            currentEndDate = end;
            financeExpensesCurrentPage = 1;

            await loadFinanceData();
        });
    }

    const orderSearch = getElement("financeOrderSearch");

    if (orderSearch) {
        orderSearch.addEventListener("input", function () {
            renderFinanceOrders();
        });
    }

    const orderFilter = getElement("financeOrderFilter");

    if (orderFilter) {
        orderFilter.addEventListener("change", function () {
            renderFinanceOrders();
        });
    }

    /* =========================================================
       Inventory Search
    ========================================================== */
    const inventorySearchToggle = getElement("financeInventorySearchToggle");
    const inventorySearch = getElement("financeInventorySearch");
    const inventorySearchInput = getElement("financeInventorySearchInput");
    const inventorySearchClose = getElement("financeInventorySearchClose");

    if (inventorySearchToggle && inventorySearch && inventorySearchInput) {
        inventorySearchToggle.addEventListener("click", function () {
            inventorySearch.hidden = false;
            inventorySearchInput.focus();
        });
    }

    if (inventorySearchClose && inventorySearch && inventorySearchInput) {
        inventorySearchClose.addEventListener("click", function () {
            inventorySearchInput.value = "";
            financeInventorySearchTerm = "";
            financeInventoryCurrentPage = 1;
            inventorySearch.hidden = true;
            inventorySearchInput.blur();
            renderFinanceInventory();
        });
    }

    if (inventorySearchInput) {
        inventorySearchInput.addEventListener("input", function () {
            financeInventorySearchTerm = this.value.trim().toLowerCase();
            financeInventoryCurrentPage = 1;
            renderFinanceInventory();
        });
    }
}


/* =========================================================
Navigation
========================================================= */

function initializeFinanceNavigation() {
    const cards = document.querySelectorAll(".finance-kpi-card[data-target-section]");

    cards.forEach(card => {
        card.addEventListener("click", function () {
            const target = this.dataset.targetSection;
            scrollToFinanceSection(target);
        });
    });
}

function scrollToFinanceSection(sectionName) {
    const section = getElement(`${sectionName}Section`);
    if (!section) return;

    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
Actions
========================================================= */

function initializeFinanceActions() {
    const refreshButton = getElement("refreshFinanceButton");

    if (refreshButton) {
        refreshButton.addEventListener("click", async function () {
            refreshButton.disabled = true;
            const originalText = refreshButton.textContent;
            refreshButton.textContent = "جاري التحديث...";

            try {
                await loadFinanceData();
                showFinanceToast("تم تحديث البيانات المالية.", "success");
            } catch (error) {
                console.error(error);
                showFinanceToast("تعذر تحديث البيانات.", "error");
            } finally {
                refreshButton.disabled = false;
                refreshButton.textContent = originalText;
            }
        });
    }

    const exportButton = getElement("exportFinanceButton");

    if (exportButton) {
        exportButton.addEventListener("click", function () {
            exportFinanceReport();
        });
    }

    const salesExportButton = getElement("salesExportButton");

    if (salesExportButton) {
        salesExportButton.addEventListener("click", function () {
            exportSalesReport();
        });
    }

    const addExpenseButton = getElement("addExpenseButton");

    if (addExpenseButton) {
        addExpenseButton.addEventListener("click", function () {
            openExpenseModal();
        });
    }

    const addCapitalButton = getElement("addCapitalMovementButton");

    if (addCapitalButton) {
        addCapitalButton.addEventListener("click", function () {
            openCapitalMovementModal();
        });
    }

    const capitalMovementForm = getElement("capitalMovementForm");

    if (capitalMovementForm) {
        capitalMovementForm.addEventListener("submit", function (event) {
            event.preventDefault();
            saveCapitalMovement();
        });
    }
}


/* =========================================================
Modals
========================================================= */

function initializeFinanceModals() {
    const closeOrderButton = getElement("closeOrderDetailsButton");
    if (closeOrderButton) {
        closeOrderButton.addEventListener("click", closeOrderDetailsModal);
    }

    const closeExpenseButton = getElement("closeExpenseModalButton");
    if (closeExpenseButton) {
        closeExpenseButton.addEventListener("click", closeExpenseModal);
    }

    const cancelExpenseButton = getElement("cancelExpenseButton");
    if (cancelExpenseButton) {
        cancelExpenseButton.addEventListener("click", closeExpenseModal);
    }

    const closeCapitalButton = getElement("closeCapitalMovementModalButton");
    if (closeCapitalButton) {
        closeCapitalButton.addEventListener("click", closeCapitalMovementModal);
    }

    const cancelCapitalButton = getElement("cancelCapitalMovementButton");
    if (cancelCapitalButton) {
        cancelCapitalButton.addEventListener("click", closeCapitalMovementModal);
    }

    document.querySelectorAll("[data-close-modal]").forEach(element => {
        element.addEventListener("click", closeOrderDetailsModal);
    });

    document.querySelectorAll("[data-close-expense-modal]").forEach(element => {
        element.addEventListener("click", closeExpenseModal);
    });

    document.querySelectorAll("[data-close-capital-modal]").forEach(element => {
        element.addEventListener("click", closeCapitalMovementModal);
    });

    const saveCostButton = getElement("saveOrderCostButton");
    if (saveCostButton) {
        saveCostButton.addEventListener("click", saveOrderCost);
    }

    const printInvoiceButton = getElement("printInvoiceButton");
    if (printInvoiceButton) {
        printInvoiceButton.addEventListener("click", handlePrintInvoice);
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        closeOrderDetailsModal();
        closeExpenseModal();
        closeCapitalMovementModal();
    });
}


/* =========================================================
Load Finance Data
========================================================= */

async function loadFinanceData() {
    updateDateRange();

    await Promise.all([
        loadDeliveredOrders(),
        loadProducts(),
        loadProductCosts(),
        loadExpenses(),
        loadCapitalMovements()
    ]);

    const orderIds = financeOrders.map(order => order.id);
    await loadOrderItems(orderIds);

    calculateFinanceMetrics();
    renderFinanceOrders();
    renderFinanceInventory();
    renderFinanceExpenses();
    renderCapitalSummary();
    renderCashflowSummary();
    renderAnalyticsSummary();
    updateFinancePeriodLabel();
}


/* =========================================================
Date Range
========================================================= */

function setDefaultDateRange() {
    const periodSelect = getElement("financePeriod");
    if (periodSelect) {
        currentPeriod = periodSelect.value || "month";
    }
    updateDateRange();
    updateCustomDateVisibility();
}

function updateDateRange() {
    if (currentPeriod === "custom") {
        const start = getElement("financeStartDate")?.value;
        const end = getElement("financeEndDate")?.value;
        currentStartDate = start || null;
        currentEndDate = end || null;
        return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start;
    let end;

    switch (currentPeriod) {
        case "today":
            start = new Date(today);
            end = new Date(today);
            break;
        case "yesterday":
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            end = new Date(start);
            break;
        case "week": {
            const day = today.getDay();
            const difference = day === 0 ? 6 : day - 1;
            start = new Date(today);
            start.setDate(start.getDate() - difference);
            end = new Date(today);
            break;
        }
        case "last-week": {
            const day = today.getDay();
            const difference = day === 0 ? 6 : day - 1;
            end = new Date(today);
            end.setDate(end.getDate() - difference - 1);
            start = new Date(end);
            start.setDate(start.getDate() - 6);
            break;
        }
        case "month":
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case "last-month":
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case "year":
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;
        default:
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
    }

    currentStartDate = formatDateForDatabase(start);
    currentEndDate = formatDateForDatabase(end);
}

function formatDateForDatabase(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function updateCustomDateVisibility() {
    const container = getElement("customDateRange");
    if (!container) return;
    container.hidden = currentPeriod !== "custom";
}


/* =========================================================
Orders
========================================================= */

async function loadDeliveredOrders() {
    let query = supabaseClient.from("orders").select("*").eq("status", "delivered");

    // تطبيق فلترة التواريخ لجلب الطلبات المسلمة في الفترة المحددة فقط
    if (currentStartDate) {
        query = query.gte("created_at", currentStartDate + "T00:00:00.000Z");
    }
    if (currentEndDate) {
        query = query.lte("created_at", currentEndDate + "T23:59:59.999Z");
    }

    const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false });

    if (error) {
        throw error;
    }

    financeOrders = Array.isArray(data) ? data : [];
}


/* =========================================================
Order Items
========================================================= */

async function loadOrderItems(orderIds) {
    if (!orderIds.length) {
        financeOrderItems = [];
        return;
    }

    const { data, error } = await supabaseClient.from("order_items").select("*").in("order_id", orderIds);

    if (error) {
        throw error;
    }

    financeOrderItems = Array.isArray(data) ? data : [];
}


/* =========================================================
Products
========================================================= */

async function loadProducts() {
    const { data, error } = await supabaseClient.from("products").select("*").order("id", { ascending: false });
    if (error) throw error;
    financeProducts = Array.isArray(data) ? data : [];
}


/* =========================================================
Product Costs
========================================================= */

async function loadProductCosts() {
    const { data, error } = await supabaseClient.from("product_costs").select("product_id, purchase_cost");
    if (error) throw error;

    financeProductCosts = {};
    (data || []).forEach(cost => {
        financeProductCosts[String(cost.product_id)] = Number(cost.purchase_cost);
    });
}


/* =========================================================
Expenses
========================================================= */

async function loadExpenses() {
    const { data, error } = await supabaseClient
        .from("expenses")
        .select("*")
        .gte("expense_date", currentStartDate)
        .lte("expense_date", currentEndDate)
        .order("expense_date", { ascending: false })
        .order("id", { ascending: false });

    if (error) throw error;
    financeExpenses = Array.isArray(data) ? data : [];
}

async function loadCapitalMovements() {
    const { data, error } = await supabaseClient
        .from("capital_movements")
        .select("*")
        .gte("movement_date", currentStartDate) // Added filtering for capital by date to match the period
        .lte("movement_date", currentEndDate)
        .order("movement_date", { ascending: false })
        .order("id", { ascending: false });

    if (error) throw error;
    financeCapitalMovements = Array.isArray(data) ? data : [];
}


/* =========================================================
Financial Calculations
========================================================= */

function calculateFinanceMetrics() {
    const sales = financeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const orderCostMap = new Map();
    const incompleteOrderIds = new Set();

    financeOrderItems.forEach(item => {
        const orderId = String(item.order_id);
        const productId = item.product_id;
        const quantity = Number(item.quantity || 0);
        const purchaseCost = financeProductCosts[String(productId)];

        if (!Number.isFinite(Number(purchaseCost)) || Number(purchaseCost) <= 0) {
            incompleteOrderIds.add(orderId);
            return;
        }

        const itemCost = quantity * Number(purchaseCost);
        const currentOrderCost = orderCostMap.get(orderId) || 0;
        orderCostMap.set(orderId, currentOrderCost + itemCost);
    });

    financeOrders.forEach(order => {
        const orderId = String(order.id);
        const manualCost = Number(order.order_cost);
        const hasManualCost = order.order_cost !== null && order.order_cost !== undefined && order.order_cost !== "" && Number.isFinite(manualCost) && manualCost >= 0;

        if (hasManualCost) {
            order.order_cost = manualCost;
            order._costComplete = true;
            order._costSource = "manual";
            return;
        }

        if (incompleteOrderIds.has(orderId)) {
            order.order_cost = null;
            order._costComplete = false;
            order._costSource = null;
            return;
        }

        order.order_cost = orderCostMap.get(orderId) || 0;
        order._costComplete = true;
        order._costSource = "automatic";
    });

    const allOrdersCostComplete = financeOrders.every(order => order._costComplete === true);
    const costs = allOrdersCostComplete ? financeOrders.reduce((sum, order) => sum + Number(order.order_cost || 0), 0) : 0;
    const grossProfit = allOrdersCostComplete ? sales - costs : null;
    const expenses = financeExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const netProfit = allOrdersCostComplete ? grossProfit - expenses : null;
    const deliveredCount = financeOrders.length;
    const averageOrderValue = deliveredCount ? sales / deliveredCount : 0;
    const profitMargin = sales > 0 && allOrdersCostComplete ? (grossProfit / sales) * 100 : null;
    
    let soldItemsCount = 0;
    financeOrderItems.forEach(item => { soldItemsCount += Number(item.quantity || 0); });

    setText("totalSales", formatMoney(sales));
    setText("totalCosts", allOrdersCostComplete ? formatMoney(costs) : "غير مكتمل");
    setText("grossProfit", allOrdersCostComplete ? formatMoney(grossProfit) : "غير مكتمل");
    setText("totalExpenses", formatMoney(expenses));
    setText("netProfit", allOrdersCostComplete ? formatMoney(netProfit) : "غير مكتمل");
    
    const inventoryStats = calculateInventoryStats();
    setText("inventoryValue", formatMoney(inventoryStats.costValue));
    setText("deliveredOrdersCount", formatNumber(deliveredCount));
    setText("averageOrderValue", formatMoney(averageOrderValue));
    setText("profitMargin", allOrdersCostComplete && profitMargin !== null ? `${profitMargin.toFixed(1)}%` : "غير مكتمل");
    setText("soldItemsCount", formatNumber(soldItemsCount));
}


/* =========================================================
Inventory Calculations
========================================================= */

function calculateInventoryCostValue() {
    return financeProducts.reduce((sum, product) => {
        const quantity = Number(product.quantity || 0);
        const purchaseCost = Number(financeProductCosts[String(product.id)]);
        if (!Number.isFinite(purchaseCost) || purchaseCost <= 0) return sum;
        return sum + (quantity * purchaseCost);
    }, 0);
}

function calculateInventoryRetailValue() {
    return financeProducts.reduce((sum, product) => {
        const quantity = Number(product.quantity || 0);
        const price = Number(product.price || 0);
        return sum + (quantity * price);
    }, 0);
}

function calculateInventoryExpectedProfit() {
    const retailValue = calculateInventoryRetailValue();
    const costValue = calculateInventoryCostValue();
    return retailValue - costValue;
}

function calculateInventoryStats() {
    const productCount = financeProducts.length;
    const costValue = calculateInventoryCostValue();
    const retailValue = calculateInventoryRetailValue();
    const expectedProfit = calculateInventoryExpectedProfit();

    let lowStock = 0;
    let outOfStock = 0;

    financeProducts.forEach(product => {
        const quantity = Number(product.quantity || 0);
        if (quantity <= 0) outOfStock++;
        else if (quantity <= 5) lowStock++;
    });

    return { productCount, costValue, retailValue, expectedProfit, lowStock, outOfStock };
}


/* =========================================================
Orders Table
========================================================= */

function getFilteredFinanceOrders() {
    const searchValue = getElement("financeOrderSearch")?.value.trim().toLowerCase() || "";
    const filter = getElement("financeOrderFilter")?.value || "all";

    return financeOrders.filter(order => {
        const orderNumber = String(order.order_number || "").toLowerCase();
        const customerName = String(order.customer_name || "").toLowerCase();
        const matchesSearch = !searchValue || orderNumber.includes(searchValue) || customerName.includes(searchValue);
        if (!matchesSearch) return false;

        const cost = Number(order.order_cost);
        const hasCost = Number.isFinite(cost);

        if (filter === "cost-missing" && hasCost) return false;
        if (filter === "cost-entered" && !hasCost) return false;
        if (filter === "profitable") {
            if (!hasCost) return false;
            return (Number(order.total || 0) - cost) > 0;
        }
        if (filter === "loss") {
            if (!hasCost) return false;
            return (Number(order.total || 0) - cost) < 0;
        }
        return true;
    });
}

function renderFinanceOrders() {
    const tbody = getElement("financeOrdersTableBody");
    if (!tbody) return;

    const orders = getFilteredFinanceOrders();

    if (!orders.length) {
        tbody.innerHTML = `<tr class="finance-empty-row"><td colspan="8">لا توجد طلبات مطابقة للبحث أو الفلتر الحالي.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const total = Number(order.total || 0);
        const cost = Number(order.order_cost);
        const hasCost = order._costComplete === true && Number.isFinite(cost);
        const profit = hasCost ? total - cost : null;
        let profitHTML = "—";

        if (hasCost) {
            profitHTML = `<span class="${profit >= 0 ? "finance-positive" : "finance-negative"}">${formatMoney(profit)}</span>`;
        }

        const costHTML = hasCost ? formatMoney(cost) : `<span class="finance-warning-text">⚠️ غير مسجلة</span>`;
        const statusHTML = hasCost ? `<span class="finance-status success">مسجلة</span>` : `<span class="finance-status warning">تحتاج تكلفة</span>`;

        // استخراج وعرض تاريخ الطلب بشكل نظيف
        const orderDateStr = order.created_at ? order.created_at.split('T')[0] : "—";

        return `
            <tr>
                <td><strong>${escapeHTML(order.order_number || `#${order.id}`)}</strong></td>
                <td style="direction:ltr;">${orderDateStr}</td>
                <td>${escapeHTML(order.customer_name || "—")}</td>
                <td>${formatMoney(total)}</td>
                <td>${costHTML}</td>
                <td>${profitHTML}</td>
                <td>${statusHTML}</td>
                <td>
                    <button type="button" class="finance-table-action" data-order-id="${order.id}">التفاصيل</button>
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-order-id]").forEach(button => {
        button.addEventListener("click", function () {
            const orderId = Number(this.dataset.orderId);
            openOrderDetails(orderId);
        });
    });
}


/* =========================================================
Order Details
========================================================= */

async function openOrderDetails(orderId) {
    const order = financeOrders.find(item => Number(item.id) === orderId);
    if (!order) {
        showFinanceToast("تعذر العثور على الطلب.", "error");
        return;
    }

    selectedFinanceOrder = order;

    const { data, error } = await supabaseClient.from("order_items").select("*").eq("order_id", orderId).order("id", { ascending: true });
    if (error) {
        console.error("Order items error:", error);
        showFinanceToast("تعذر تحميل منتجات الطلب.", "error");
        return;
    }

    selectedFinanceOrderItems = Array.isArray(data) ? data : [];
    populateOrderDetailsModal();

    const modal = getElement("orderDetailsModal");
    if (modal) {
        modal.hidden = false;
        requestAnimationFrame(() => {
            modal.classList.add("show");
        });
    }
}

function populateOrderDetailsModal() {
    const order = selectedFinanceOrder;
    if (!order) return;

    setText("orderDetailsTitle", `الطلب ${order.order_number || `#${order.id}`}`);
    setText("modalCustomerName", order.customer_name || "—");
    setText("modalCustomerPhone", order.customer_phone || "—");
    setText("modalCustomerAddress", order.customer_address || "—");
    setText("modalOrderNumber", order.order_number || `#${order.id}`);
    setText("modalOrderDate", order.created_at ? new Date(order.created_at).toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" }) : "غير متوفر");

    const total = Number(order.total || 0);
    const cost = Number(order.order_cost);
    const hasCost = Number.isFinite(cost);

    setText("modalSaleTotal", formatMoney(total));
    setText("modalOrderCost", hasCost ? formatMoney(cost) : "غير مسجلة");

    if (hasCost) {
        const profit = total - cost;
        const margin = total > 0 ? (profit / total) * 100 : 0;
        setText("modalOrderProfit", formatMoney(profit));
        setText("modalProfitMargin", `${margin.toFixed(1)}%`);
    } else {
        setText("modalOrderProfit", "غير مكتمل");
        setText("modalProfitMargin", "غير مكتمل");
    }

    const costInput = getElement("orderCostInput");
    if (costInput) {
        costInput.value = hasCost ? cost : "";
    }

    renderOrderItems();
    setText("modalProductsCount", `${selectedFinanceOrderItems.length} منتج`);
}

function renderOrderItems() {
    const tbody = getElement("modalOrderItemsBody");
    if (!tbody) return;

    if (!selectedFinanceOrderItems.length) {
        tbody.innerHTML = `<tr class="finance-empty-row"><td colspan="4">لا توجد منتجات مرتبطة بهذا الطلب.</td></tr>`;
        return;
    }

    tbody.innerHTML = selectedFinanceOrderItems.map(item => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const subtotal = Number(item.subtotal ?? unitPrice * quantity);

        return `
            <tr>
                <td>${escapeHTML(item.product_name || "منتج")}</td>
                <td>${formatNumber(quantity)}</td>
                <td>${formatMoney(unitPrice)}</td>
                <td>${formatMoney(subtotal)}</td>
            </tr>
        `;
    }).join("");
}

function closeOrderDetailsModal() {
    const modal = getElement("orderDetailsModal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => { modal.hidden = true; }, 180);
}


/* =========================================================
Order Cost
========================================================= */

async function saveOrderCost() {
    if (!selectedFinanceOrder) {
        showFinanceToast("لم يتم تحديد طلب.", "error");
        return;
    }

    const input = getElement("orderCostInput");
    if (!input) return;

    const rawValue = input.value.trim();
    if (rawValue === "") {
        showFinanceToast("يرجى إدخال تكلفة الطلب.", "warning");
        return;
    }

    const cost = Number(rawValue);
    if (!Number.isFinite(cost) || cost < 0) {
        showFinanceToast("أدخل تكلفة صحيحة.", "warning");
        return;
    }

    const saveButton = getElement("saveOrderCostButton");
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "جاري الحفظ...";
    }

    try {
        const { error } = await supabaseClient.from("orders").update({ order_cost: cost }).eq("id", selectedFinanceOrder.id);
        if (error) throw error;

        selectedFinanceOrder.order_cost = cost;
        const index = financeOrders.findIndex(order => Number(order.id) === Number(selectedFinanceOrder.id));
        if (index !== -1) {
            financeOrders[index].order_cost = cost;
        }

        populateOrderDetailsModal();
        calculateFinanceMetrics();
        renderFinanceOrders();
        showFinanceToast("تم حفظ تكلفة الطلب بنجاح.", "success");

    } catch (error) {
        console.error("Save order cost error:", error);
        showFinanceToast("تعذر حفظ تكلفة الطلب. تأكد من إضافة حقل order_cost إلى جدول orders.", "error");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "حفظ التكلفة";
        }
    }
}


/* =========================================================
Expenses & Capital Movements Modals (Skipped repitition - keeping exactly as is)
========================================================= */

function openExpenseModal(expense = null) {
    const modal = getElement("expenseModal");
    if (!modal) return;
    const form = getElement("expenseForm");
    const title = getElement("expenseModalTitle");
    const dateInput = getElement("expenseDate");
    const categoryInput = getElement("expenseCategory");
    const amountInput = getElement("expenseAmount");
    const descriptionInput = getElement("expenseDescription");
    const saveButton = form?.querySelector('button[type="submit"]');

    if (!expense) {
        editingExpenseId = null;
        form.reset();
        if (title) title.textContent = "إضافة مصروف";
        if (saveButton) saveButton.textContent = "حفظ المصروف";
        if (dateInput) dateInput.value = formatDateForDatabase(new Date());
    } else {
        editingExpenseId = expense.id;
        if (title) title.textContent = "تعديل المصروف";
        if (saveButton) saveButton.textContent = "حفظ التعديل";
        if (dateInput) dateInput.value = expense.expense_date || "";
        if (categoryInput) categoryInput.value = expense.category || "";
        if (amountInput) amountInput.value = expense.amount ?? "";
        if (descriptionInput) descriptionInput.value = expense.description || "";
    }

    modal.hidden = false;
    requestAnimationFrame(() => { modal.classList.add("show"); });
}

function closeExpenseModal() {
    const modal = getElement("expenseModal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => { modal.hidden = true; }, 180);
}

function openCapitalMovementModal(movement = null) {
    const modal = getElement("capitalMovementModal");
    if (!modal) return;
    const form = getElement("capitalMovementForm");
    const title = getElement("capitalMovementModalTitle");
    const dateInput = getElement("capitalMovementDate");
    const typeInput = getElement("capitalMovementType");
    const amountInput = getElement("capitalMovementAmount");
    const descriptionInput = getElement("capitalMovementDescription");
    const saveButton = form?.querySelector('button[type="submit"]');

    if (!movement) {
        editingCapitalMovementId = null;
        form.reset();
        if (title) title.textContent = "إضافة حركة رأس مال";
        if (saveButton) saveButton.textContent = "حفظ الحركة";
        if (dateInput) dateInput.value = formatDateForDatabase(new Date());
    } else {
        editingCapitalMovementId = movement.id;
        if (title) title.textContent = "تعديل حركة رأس المال";
        if (saveButton) saveButton.textContent = "حفظ التعديل";
        if (dateInput) dateInput.value = movement.movement_date || "";
        if (typeInput) typeInput.value = movement.movement_type || "";
        if (amountInput) amountInput.value = movement.amount ?? "";
        if (descriptionInput) descriptionInput.value = movement.description || "";
    }

    modal.hidden = false;
    requestAnimationFrame(() => { modal.classList.add("show"); });
}

function closeCapitalMovementModal() {
    const modal = getElement("capitalMovementModal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => { modal.hidden = true; }, 180);
}

async function saveCapitalMovement() {
    const form = getElement("capitalMovementForm");
    const dateInput = getElement("capitalMovementDate");
    const typeInput = getElement("capitalMovementType");
    const amountInput = getElement("capitalMovementAmount");
    const descriptionInput = getElement("capitalMovementDescription");

    if (!form) return;

    const movementDate = dateInput?.value || "";
    const movementType = typeInput?.value || "";
    const amount = Number(amountInput?.value || 0);
    const description = descriptionInput?.value.trim() || null;

    if (!movementDate) { showFinanceToast("يرجى تحديد التاريخ.", "warning"); return; }
    if (movementType !== "investment" && movementType !== "withdrawal") { showFinanceToast("يرجى اختيار نوع الحركة.", "warning"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { showFinanceToast("يرجى إدخال مبلغ صحيح أكبر من صفر.", "warning"); return; }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const movementData = { amount: amount, movement_type: movementType, description: description, movement_date: movementDate };
        let error = null;

        if (editingCapitalMovementId) {
            const result = await supabaseClient.from("capital_movements").update(movementData).eq("id", editingCapitalMovementId);
            error = result.error;
        } else {
            const result = await supabaseClient.from("capital_movements").insert(movementData);
            error = result.error;
        }

        if (error) throw error;

        await loadCapitalMovements();
        financeCapitalMovementsCurrentPage = 1;
        renderCapitalSummary();
        closeCapitalMovementModal();
        showFinanceToast(editingCapitalMovementId ? "تم تعديل حركة رأس المال بنجاح." : "تمت إضافة حركة رأس المال بنجاح.", "success");

    } catch (error) {
        console.error(error);
        showFinanceToast("تعذر حفظ حركة رأس المال.", "error");
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function initializeFinanceForms() {
    const expenseForm = getElement("expenseForm");
    if (!expenseForm) return;
    expenseForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        await saveExpense();
    });
}

async function saveExpense() {
    const dateInput = getElement("expenseDate");
    const categoryInput = getElement("expenseCategory");
    const amountInput = getElement("expenseAmount");
    const descriptionInput = getElement("expenseDescription");

    if (!dateInput || !categoryInput || !amountInput || !descriptionInput) return;

    const expenseDate = dateInput.value.trim();
    const category = categoryInput.value.trim();
    const rawAmount = amountInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!expenseDate) { showFinanceToast("يرجى تحديد تاريخ المصروف.", "warning"); return; }
    if (!category) { showFinanceToast("يرجى اختيار تصنيف المصروف.", "warning"); return; }
    
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) { showFinanceToast("أدخل مبلغًا صحيحًا أكبر من صفر.", "warning"); return; }

    const saveButton = getElement("expenseForm")?.querySelector('button[type="submit"]');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = editingExpenseId ? "جاري التعديل..." : "جاري الحفظ...";
    }

    try {
        if (editingExpenseId !== null) {
            const { data, error } = await supabaseClient.from("expenses").update({ expense_date: expenseDate, category: category, amount: amount, description: description || null }).eq("id", editingExpenseId).select().single();
            if (error) throw error;
            if (data) {
                const index = financeExpenses.findIndex(expense => Number(expense.id) === Number(editingExpenseId));
                if (index !== -1) financeExpenses[index] = data;
            }
            showFinanceToast("تم تعديل المصروف بنجاح.", "success");
        } else {
            const { data, error } = await supabaseClient.from("expenses").insert({ expense_date: expenseDate, category: category, amount: amount, description: description || null }).select().single();
            if (error) throw error;
            if (data) financeExpenses.unshift(data);
            showFinanceToast("تمت إضافة المصروف بنجاح.", "success");
        }

        editingExpenseId = null;
        calculateFinanceMetrics();
        renderFinanceExpenses();
        const expenseForm = getElement("expenseForm");
        if (expenseForm) expenseForm.reset();
        closeExpenseModal();

    } catch (error) {
        console.error("Save expense error:", error);
        showFinanceToast(editingExpenseId !== null ? "تعذر تعديل المصروف. حاول مرة أخرى." : "تعذر حفظ المصروف. حاول مرة أخرى.", "error");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "حفظ المصروف";
        }
    }
}

/* =========================================================
Expenses Rendering
========================================================= */

function renderFinanceExpenses() {
    const tbody = getElement("financeExpensesTableBody");
    if (!tbody) return;

    const total = financeExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const average = financeExpenses.length ? total / financeExpenses.length : 0;

    setText("expensesPeriodTotal", formatMoney(total));
    setText("expensesCount", formatNumber(financeExpenses.length));
    setText("averageExpense", formatMoney(average));

    if (!financeExpenses.length) {
        tbody.innerHTML = `<tr class="finance-empty-row"><td colspan="5">لا توجد مصروفات مسجلة للفترة الحالية.</td></tr>`;
        financeExpensesCurrentPage = 1;
        renderFinanceExpensesPagination(0);
        return;
    }

    const totalPages = Math.ceil(financeExpenses.length / FINANCE_EXPENSES_PER_PAGE);
    if (financeExpensesCurrentPage > totalPages) financeExpensesCurrentPage = totalPages;
    if (financeExpensesCurrentPage < 1) financeExpensesCurrentPage = 1;

    const startIndex = (financeExpensesCurrentPage - 1) * FINANCE_EXPENSES_PER_PAGE;
    const currentExpenses = financeExpenses.slice(startIndex, startIndex + FINANCE_EXPENSES_PER_PAGE);

    tbody.innerHTML = currentExpenses.map(expense => {
        return `
            <tr>
                <td style="direction:ltr;">${escapeHTML(expense.expense_date || "—")}</td>
                <td>${escapeHTML(expense.category || "—")}</td>
                <td>${escapeHTML(expense.description || "—")}</td>
                <td>${formatMoney(expense.amount)}</td>
                <td>
                    <div class="finance-expense-actions">
                        <button type="button" class="finance-expense-edit-button" data-expense-id="${expense.id}">تعديل</button>
                        <button type="button" class="finance-expense-delete-button" data-expense-id="${expense.id}">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    renderFinanceExpensesPagination(financeExpenses.length);
    initializeFinanceExpenseEditButtons();
    initializeFinanceExpenseDeleteButtons();
}

function renderFinanceExpensesPagination(totalExpenses = financeExpenses.length) {
    const pagination = getElement("financeExpensesPagination");
    if (!pagination) return;
    const totalPages = Math.ceil(totalExpenses / FINANCE_EXPENSES_PER_PAGE);
    if (totalExpenses <= FINANCE_EXPENSES_PER_PAGE) { pagination.innerHTML = ""; return; }

    const currentPage = financeExpensesCurrentPage;
    const startItem = (currentPage - 1) * FINANCE_EXPENSES_PER_PAGE + 1;
    const endItem = Math.min(currentPage * FINANCE_EXPENSES_PER_PAGE, totalExpenses);
    
    let pagesHTML = "";
    for (let page = 1; page <= totalPages; page++) {
        pagesHTML += `<button type="button" class="finance-pagination-page ${page === currentPage ? "active" : ""}" data-expense-page="${page}">${page}</button>`;
    }

    pagination.innerHTML = `
        <div class="finance-pagination-info">عرض ${formatNumber(startItem)} - ${formatNumber(endItem)} من ${formatNumber(totalExpenses)} مصروفًا</div>
        <div class="finance-pagination-controls">
            <button type="button" class="finance-pagination-arrow" data-expense-page-action="previous" ${currentPage === 1 ? "disabled" : ""}>السابق</button>
            <div class="finance-pagination-pages">${pagesHTML}</div>
            <button type="button" class="finance-pagination-arrow" data-expense-page-action="next" ${currentPage === totalPages ? "disabled" : ""}>التالي</button>
        </div>
    `;

    pagination.querySelectorAll("[data-expense-page]").forEach(button => {
        button.addEventListener("click", function () {
            const selectedPage = Number(this.dataset.expensePage);
            if (selectedPage === financeExpensesCurrentPage) return;
            financeExpensesCurrentPage = selectedPage;
            renderFinanceExpenses();
        });
    });

    const prevBtn = pagination.querySelector('[data-expense-page-action="previous"]');
    if (prevBtn) prevBtn.addEventListener("click", function () {
        if (financeExpensesCurrentPage <= 1) return;
        financeExpensesCurrentPage--;
        renderFinanceExpenses();
    });

    const nextBtn = pagination.querySelector('[data-expense-page-action="next"]');
    if (nextBtn) nextBtn.addEventListener("click", function () {
        if (financeExpensesCurrentPage >= totalPages) return;
        financeExpensesCurrentPage++;
        renderFinanceExpenses();
    });
}

function initializeFinanceExpenseEditButtons() {
    document.querySelectorAll(".finance-expense-edit-button").forEach(button => {
        button.addEventListener("click", function () {
            const expenseId = Number(this.dataset.expenseId);
            const expense = financeExpenses.find(item => Number(item.id) === expenseId);
            if (!expense) return;
            openExpenseModal(expense);
        });
    });
}

function initializeFinanceExpenseDeleteButtons() {
    document.querySelectorAll(".finance-expense-delete-button").forEach(button => {
        button.addEventListener("click", function () {
            const expenseId = Number(this.dataset.expenseId);
            deleteExpense(expenseId);
        });
    });
}

async function deleteExpense(expenseId) {
    const expense = financeExpenses.find(item => Number(item.id) === Number(expenseId));
    if (!expense) { showFinanceToast("تعذر العثور على المصروف.", "error"); return; }
    
    const confirmed = confirm("هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذه العملية.");
    if (!confirmed) return;

    try {
        const { error } = await supabaseClient.from("expenses").delete().eq("id", expenseId);
        if (error) throw error;
        
        financeExpenses = financeExpenses.filter(item => Number(item.id) !== Number(expenseId));
        calculateFinanceMetrics();
        renderFinanceExpenses();
        showFinanceToast("تم حذف المصروف بنجاح.", "success");
    } catch (error) {
        console.error("Delete expense error:", error);
        showFinanceToast("تعذر حذف المصروف. حاول مرة أخرى.", "error");
    }
}


/* =========================================================
Inventory & Capital Rendering (Keeping the exact same code)
========================================================= */

function renderFinanceInventory() {
    const tbody = getElement("financeInventoryTableBody");
    if (!tbody) return;

    const stats = calculateInventoryStats();
    setText("inventoryProductsCount", formatNumber(stats.productCount));
    setText("inventoryCostValue", formatMoney(stats.costValue));
    setText("inventoryRetailValue", formatMoney(stats.retailValue));
    setText("inventoryExpectedProfit", formatMoney(stats.expectedProfit));
    setText("lowStockProductsCount", formatNumber(stats.lowStock));
    setText("outOfStockProductsCount", formatNumber(stats.outOfStock));

    const searchTerm = financeInventorySearchTerm.trim().toLowerCase();
    const filteredProducts = searchTerm ? financeProducts.filter(product => {
        const productName = String(product.name || "").toLowerCase();
        const productCode = String(product.product_code || "").toLowerCase();
        return (productName.includes(searchTerm) || productCode.includes(searchTerm));
    }) : financeProducts;

    if (!financeProducts.length) {
        tbody.innerHTML = `<tr class="finance-empty-row"><td colspan="7">لا توجد منتجات في قاعدة البيانات.</td></tr>`;
        renderFinanceInventoryPagination(0);
        return;
    }

    if (!filteredProducts.length) {
        tbody.innerHTML = `<tr class="finance-empty-row"><td colspan="7">لا توجد نتائج مطابقة للبحث.</td></tr>`;
        renderFinanceInventoryPagination(0);
        return;
    }

    const totalPages = Math.ceil(filteredProducts.length / FINANCE_INVENTORY_PER_PAGE);
    if (financeInventoryCurrentPage > totalPages) financeInventoryCurrentPage = totalPages;
    if (financeInventoryCurrentPage < 1) financeInventoryCurrentPage = 1;

    const startIndex = (financeInventoryCurrentPage - 1) * FINANCE_INVENTORY_PER_PAGE;
    const currentProducts = filteredProducts.slice(startIndex, startIndex + FINANCE_INVENTORY_PER_PAGE);

    tbody.innerHTML = currentProducts.map(product => {
        const quantity = Number(product.quantity || 0);
        const price = Number(product.price || 0);
        const purchaseCost = Number(financeProductCosts[String(product.id)]);
        
        const retailValue = quantity * price;
        const costValue = Number.isFinite(purchaseCost) && purchaseCost > 0 ? quantity * purchaseCost : null;
        const expectedProfit = costValue !== null ? retailValue - costValue : null;
        
        let status = "متوفر";
        if (quantity <= 0) status = "نافد";
        else if (quantity <= 5) status = "منخفض";

        const purchaseCostHTML = costValue !== null ? formatMoney(purchaseCost) : `<span class="finance-warning-text">⚠️ غير مسجلة</span>`;
        const costValueHTML = costValue !== null ? formatMoney(costValue) : "—";
        const expectedProfitHTML = expectedProfit !== null ? `<span class="${expectedProfit >= 0 ? "finance-positive" : "finance-negative"}">${formatMoney(expectedProfit)}</span>` : "—";

        return `
            <tr>
                <td>${escapeHTML(product.name || "—")}</td>
                <td>${formatNumber(quantity)}</td>
                <td>${formatMoney(price)}</td>
                <td>${purchaseCostHTML}</td>
                <td>${costValueHTML}</td>
                <td>${expectedProfitHTML}</td>
                <td><span class="finance-status ${quantity <= 0 ? "danger" : quantity <= 5 ? "warning" : "success"}">${status}</span></td>
            </tr>
        `;
    }).join("");

    renderFinanceInventoryPagination(filteredProducts.length);
}

function renderFinanceInventoryPagination(totalProducts = financeProducts.length) {
    const pagination = getElement("financeInventoryPagination");
    if (!pagination) return;
    const totalPages = Math.ceil(totalProducts / FINANCE_INVENTORY_PER_PAGE);
    if (totalProducts <= FINANCE_INVENTORY_PER_PAGE) { pagination.innerHTML = ""; return; }

    const currentPage = financeInventoryCurrentPage;
    const startItem = (currentPage - 1) * FINANCE_INVENTORY_PER_PAGE + 1;
    const endItem = Math.min(currentPage * FINANCE_INVENTORY_PER_PAGE, totalProducts);
    
    let pagesHTML = "";
    for (let page = 1; page <= totalPages; page++) {
        pagesHTML += `<button type="button" class="finance-pagination-page ${page === currentPage ? "active" : ""}" data-page="${page}">${page}</button>`;
    }

    pagination.innerHTML = `
        <div class="finance-pagination-info">عرض ${formatNumber(startItem)} - ${formatNumber(endItem)} من ${formatNumber(totalProducts)} منتجًا</div>
        <div class="finance-pagination-controls">
            <button type="button" class="finance-pagination-arrow" data-page-action="previous" ${currentPage === 1 ? "disabled" : ""}>السابق</button>
            <div class="finance-pagination-pages">${pagesHTML}</div>
            <button type="button" class="finance-pagination-arrow" data-page-action="next" ${currentPage === totalPages ? "disabled" : ""}>التالي</button>
        </div>
    `;

    pagination.querySelectorAll("[data-page]").forEach(button => {
        button.addEventListener("click", function () {
            const selectedPage = Number(this.dataset.page);
            if (selectedPage === financeInventoryCurrentPage) return;
            financeInventoryCurrentPage = selectedPage;
            renderFinanceInventory();
        });
    });

    const prevBtn = pagination.querySelector('[data-page-action="previous"]');
    if (prevBtn) prevBtn.addEventListener("click", function () {
        if (financeInventoryCurrentPage <= 1) return;
        financeInventoryCurrentPage--;
        renderFinanceInventory();
    });

    const nextBtn = pagination.querySelector('[data-page-action="next"]');
    if (nextBtn) nextBtn.addEventListener("click", function () {
        if (financeInventoryCurrentPage >= totalPages) return;
        financeInventoryCurrentPage++;
        renderFinanceInventory();
    });
}

function setupFinanceInventoryPaginationContainer() {
    const tableBody = document.getElementById("financeInventoryTableBody");
    if (!tableBody) return;
    const table = tableBody.closest("table");
    if (!table) return;
    if (document.getElementById("financeInventoryPagination")) return;
    const pagination = document.createElement("div");
    pagination.id = "financeInventoryPagination";
    pagination.className = "finance-inventory-pagination";
    const tableContainer = table.parentElement;
    if (tableContainer && tableContainer.parentElement) {
        tableContainer.parentElement.insertBefore(pagination, tableContainer.nextSibling);
    }
}

function setupFinanceExpensesPaginationContainer() {
    const tableBody = document.getElementById("financeExpensesTableBody");
    if (!tableBody) return;
    const table = tableBody.closest("table");
    if (!table) return;
    if (document.getElementById("financeExpensesPagination")) return;
    const pagination = document.createElement("div");
    pagination.id = "financeExpensesPagination";
    pagination.className = "finance-expenses-pagination";
    const tableContainer = table.parentElement;
    if (tableContainer && tableContainer.parentElement) {
        tableContainer.parentElement.insertBefore(pagination, tableContainer.nextSibling);
    }
}

function renderCapitalSummary() {
    const movements = Array.isArray(financeCapitalMovements) ? financeCapitalMovements : [];
    const investments = movements.filter(movement => movement.movement_type === "investment");
    
    const initialCapital = investments.length ? Number(investments[investments.length - 1].amount || 0) : 0;
    const additions = investments.slice(0, -1).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
    const withdrawals = movements.filter(movement => movement.movement_type === "withdrawal").reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
    const currentCapital = initialCapital + additions - withdrawals;

    setText("initialCapital", initialCapital ? formatMoney(initialCapital) : "غير مسجل");
    setText("capitalAdditions", additions ? formatMoney(additions) : "0.00 $");
    setText("capitalWithdrawals", withdrawals ? formatMoney(withdrawals) : "0.00 $");
    setText("currentCapital", currentCapital ? formatMoney(currentCapital) : "غير مسجل");
    setText("capitalValue", currentCapital ? formatMoney(currentCapital) : "غير مسجل");

    const tbody = getElement("capitalMovementsTableBody");
    if (!tbody) return;

    if (!movements.length) {
        tbody.innerHTML = `<tr class="finance-empty-row"><td colspan="5">لم يتم تسجيل حركات رأس المال بعد.</td></tr>`;
        renderCapitalMovementsPagination(0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(movements.length / FINANCE_CAPITAL_MOVEMENTS_PER_PAGE));
    if (financeCapitalMovementsCurrentPage > totalPages) financeCapitalMovementsCurrentPage = totalPages;

    const startIndex = (financeCapitalMovementsCurrentPage - 1) * FINANCE_CAPITAL_MOVEMENTS_PER_PAGE;
    const pageMovements = movements.slice(startIndex, startIndex + FINANCE_CAPITAL_MOVEMENTS_PER_PAGE);

    tbody.innerHTML = pageMovements.map(movement => {
        const movementType = movement.movement_type === "investment" ? "إضافة رأس مال" : movement.movement_type === "withdrawal" ? "سحب رأس مال" : "غير معروف";
        return `
            <tr>
                <td style="direction:ltr;">${escapeHTML(movement.movement_date || "—")}</td>
                <td>${escapeHTML(movementType)}</td>
                <td>${formatMoney(movement.amount)}</td>
                <td>${escapeHTML(movement.description || "—")}</td>
                <td>
                    <div class="finance-table-actions">
                        <button type="button" class="finance-action-button" data-edit-capital-movement="${movement.id}">تعديل</button>
                        <button type="button" class="finance-action-button finance-danger-button" data-delete-capital-movement="${movement.id}">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    renderCapitalMovementsPagination(movements.length);
    initializeCapitalMovementEditButtons();
    initializeCapitalMovementDeleteButtons();
}

function renderCapitalMovementsPagination(totalMovements) {
    const container = getElement("capitalMovementsPagination");
    if (!container) return;
    const totalPages = Math.ceil(totalMovements / FINANCE_CAPITAL_MOVEMENTS_PER_PAGE);
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<button type="button" class="finance-pagination-button" data-capital-page="prev" ${financeCapitalMovementsCurrentPage === 1 ? "disabled" : ""}>السابق</button>`;
    for (let page = 1; page <= totalPages; page++) {
        html += `<button type="button" class="finance-pagination-button ${page === financeCapitalMovementsCurrentPage ? "active" : ""}" data-capital-page="${page}">${page}</button>`;
    }
    html += `<button type="button" class="finance-pagination-button" data-capital-page="next" ${financeCapitalMovementsCurrentPage === totalPages ? "disabled" : ""}>التالي</button>`;

    container.innerHTML = html;
    container.querySelectorAll("[data-capital-page]").forEach(button => {
        button.addEventListener("click", function () {
            const value = this.dataset.capitalPage;
            if (value === "prev") { if (financeCapitalMovementsCurrentPage > 1) financeCapitalMovementsCurrentPage--; }
            else if (value === "next") { if (financeCapitalMovementsCurrentPage < totalPages) financeCapitalMovementsCurrentPage++; }
            else { financeCapitalMovementsCurrentPage = Number(value); }
            renderCapitalSummary();
        });
    });
}

function initializeCapitalMovementEditButtons() {
    document.querySelectorAll("[data-edit-capital-movement]").forEach(button => {
        button.addEventListener("click", function () {
            const movementId = Number(this.dataset.editCapitalMovement);
            const movement = financeCapitalMovements.find(item => Number(item.id) === movementId);
            if (!movement) return;
            openCapitalMovementModal(movement);
        });
    });
}

async function initializeCapitalMovementDeleteButtons() {
    document.querySelectorAll("[data-delete-capital-movement]").forEach(button => {
        button.addEventListener("click", async function () {
            const movementId = Number(this.dataset.deleteCapitalMovement);
            if (!Number.isFinite(movementId)) return;

            const confirmed = confirm("هل أنت متأكد من حذف حركة رأس المال هذه؟");
            if (!confirmed) return;

            this.disabled = true;

            try {
                const { error } = await supabaseClient.from("capital_movements").delete().eq("id", movementId);
                if (error) throw error;
                await loadCapitalMovements();
                const totalPages = Math.max(1, Math.ceil(financeCapitalMovements.length / FINANCE_CAPITAL_MOVEMENTS_PER_PAGE));
                if (financeCapitalMovementsCurrentPage > totalPages) financeCapitalMovementsCurrentPage = totalPages;
                renderCapitalSummary();
                showFinanceToast("تم حذف حركة رأس المال بنجاح.", "success");
            } catch (error) {
                console.error(error);
                showFinanceToast("تعذر حذف حركة رأس المال.", "error");
                this.disabled = false;
            }
        });
    });
}


/* =========================================================
Cash Flow (تم التفعيل والتوليد التفصيلي للحركة النقدية)
========================================================= */

function renderCashflowSummary() {
    const sales = financeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const expenses = financeExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    
    // إضافة حركات رأس المال للتدفق النقدي
    const capitalInvestments = financeCapitalMovements.filter(m => m.movement_type === "investment").reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const capitalWithdrawals = financeCapitalMovements.filter(m => m.movement_type === "withdrawal").reduce((sum, m) => sum + Number(m.amount || 0), 0);

    const inflow = sales + capitalInvestments;
    const outflow = expenses + capitalWithdrawals;
    const net = inflow - outflow;

    setText("cashInflow", formatMoney(inflow));
    setText("cashOutflow", formatMoney(outflow));
    setText("netCashflow", formatMoney(net));
    setText("currentCashBalance", formatMoney(net)); // يمثل رصيد الفترة المحددة

    // بناء مصفوفة الحركات لدمج كل المعاملات وترتيبها زمنياً
    let transactions = [];
    
    financeOrders.forEach(order => {
        const total = Number(order.total || 0);
        if (total > 0) {
            transactions.push({
                date: order.created_at ? order.created_at.split('T')[0] : (currentEndDate || ""),
                description: `مبيعات (طلب ${order.order_number || '#' + order.id})`,
                inflow: total,
                outflow: 0
            });
        }
    });

    financeExpenses.forEach(expense => {
        const amount = Number(expense.amount || 0);
        if (amount > 0) {
            transactions.push({
                date: expense.expense_date || (currentEndDate || ""),
                description: `مصروف (${expense.category}) - ${expense.description || ''}`,
                inflow: 0,
                outflow: amount
            });
        }
    });

    financeCapitalMovements.forEach(movement => {
        const amount = Number(movement.amount || 0);
        if (amount > 0) {
            transactions.push({
                date: movement.movement_date || (currentEndDate || ""),
                description: `رأس مال (${movement.movement_type === 'investment' ? 'إيداع' : 'سحب'}) - ${movement.description || ''}`,
                inflow: movement.movement_type === 'investment' ? amount : 0,
                outflow: movement.movement_type === 'withdrawal' ? amount : 0
            });
        }
    });

    // الترتيب التصاعدي حسب التاريخ ليكون الجدول كشف حساب منطقي
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const tbody = getElement("cashflowTableBody");
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="5">لا توجد حركة أموال مسجلة في هذه الفترة.</td>
            </tr>
        `;
        return;
    }

    let runningBalance = 0;
    tbody.innerHTML = transactions.map(t => {
        runningBalance += (t.inflow - t.outflow);
        return `
            <tr>
                <td style="direction:ltr;">${escapeHTML(t.date)}</td>
                <td>${escapeHTML(t.description)}</td>
                <td><span class="finance-positive">${t.inflow > 0 ? formatMoney(t.inflow) : '—'}</span></td>
                <td><span class="finance-negative">${t.outflow > 0 ? formatMoney(t.outflow) : '—'}</span></td>
                <td style="direction:ltr; text-align:right;"><strong>${formatMoney(runningBalance)}</strong></td>
            </tr>
        `;
    }).join("");
}


/* =========================================================
Analytics
========================================================= */

function renderAnalyticsSummary() {
    const productSales = {};

    financeOrderItems.forEach(item => {
        const name = item.product_name || "منتج";
        const quantity = Number(item.quantity || 0);
        if (!productSales[name]) productSales[name] = 0;
        productSales[name] += quantity;
    });

    const bestProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];

    if (bestProduct) {
        setText("bestSellingProduct", bestProduct[0]);
        setText("bestSellingProductSales", `${formatNumber(bestProduct[1])} قطعة مباعة`);
    } else {
        setText("bestSellingProduct", "—");
        setText("bestSellingProductSales", "لا توجد بيانات بعد");
    }

    // حساب أفضل يوم مبيعات خلال الفترة المحددة
    const dailySales = {};
    financeOrders.forEach(order => {
        const dateStr = order.created_at ? order.created_at.split('T')[0] : null;
        if(dateStr) {
            if(!dailySales[dateStr]) dailySales[dateStr] = 0;
            dailySales[dateStr] += Number(order.total || 0);
        }
    });
    const bestDay = Object.entries(dailySales).sort((a, b) => b[1] - a[1])[0];
    
    if (bestDay) {
        setText("bestSalesDay", bestDay[0]);
        setText("bestSalesDayValue", formatMoney(bestDay[1]));
    } else {
        setText("bestSalesDay", "—");
        setText("bestSalesDayValue", "لا توجد مبيعات في هذه الفترة");
    }

    setText("highestExpenseCategory", "—");
    setText("highestExpenseCategoryValue", "لا توجد مصروفات مسجلة");

    const ordersWithCost = financeOrders.filter(order => Number.isFinite(Number(order.order_cost)));
    if (ordersWithCost.length) {
        const totalMargin = ordersWithCost.reduce((sum, order) => {
            const total = Number(order.total || 0);
            const cost = Number(order.order_cost || 0);
            if (!total) return sum;
            return sum + (((total - cost) / total) * 100);
        }, 0);
        const averageMargin = totalMargin / ordersWithCost.length;
        setText("averageProfitMargin", `${averageMargin.toFixed(1)}%`);
    } else {
        setText("averageProfitMargin", "غير مكتمل");
    }
}


/* =========================================================
Period Label
========================================================= */

function updateFinancePeriodLabel() {
    const label = getElement("financePeriodLabel");
    if (!label) return;

    const select = getElement("financePeriod");
    if (currentPeriod === "custom") {
        label.textContent = `${currentStartDate || "—"} → ${currentEndDate || "—"}`;
        return;
    }

    if (select) {
        const selected = select.options[select.selectedIndex];
        label.textContent = selected?.textContent || "الفترة الحالية";
    }
}


/* =========================================================
Invoice (نظام توليد وطباعة الفاتورة الفعلي)
========================================================= */

/* =========================================================
Invoice (تصميم فاتورة عالمي فخم مع روابط QR مخصصة)
========================================================= */
/* =========================================================
Invoice (تصميم فاتورة عالمي فخم - QR في الأسفل)
========================================================= */

function handlePrintInvoice() {
    if (!selectedFinanceOrder) {
        showFinanceToast("لم يتم تحديد طلب.", "warning");
        return;
    }

    const order = selectedFinanceOrder;
    const items = selectedFinanceOrderItems;
    
    const printWindow = window.open('', '_blank');
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('ar-SY', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير متوفر';
    
    // رابط QR Code (يمكنك استبداله برابط حسابك أو رقم واتساب)
    const businessSocialUrl = encodeURIComponent("https://www.instagram.com/blwy0?stkn=MXRnMHZnb2o5ZHZzYg==");
    const qrSocialUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${businessSocialUrl}&margin=0`;

    // توليد جدول المنتجات
    let itemsHtml = items.map((item, index) => `
        <tr>
            <td style="padding: 14px 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">${index + 1}</td>
            <td style="padding: 14px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #0f172a;">${escapeHTML(item.product_name)}</td>
            <td style="padding: 14px 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">${item.quantity}</td>
            <td style="padding: 14px 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">${formatMoney(item.unit_price)}</td>
            <td style="padding: 14px 10px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700; color: #0f172a;">${formatMoney(item.subtotal ?? (item.quantity * item.unit_price))}</td>
        </tr>
    `).join('');

    // القالب التصميمي الفاخر
    const invoiceHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة مبيعات - ${order.order_number || order.id}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
                
                body { 
                    font-family: 'Cairo', Tahoma, Arial, sans-serif; 
                    padding: 50px; 
                    color: #1e293b; 
                    background: #ffffff; 
                    line-height: 1.5; 
                    margin: 0;
                }
                .invoice-wrapper { 
                    max-width: 850px; 
                    margin: 0 auto; 
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                }
                
                /* الترويسة العليا */
                .invoice-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-start; 
                    border-bottom: 2px solid #0f172a; 
                    padding-bottom: 30px; 
                    margin-bottom: 30px; 
                }
                .brand-info h1 { 
                    font-size: 32px; 
                    font-weight: 900; 
                    color: #0f172a; 
                    margin: 0 0 5px 0; 
                }
                .brand-info p { 
                    font-size: 14px; 
                    color: #64748b; 
                    margin: 0; 
                }
                
                .invoice-badge { 
                    text-align: left; 
                }
                .invoice-badge h2 { 
                    margin: 0 0 5px 0; 
                    font-size: 20px; 
                    color: #2563eb; 
                    font-weight: 800;
                }
                .invoice-badge p { 
                    margin: 3px 0; 
                    color: #475569; 
                    font-size: 13px; 
                }

                /* صندوق معلومات العميل */
                .customer-box { 
                    background: #f8fafc; 
                    border: 1px solid #e2e8f0; 
                    padding: 25px; 
                    border-radius: 14px; 
                    margin-bottom: 35px; 
                }
                .customer-box h3 { 
                    margin: 0 0 12px 0; 
                    font-size: 15px; 
                    color: #0f172a; 
                    font-weight: 700;
                    border-bottom: 1px solid #cbd5e1;
                    padding-bottom: 6px;
                }
                .customer-box p { 
                    margin: 6px 0; 
                    font-size: 14px; 
                    color: #334155; 
                }
                .customer-box strong { 
                    color: #64748b; 
                    display: inline-block; 
                    width: 70px; 
                }

                /* جدول المنتجات */
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 30px; 
                }
                th { 
                    background: #0f172a; 
                    color: #ffffff; 
                    padding: 14px 10px; 
                    font-size: 13px; 
                    font-weight: 700;
                }
                td { 
                    font-size: 14px; 
                }

                /* قسم الأسفل: الـ QR بجانب صندوق الصافي النهائي */
                .bottom-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-top: 20px;
                }

                .qr-box {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                }
                .qr-box img { 
                    width: 90px; 
                    height: 90px; 
                    display: block; 
                }
                .qr-text h4 {
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    color: #0f172a;
                }
                .qr-text p {
                    margin: 0;
                    font-size: 12px;
                    color: #64748b;
                }

                .total-card { 
                    background: #f1f5f9; 
                    padding: 20px 30px; 
                    border-radius: 14px; 
                    border: 1px solid #cbd5e1; 
                    width: 300px; 
                }
                .total-line {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                    font-size: 14px;
                    color: #475569;
                }
                .total-line.final {
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 2px solid #cbd5e1;
                    font-size: 18px;
                    font-weight: 900;
                    color: #0f172a;
                }
                
                /* التذييل */
                .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    font-size: 13px; 
                    color: #94a3b8; 
                    border-top: 1px solid #e2e8f0; 
                    padding-top: 20px; 
                }
                .footer strong { 
                    color: #475569; 
                }
                
                @media print { 
                    body { padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                    .invoice-wrapper { border: none; box-shadow: none; padding: 0; max-width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-wrapper">
                <div class="invoice-header">
                    <div class="brand-info">
                        <h1>مؤسسة اليُسرى</h1>
                        <p>Al Yosra - Dental & Academic Solutions</p>
                    </div>
                    <div class="invoice-badge">
                        <h2>فاتورة مبيعات</h2>
                        <p>رقم الفاتورة: <strong>${order.order_number || order.id}</strong></p>
                        <p>تاريخ الإصدار: <strong>${dateStr}</strong></p>
                    </div>
                </div>
                
                <div class="customer-box">
                    <h3>معلومات العميل</h3>
                    <p><strong>الاسم:</strong> ${escapeHTML(order.customer_name)}</p>
                    <p><strong>الهاتف:</strong> <span style="direction:ltr; display:inline-block;">${escapeHTML(order.customer_phone)}</span></p>
                    <p><strong>العنوان:</strong> ${escapeHTML(order.customer_address)}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px; text-align: center; border-radius: 0 10px 10px 0;">#</th>
                            <th style="text-align: right;">المنتج / الخدمة</th>
                            <th style="width: 80px; text-align: center;">الكمية</th>
                            <th style="width: 110px; text-align: center;">السعر</th>
                            <th style="width: 120px; text-align: left; border-radius: 10px 0 0 10px;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <!-- القسم السفلي: QR Code على اليمين وصندوق الإجمالي على اليسار -->
                <div class="bottom-section">
                    <div class="qr-box">
                        <img src="${qrSocialUrl}" alt="QR Code">
                        <div class="qr-text">
                            <h4>تابع حساباتنا</h4>
                            <p>امسح الكود للتواصل<br>أو زيارة المتجر</p>
                        </div>
                    </div>

                    <div class="total-card">
                        <div class="total-line">
                            <span>المجموع الفرعي:</span>
                            <span>${formatMoney(order.total)}</span>
                        </div>
                        <div class="total-line">
                            <span>الشحن / خصم:</span>
                            <span>0.00 $</span>
                        </div>
                        <div class="total-line final">
                            <span>الصافي النهائي:</span>
                            <span>${formatMoney(order.total)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <strong>شكراً لثقتكم بمؤسسة اليُسرى.</strong><br>
                    نرافقكم من مقاعد الدراسة وحتى تأسيس عيادتكم الخاصة. تم إدارتها إلكترونياً.
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); }, 800);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
}


/* =========================================================
Export
========================================================= */

/* =========================================================
Export (تصدير التقارير كملفات PDF عبر الطباعة - شامل)
========================================================= */

function exportFinanceReport() {
    const printWindow = window.open('', '_blank');
    
    // 1. حسابات المبيعات والأرباح
    const sales = financeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const costs = financeOrders.reduce((sum, order) => sum + Number(order.order_cost || 0), 0);
    const grossProfit = sales - costs;
    const profitMargin = sales > 0 ? ((grossProfit / sales) * 100).toFixed(1) : 0;
    
    // 2. حسابات المصاريف وصافي الربح
    const expenses = financeExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const netProfit = grossProfit - expenses;

    // 3. حسابات رأس المال
    const movements = Array.isArray(financeCapitalMovements) ? financeCapitalMovements : [];
    const investments = movements.filter(m => m.movement_type === "investment");
    const initialCapital = investments.length ? Number(investments[investments.length - 1].amount || 0) : 0;
    const additions = investments.slice(0, -1).reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const withdrawals = movements.filter(m => m.movement_type === "withdrawal").reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const currentCapital = initialCapital + additions - withdrawals;

    // 4. التدفق النقدي
    const cashInflow = sales + initialCapital + additions;
    const cashOutflow = expenses + withdrawals;
    const netCashflow = cashInflow - cashOutflow;

    const reportHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>التقرير المالي الشامل - مؤسسة اليُسرى</title>
            <style>
                body { font-family: Tahoma, Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0f172a; }
                .header h1 { margin: 0; color: #0f172a; font-size: 26px; font-weight: 900; }
                .header p { color: #64748b; margin-top: 5px; font-size: 14px; }
                
                .section-title { font-size: 18px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin: 30px 0 15px 0; font-weight: bold; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; box-shadow: 0 0 0 1px #e2e8f0; border-radius: 8px; overflow: hidden; }
                td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                td:first-child { font-weight: bold; color: #475569; width: 60%; }
                td:last-child { text-align: left; font-family: monospace; font-size: 15px; }
                
                .highlight-row { background-color: #f1f5f9; color: #0f172a; }
                .highlight-row td:first-child { color: #0f172a; }
                .profit-positive { color: #16a34a; font-weight: bold; }
                .profit-negative { color: #dc2626; font-weight: bold; }
                
                @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>التقرير المالي والإداري الشامل - مؤسسة اليُسرى</h1>
                <p>الفترة المحاسبية: <strong>${currentStartDate || "بداية النشاط"}</strong> ـــــ <strong>${currentEndDate || "حتى تاريخه"}</strong></p>
            </div>

            <div class="section-title">1. الأداء التشغيلي (المبيعات والأرباح)</div>
            <table>
                <tbody>
                    <tr><td>إجمالي المبيعات (الإيرادات)</td><td>${formatMoney(sales)}</td></tr>
                    <tr><td>تكلفة البضاعة المباعة</td><td>${formatMoney(costs)}</td></tr>
                    <tr class="highlight-row"><td>الربح الإجمالي (Gross Profit)</td><td class="${grossProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${formatMoney(grossProfit)}</td></tr>
                    <tr><td>هامش الربح التشغيلي</td><td>%${profitMargin}</td></tr>
                    <tr><td>إجمالي المصاريف والتشغيل</td><td>${formatMoney(expenses)}</td></tr>
                    <tr class="highlight-row"><td>صافي الربح الفعلي (Net Profit)</td><td class="${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${formatMoney(netProfit)}</td></tr>
                </tbody>
            </table>

            <div class="section-title">2. حركة رأس المال (Capital)</div>
            <table>
                <tbody>
                    <tr><td>رأس المال الابتدائي</td><td>${formatMoney(initialCapital)}</td></tr>
                    <tr><td>استثمارات إضافية</td><td>${formatMoney(additions)}</td></tr>
                    <tr><td>السحوبات الشخصية / سحب رأس مال</td><td>${formatMoney(withdrawals)}</td></tr>
                    <tr class="highlight-row"><td>رأس المال الحالي العامل</td><td>${formatMoney(currentCapital)}</td></tr>
                </tbody>
            </table>

            <div class="section-title">3. السيولة والتدفق النقدي (Cashflow)</div>
            <table>
                <tbody>
                    <tr><td>النقد الداخل (مبيعات + استثمارات)</td><td>${formatMoney(cashInflow)}</td></tr>
                    <tr><td>النقد الخارج (مصاريف + سحوبات)</td><td>${formatMoney(cashOutflow)}</td></tr>
                    <tr class="highlight-row"><td>صافي التدفق النقدي للفترة</td><td class="${netCashflow >= 0 ? 'profit-positive' : 'profit-negative'}">${formatMoney(netCashflow)}</td></tr>
                </tbody>
            </table>

            <div class="section-title">4. تقييم الأصول والمخزون (Inventory)</div>
            <table>
                <tbody>
                    <tr><td>إجمالي الأصول (قيمة المخزون بالتكلفة)</td><td>${formatMoney(calculateInventoryCostValue())}</td></tr>
                    <tr><td>قيمة التصفية المتوقعة للمخزون (بسعر البيع)</td><td>${formatMoney(calculateInventoryRetailValue())}</td></tr>
                    <tr class="highlight-row"><td>الأرباح غير المحققة (بالمخزون الحالي)</td><td>${formatMoney(calculateInventoryExpectedProfit())}</td></tr>
                </tbody>
            </table>
            
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    showFinanceToast("تم تجهيز التقرير المالي الشامل. اختر 'حفظ بتنسيق PDF'.", "success");
}

function exportSalesReport() {
    const orders = getFilteredFinanceOrders();
    const printWindow = window.open('', '_blank');

    let rowsHtml = orders.map(order => {
        const total = Number(order.total || 0);
        const cost = Number(order.order_cost);
        const hasCost = Number.isFinite(cost);
        const profit = hasCost ? (total - cost) : null;
        
        return `
            <tr>
                <td><strong>${escapeHTML(order.order_number || '#' + order.id)}</strong></td>
                <td>${escapeHTML(order.customer_name || '—')}</td>
                <td>${formatMoney(total)}</td>
                <td>${hasCost ? formatMoney(cost) : '<span style="color:#ef4444;">غير مسجلة</span>'}</td>
                <td style="direction:ltr; text-align:right; font-weight:bold;">${hasCost ? formatMoney(profit) : '—'}</td>
            </tr>
        `;
    }).join('');

    const reportHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير المبيعات - مؤسسة اليُسرى</title>
            <style>
                body { font-family: Tahoma, Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #0f172a; }
                .header h1 { margin: 0; color: #0f172a; font-size: 28px; font-weight: 900; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 0 0 1px #e2e8f0; border-radius: 8px; overflow: hidden; }
                th { background: #0f172a; color: #fff; padding: 14px; text-align: right; font-size: 14px; }
                td { padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                tr:nth-child(even) { background-color: #f8fafc; }
                @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير المبيعات التفصيلي - مؤسسة اليُسرى</h1>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>اسم العميل</th>
                        <th>المبيعات</th>
                        <th>التكلفة</th>
                        <th>الربح</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    showFinanceToast("تم تجهيز تقرير المبيعات. اختر 'حفظ بتنسيق PDF'.", "success");
}


/* =========================================================
Logout
========================================================= */

function initializeFinanceLogout() {
    const logoutButton = getElement("logoutButton");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", async function () {
        logoutButton.disabled = true;
        logoutButton.textContent = "جاري تسجيل الخروج...";

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Finance logout error:", error);
            logoutButton.disabled = false;
            logoutButton.textContent = "تسجيل الخروج";
            showFinanceToast("تعذر تسجيل الخروج.", "error");
            return;
        }
        window.location.href = "admin-login.html";
    });
}


/* =========================================================
Start
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
    initializeFinanceLogout();
    await checkFinanceAccess();
});



