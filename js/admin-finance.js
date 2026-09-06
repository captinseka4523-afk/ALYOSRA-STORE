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

    const element =
        getElement(id);

    if (element) {
        element.textContent = value;
    }

}


function formatMoney(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0.00 $";
    }

    return `${number.toFixed(2)} $`;

}


function formatNumber(value) {

    const number =
        Number(value);

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


function showFinanceToast(
    message,
    type = "success"
) {

    const toast =
        getElement("financeToast");

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.remove(
        "show",
        "success",
        "error",
        "warning"
    );

    toast.classList.add(type);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    clearTimeout(
        financeToastTimer
    );

    financeToastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 3500);

}


/* =========================================================
Authentication
========================================================= */

async function checkFinanceAccess() {

    try {

        const {
            data: { session },
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {
            throw sessionError;
        }


        if (!session) {

            window.location.href =
                "admin-login.html";

            return;

        }


        const {
            data: isAdmin,
            error: adminError
        } =
            await supabaseClient.rpc("is_admin");


        if (adminError) {
            throw adminError;
        }


        if (!isAdmin) {

            await supabaseClient.auth.signOut();

            window.location.href =
                "admin-login.html";

            return;

        }


        await initializeFinancePage();


    } catch (error) {

        console.error(
            "Finance authentication error:",
            error
        );

        window.location.href =
            "admin-login.html";

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

await loadFinanceData();
}

/* =========================================================
Controls
========================================================= */

function initializeFinanceControls() {

    const periodSelect =
        getElement("financePeriod");


    if (periodSelect) {

        periodSelect.addEventListener(
            "change",
            async function () {

                currentPeriod =
                    this.value;

                updateCustomDateVisibility();


                if (
                    currentPeriod !==
                    "custom"
                ) {

                    await loadFinanceData();

                }

            }
        );

    }


    const applyDateButton =
        getElement(
            "applyDateRangeButton"
        );


    if (applyDateButton) {

        applyDateButton.addEventListener(
            "click",
            async function () {

                const start =
                    getElement(
                        "financeStartDate"
                    )?.value;


                const end =
                    getElement(
                        "financeEndDate"
                    )?.value;


                if (!start || !end) {

                    showFinanceToast(
                        "يرجى تحديد تاريخ البداية والنهاية.",
                        "warning"
                    );

                    return;

                }


                if (start > end) {

                    showFinanceToast(
                        "تاريخ البداية يجب أن يكون قبل تاريخ النهاية.",
                        "warning"
                    );

                    return;

                }


                currentStartDate =
                    start;


                currentEndDate =
                    end;


                await loadFinanceData();

            }
        );

    }


    const orderSearch =
        getElement(
            "financeOrderSearch"
        );


    if (orderSearch) {

        orderSearch.addEventListener(
            "input",
            function () {

                renderFinanceOrders();

            }
        );

    }


    const orderFilter =
        getElement(
            "financeOrderFilter"
        );


    if (orderFilter) {

        orderFilter.addEventListener(
            "change",
            function () {

                renderFinanceOrders();

            }
        );

    }


    /* =========================================================
       Inventory Search
    ========================================================== */

    const inventorySearchToggle =
        getElement(
            "financeInventorySearchToggle"
        );


    const inventorySearch =
        getElement(
            "financeInventorySearch"
        );


    const inventorySearchInput =
        getElement(
            "financeInventorySearchInput"
        );


    const inventorySearchClose =
        getElement(
            "financeInventorySearchClose"
        );


    if (
        inventorySearchToggle &&
        inventorySearch &&
        inventorySearchInput
    ) {

        inventorySearchToggle.addEventListener(
            "click",
            function () {

                inventorySearch.hidden =
                    false;

                inventorySearchInput.focus();

            }
        );

    }


    if (
        inventorySearchClose &&
        inventorySearch &&
        inventorySearchInput
    ) {

        inventorySearchClose.addEventListener(
            "click",
            function () {

                inventorySearchInput.value =
                    "";

                financeInventorySearchTerm =
                    "";

                financeInventoryCurrentPage =
                    1;

                inventorySearch.hidden =
                    true;

                inventorySearchInput.blur();

                renderFinanceInventory();

            }
        );

    }


    if (inventorySearchInput) {

        inventorySearchInput.addEventListener(
            "input",
            function () {

                financeInventorySearchTerm =
                    this.value
                        .trim()
                        .toLowerCase();

                financeInventoryCurrentPage =
                    1;

                renderFinanceInventory();

            }
        );

    }

}


    /* =========================================================
       Inventory Search Toggle
    ========================================================== */

    const inventorySearchToggle =
        getElement(
            "financeInventorySearchToggle"
        );


    const inventorySearch =
        getElement(
            "financeInventorySearch"
        );


    const inventorySearchInput =
        getElement(
            "financeInventorySearchInput"
        );


    const inventorySearchClose =
        getElement(
            "financeInventorySearchClose"
        );


    if (
        inventorySearchToggle &&
        inventorySearch &&
        inventorySearchInput
    ) {

        inventorySearchToggle.addEventListener(
            "click",
            function () {

                inventorySearch.hidden =
                    false;

                inventorySearchInput.focus();

            }
        );

    }


   if (
    inventorySearchClose &&
    inventorySearch &&
    inventorySearchInput
) {

    inventorySearchClose.addEventListener(
        "click",
        function () {

            inventorySearchInput.value =
                "";

            financeInventorySearchTerm =
                "";

            financeInventoryCurrentPage =
                1;

            inventorySearch.hidden =
                true;

            inventorySearchInput.blur();

            renderFinanceInventory();

        }
    );

}

if (inventorySearchInput) {

    inventorySearchInput.addEventListener(
        "input",
        function () {

            financeInventorySearchTerm =
                this.value
                    .trim()
                    .toLowerCase();

            financeInventoryCurrentPage =
                1;

            renderFinanceInventory();

        }
    );

}

/* =========================================================
Navigation
========================================================= */

function initializeFinanceNavigation() {

    const cards =
        document.querySelectorAll(
            ".finance-kpi-card[data-target-section]"
        );


    cards.forEach(card => {

        card.addEventListener(
            "click",
            function () {

                const target =
                    this.dataset.targetSection;

                scrollToFinanceSection(
                    target
                );

            }
        );

    });

}


function scrollToFinanceSection(
    sectionName
) {

    const section =
        getElement(
            `${sectionName}Section`
        );


    if (!section) {
        return;
    }


    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* =========================================================
Actions
========================================================= */

function initializeFinanceActions() {

    const refreshButton =
        getElement(
            "refreshFinanceButton"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                refreshButton.disabled =
                    true;


                const originalText =
                    refreshButton.textContent;


                refreshButton.textContent =
                    "جاري التحديث...";


                try {

                    await loadFinanceData();


                    showFinanceToast(
                        "تم تحديث البيانات المالية.",
                        "success"
                    );


                } catch (error) {

                    console.error(error);


                    showFinanceToast(
                        "تعذر تحديث البيانات.",
                        "error"
                    );

                } finally {

                    refreshButton.disabled =
                        false;


                    refreshButton.textContent =
                        originalText;

                }

            }
        );

    }


    const exportButton =
        getElement(
            "exportFinanceButton"
        );


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            function () {

                exportFinanceReport();

            }
        );

    }


    const salesExportButton =
        getElement(
            "salesExportButton"
        );


    if (salesExportButton) {

        salesExportButton.addEventListener(
            "click",
            function () {

                exportSalesReport();

            }
        );

    }


    const addExpenseButton =
        getElement(
            "addExpenseButton"
        );


    if (addExpenseButton) {

        addExpenseButton.addEventListener(
            "click",
            function () {

                openExpenseModal();

            }
        );

    }


    const addCapitalButton =
        getElement(
            "addCapitalMovementButton"
        );


    if (addCapitalButton) {

        addCapitalButton.addEventListener(
            "click",
            function () {

                showFinanceToast(
                    "نظام حركات رأس المال سيُفعّل بعد ربط جدول الحركات المالي في قاعدة البيانات.",
                    "warning"
                );

            }
        );

    }

}


/* =========================================================
Modals
========================================================= */

function initializeFinanceModals() {

    const closeOrderButton =
        getElement(
            "closeOrderDetailsButton"
        );


    if (closeOrderButton) {

        closeOrderButton.addEventListener(
            "click",
            closeOrderDetailsModal
        );

    }


    const closeExpenseButton =
        getElement(
            "closeExpenseModalButton"
        );


    if (closeExpenseButton) {

        closeExpenseButton.addEventListener(
            "click",
            closeExpenseModal
        );

    }


    const cancelExpenseButton =
        getElement(
            "cancelExpenseButton"
        );


    if (cancelExpenseButton) {

        cancelExpenseButton.addEventListener(
            "click",
            closeExpenseModal
        );

    }


    document.querySelectorAll(
        "[data-close-modal]"
    ).forEach(element => {

        element.addEventListener(
            "click",
            closeOrderDetailsModal
        );

    });


    document.querySelectorAll(
        "[data-close-expense-modal]"
    ).forEach(element => {

        element.addEventListener(
            "click",
            closeExpenseModal
        );

    });


    const saveCostButton =
        getElement(
            "saveOrderCostButton"
        );


    if (saveCostButton) {

        saveCostButton.addEventListener(
            "click",
            saveOrderCost
        );

    }


    const printInvoiceButton =
        getElement(
            "printInvoiceButton"
        );


    if (printInvoiceButton) {

        printInvoiceButton.addEventListener(
            "click",
            handlePrintInvoice
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeOrderDetailsModal();

            closeExpenseModal();

        }
    );

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

        loadExpenses()

    ]);


    const orderIds =
        financeOrders.map(
            order => order.id
        );


    await loadOrderItems(
        orderIds
    );


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

    const periodSelect =
        getElement(
            "financePeriod"
        );


    if (periodSelect) {

        currentPeriod =
            periodSelect.value ||
            "month";

    }


    updateDateRange();

    updateCustomDateVisibility();

}


function updateDateRange() {

    if (
        currentPeriod ===
        "custom"
    ) {

        const start =
            getElement(
                "financeStartDate"
            )?.value;


        const end =
            getElement(
                "financeEndDate"
            )?.value;


        currentStartDate =
            start || null;


        currentEndDate =
            end || null;


        return;

    }


    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    let start;

    let end;


    switch (currentPeriod) {

        case "today":

            start =
                new Date(today);

            end =
                new Date(today);

            break;


        case "yesterday":

            start =
                new Date(today);

            start.setDate(
                start.getDate() - 1
            );

            end =
                new Date(start);

            break;


        case "week": {

            const day =
                today.getDay();


            const difference =
                day === 0
                    ? 6
                    : day - 1;


            start =
                new Date(today);


            start.setDate(
                start.getDate() -
                difference
            );


            end =
                new Date(today);

            break;

        }


        case "last-week": {

            const day =
                today.getDay();


            const difference =
                day === 0
                    ? 6
                    : day - 1;


            end =
                new Date(today);


            end.setDate(
                end.getDate() -
                difference -
                1
            );


            start =
                new Date(end);


            start.setDate(
                start.getDate() - 6
            );


            break;

        }


        case "month":

            start =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );


            end =
                new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0
                );

            break;


        case "last-month":

            start =
                new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1
                );


            end =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0
                );

            break;


        case "year":

            start =
                new Date(
                    today.getFullYear(),
                    0,
                    1
                );


            end =
                new Date(
                    today.getFullYear(),
                    11,
                    31
                );

            break;


        default:

            start =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );


            end =
                new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0
                );

            break;

    }


    currentStartDate =
        formatDateForDatabase(
            start
        );


    currentEndDate =
        formatDateForDatabase(
            end
        );

}


function formatDateForDatabase(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


function updateCustomDateVisibility() {

    const container =
        getElement(
            "customDateRange"
        );


    if (!container) {
        return;
    }


    container.hidden =
        currentPeriod !==
        "custom";

}


/* =========================================================
Orders
========================================================= */

async function loadDeliveredOrders() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("orders")
            .select("*")
            .eq(
                "status",
                "تم التسليم"
            )
            .order(
                "id",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    financeOrders =
        Array.isArray(data)
            ? data
            : [];


    /*
       Historical order dates are not currently
       represented by a dedicated created_at field
       in the known schema.

       Therefore, until an actual order date column
       exists, delivered orders remain available for
       accounting regardless of the selected date.
    */

}


/* =========================================================
Order Items
========================================================= */

async function loadOrderItems(
    orderIds
) {

    if (!orderIds.length) {

        financeOrderItems = [];

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("order_items")
            .select("*")
            .in(
                "order_id",
                orderIds
            );


    if (error) {
        throw error;
    }


    financeOrderItems =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
Products
========================================================= */

async function loadProducts() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("products")
            .select("*")
            .order(
                "id",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    financeProducts =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
Product Costs
========================================================= */

async function loadProductCosts() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("product_costs")
            .select(
                "product_id, purchase_cost"
            );


    if (error) {
        throw error;
    }


    financeProductCosts = {};


    (data || []).forEach(
        cost => {

            financeProductCosts[
                String(
                    cost.product_id
                )
            ] =
                Number(
                    cost.purchase_cost
                );

        }
    );

}


/* =========================================================
Expenses
========================================================= */

async function loadExpenses() {

    /*
       The expenses table has not yet been
       added to the Supabase schema.

       Keep the state empty instead of inventing
       financial data.
    */

    financeExpenses = [];

}


/* =========================================================
Financial Calculations
========================================================= */

function calculateFinanceMetrics() {

    const sales =
        financeOrders.reduce(
            (sum, order) => {

                return sum +
                    Number(
                        order.total || 0
                    );

            },
            0
        );


    const ordersWithCost =
        financeOrders.filter(
            order =>
                Number.isFinite(
                    Number(
                        order.order_cost
                    )
                )
        );


    const costs =
        ordersWithCost.reduce(
            (sum, order) => {

                return sum +
                    Number(
                        order.order_cost || 0
                    );

            },
            0
        );


    const grossProfit =
        ordersWithCost.length > 0
            ? sales - costs
            : 0;


    const expenses =
        financeExpenses.reduce(
            (sum, expense) => {

                return sum +
                    Number(
                        expense.amount || 0
                    );

            },
            0
        );


    const netProfit =
        ordersWithCost.length > 0
            ? grossProfit - expenses
            : 0;


    const deliveredCount =
        financeOrders.length;


    const averageOrderValue =
        deliveredCount
            ? sales / deliveredCount
            : 0;


    const profitMargin =
        sales > 0 &&
        ordersWithCost.length > 0
            ? (
                grossProfit /
                sales
            ) * 100
            : 0;


    let soldItemsCount = 0;


    financeOrderItems.forEach(
        item => {

            soldItemsCount +=
                Number(
                    item.quantity || 0
                );

        }
    );


    setText(
        "totalSales",
        formatMoney(sales)
    );


    setText(
        "totalCosts",
        formatMoney(costs)
    );


    setText(
        "grossProfit",
        ordersWithCost.length > 0
            ? formatMoney(grossProfit)
            : "غير مكتمل"
    );


    setText(
        "totalExpenses",
        formatMoney(expenses)
    );


    setText(
        "netProfit",
        ordersWithCost.length > 0
            ? formatMoney(netProfit)
            : "غير مكتمل"
    );


    const inventoryStats =
        calculateInventoryStats();


    setText(
        "inventoryValue",
        formatMoney(
            inventoryStats.costValue
        )
    );


    setText(
        "deliveredOrdersCount",
        formatNumber(
            deliveredCount
        )
    );


    setText(
        "averageOrderValue",
        formatMoney(
            averageOrderValue
        )
    );


    setText(
        "profitMargin",
        ordersWithCost.length > 0
            ? `${profitMargin.toFixed(1)}%`
            : "غير مكتمل"
    );


    setText(
        "soldItemsCount",
        formatNumber(
            soldItemsCount
        )
    );

}


/* =========================================================
Inventory Calculations
========================================================= */

function calculateInventoryCostValue() {

    return financeProducts.reduce(
        (sum, product) => {

            const quantity =
                Number(
                    product.quantity || 0
                );


            const purchaseCost =
                Number(
                    financeProductCosts[
                        String(product.id)
                    ]
                );


            if (
                !Number.isFinite(
                    purchaseCost
                ) ||
                purchaseCost <= 0
            ) {

                return sum;

            }


            return sum +
                (
                    quantity *
                    purchaseCost
                );

        },
        0
    );

}


function calculateInventoryRetailValue() {

    return financeProducts.reduce(
        (sum, product) => {

            const quantity =
                Number(
                    product.quantity ||
                    0
                );


            const price =
                Number(
                    product.price ||
                    0
                );


            return sum +
                (
                    quantity *
                    price
                );

        },
        0
    );

}


function calculateInventoryExpectedProfit() {

    const retailValue =
        calculateInventoryRetailValue();


    const costValue =
        calculateInventoryCostValue();


    return retailValue -
        costValue;

}


function calculateInventoryStats() {

    const productCount =
        financeProducts.length;


    const costValue =
        calculateInventoryCostValue();


    const retailValue =
        calculateInventoryRetailValue();


    const expectedProfit =
        calculateInventoryExpectedProfit();


    let lowStock = 0;

    let outOfStock = 0;


    financeProducts.forEach(
        product => {

            const quantity =
                Number(
                    product.quantity ||
                    0
                );


            if (
                quantity <= 0
            ) {

                outOfStock++;

            }

            else if (
                quantity <= 5
            ) {

                lowStock++;

            }

        }
    );


    return {

        productCount,

        costValue,

        retailValue,

        expectedProfit,

        lowStock,

        outOfStock

    };

}


/* =========================================================
Orders Table
========================================================= */

function getFilteredFinanceOrders() {

    const searchValue =
        getElement(
            "financeOrderSearch"
        )
            ?.value
            .trim()
            .toLowerCase() || "";


    const filter =
        getElement(
            "financeOrderFilter"
        )
            ?.value ||
        "all";


    return financeOrders.filter(
        order => {

            const orderNumber =
                String(
                    order.order_number ||
                    ""
                )
                    .toLowerCase();


            const customerName =
                String(
                    order.customer_name ||
                    ""
                )
                    .toLowerCase();


            const matchesSearch =
                !searchValue ||
                orderNumber.includes(
                    searchValue
                ) ||
                customerName.includes(
                    searchValue
                );


            if (!matchesSearch) {
                return false;
            }


            const cost =
                Number(
                    order.order_cost
                );


            const hasCost =
                Number.isFinite(
                    cost
                );


            if (
                filter ===
                "cost-missing" &&
                hasCost
            ) {

                return false;

            }


            if (
                filter ===
                "cost-entered" &&
                !hasCost
            ) {

                return false;

            }


            if (
                filter ===
                "profitable"
            ) {

                if (!hasCost) {
                    return false;
                }


                return (
                    Number(
                        order.total || 0
                    ) -
                    cost
                ) > 0;

            }


            if (
                filter ===
                "loss"
            ) {

                if (!hasCost) {
                    return false;
                }


                return (
                    Number(
                        order.total || 0
                    ) -
                    cost
                ) < 0;

            }


            return true;

        }
    );

}


function renderFinanceOrders() {

    const tbody =
        getElement(
            "financeOrdersTableBody"
        );


    if (!tbody) {
        return;
    }


    const orders =
        getFilteredFinanceOrders();


    if (!orders.length) {

        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="8">
                    لا توجد طلبات مطابقة للبحث أو الفلتر الحالي.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        orders.map(
            order => {

                const total =
                    Number(
                        order.total || 0
                    );


                const cost =
                    Number(
                        order.order_cost
                    );


                const hasCost =
                    Number.isFinite(
                        cost
                    );


                const profit =
                    hasCost
                        ? total - cost
                        : null;


                let profitHTML =
                    "—";


                if (hasCost) {

                    profitHTML = `
                        <span class="${
                            profit >= 0
                                ? "finance-positive"
                                : "finance-negative"
                        }">
                            ${formatMoney(
                                profit
                            )}
                        </span>
                    `;

                }


                const costHTML =
                    hasCost
                        ? formatMoney(cost)
                        : `
                            <span class="finance-warning-text">
                                ⚠️ غير مسجلة
                            </span>
                        `;


                const statusHTML =
                    hasCost
                        ? `
                            <span class="finance-status success">
                                مسجلة
                            </span>
                        `
                        : `
                            <span class="finance-status warning">
                                تحتاج تكلفة
                            </span>
                        `;


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    order.order_number ||
                                    `#${order.id}`
                                )}
                            </strong>
                        </td>

                        <td>
                            —
                        </td>

                        <td>
                            ${escapeHTML(
                                order.customer_name ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                total
                            )}
                        </td>

                        <td>
                            ${costHTML}
                        </td>

                        <td>
                            ${profitHTML}
                        </td>

                        <td>
                            ${statusHTML}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="finance-table-action"
                                data-order-id="${order.id}"
                            >
                                التفاصيل
                            </button>

                        </td>

                    </tr>
                `;

            }
        )
        .join("");


    tbody.querySelectorAll(
        "[data-order-id]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const orderId =
                        Number(
                            this.dataset.orderId
                        );


                    openOrderDetails(
                        orderId
                    );

                }
            );

        }
    );

}
/* =========================================================
Order Details
========================================================= */

async function openOrderDetails(orderId) {

    const order =
        financeOrders.find(
            item =>
                Number(item.id) ===
                orderId
        );


    if (!order) {

        showFinanceToast(
            "تعذر العثور على الطلب.",
            "error"
        );

        return;

    }


    selectedFinanceOrder =
        order;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("order_items")
            .select("*")
            .eq(
                "order_id",
                orderId
            )
            .order(
                "id",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Order items error:",
            error
        );


        showFinanceToast(
            "تعذر تحميل منتجات الطلب.",
            "error"
        );

        return;

    }


    selectedFinanceOrderItems =
        Array.isArray(data)
            ? data
            : [];


    populateOrderDetailsModal();


    const modal =
        getElement(
            "orderDetailsModal"
        );


    if (modal) {

        modal.hidden =
            false;


        requestAnimationFrame(
            () => {

                modal.classList.add(
                    "show"
                );

            }
        );

    }

}


/* =========================================================
Populate Order Details Modal
========================================================= */

function populateOrderDetailsModal() {

    const order =
        selectedFinanceOrder;


    if (!order) {
        return;
    }


    setText(
        "orderDetailsTitle",
        `الطلب ${
            order.order_number ||
            `#${order.id}`
        }`
    );


    setText(
        "modalCustomerName",
        order.customer_name ||
        "—"
    );


    setText(
        "modalCustomerPhone",
        order.customer_phone ||
        "—"
    );


    setText(
        "modalCustomerAddress",
        order.customer_address ||
        "—"
    );


    setText(
        "modalOrderNumber",
        order.order_number ||
        `#${order.id}`
    );


    /*
       There is currently no dedicated order
       creation-date column in the known schema.
    */

    setText(
        "modalOrderDate",
        "غير متوفر"
    );


    const total =
        Number(
            order.total ||
            0
        );


    const cost =
        Number(
            order.order_cost
        );


    const hasCost =
        Number.isFinite(
            cost
        );


    setText(
        "modalSaleTotal",
        formatMoney(total)
    );


    setText(
        "modalOrderCost",
        hasCost
            ? formatMoney(cost)
            : "غير مسجلة"
    );


    if (hasCost) {

        const profit =
            total -
            cost;


        const margin =
            total > 0
                ? (
                    profit /
                    total
                ) * 100
                : 0;


        setText(
            "modalOrderProfit",
            formatMoney(profit)
        );


        setText(
            "modalProfitMargin",
            `${margin.toFixed(1)}%`
        );

    } else {

        setText(
            "modalOrderProfit",
            "غير مكتمل"
        );


        setText(
            "modalProfitMargin",
            "غير مكتمل"
        );

    }


    const costInput =
        getElement(
            "orderCostInput"
        );


    if (costInput) {

        costInput.value =
            hasCost
                ? cost
                : "";

    }


    renderOrderItems();


    setText(
        "modalProductsCount",
        `${selectedFinanceOrderItems.length} منتج`
    );

}


/* =========================================================
Order Items Rendering
========================================================= */

function renderOrderItems() {

    const tbody =
        getElement(
            "modalOrderItemsBody"
        );


    if (!tbody) {
        return;
    }


    if (
        !selectedFinanceOrderItems.length
    ) {

        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="4">
                    لا توجد منتجات مرتبطة بهذا الطلب.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        selectedFinanceOrderItems.map(
            item => {

                const quantity =
                    Number(
                        item.quantity ||
                        0
                    );


                const unitPrice =
                    Number(
                        item.unit_price ||
                        0
                    );


                const subtotal =
                    Number(
                        item.subtotal ??
                        unitPrice *
                        quantity
                    );


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                item.product_name ||
                                "منتج"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                quantity
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                unitPrice
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                subtotal
                            )}
                        </td>

                    </tr>
                `;

            }
        )
        .join("");

}


/* =========================================================
Close Order Details Modal
========================================================= */

function closeOrderDetailsModal() {

    const modal =
        getElement(
            "orderDetailsModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    setTimeout(
        () => {

            modal.hidden =
                true;

        },
        180
    );

}


/* =========================================================
Order Cost
========================================================= */

async function saveOrderCost() {

    if (!selectedFinanceOrder) {

        showFinanceToast(
            "لم يتم تحديد طلب.",
            "error"
        );

        return;

    }


    const input =
        getElement(
            "orderCostInput"
        );


    if (!input) {
        return;
    }


    const rawValue =
        input.value.trim();


    if (rawValue === "") {

        showFinanceToast(
            "يرجى إدخال تكلفة الطلب.",
            "warning"
        );

        return;

    }


    const cost =
        Number(rawValue);


    if (
        !Number.isFinite(cost) ||
        cost < 0
    ) {

        showFinanceToast(
            "أدخل تكلفة صحيحة.",
            "warning"
        );

        return;

    }


    const saveButton =
        getElement(
            "saveOrderCostButton"
        );


    if (saveButton) {

        saveButton.disabled =
            true;


        saveButton.textContent =
            "جاري الحفظ...";

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("orders")
                .update({
                    order_cost: cost
                })
                .eq(
                    "id",
                    selectedFinanceOrder.id
                );


        if (error) {
            throw error;
        }


        selectedFinanceOrder.order_cost =
            cost;


        const index =
            financeOrders.findIndex(
                order =>
                    Number(
                        order.id
                    ) ===
                    Number(
                        selectedFinanceOrder.id
                    )
            );


        if (index !== -1) {

            financeOrders[
                index
            ].order_cost =
                cost;

        }


        populateOrderDetailsModal();

        calculateFinanceMetrics();

        renderFinanceOrders();


        showFinanceToast(
            "تم حفظ تكلفة الطلب بنجاح.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save order cost error:",
            error
        );


        showFinanceToast(
            "تعذر حفظ تكلفة الطلب. تأكد من إضافة حقل order_cost إلى جدول orders.",
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;


            saveButton.textContent =
                "حفظ التكلفة";

        }

    }

}


/* =========================================================
Expenses
========================================================= */

function openExpenseModal() {

    const modal =
        getElement(
            "expenseModal"
        );


    if (!modal) {
        return;
    }


    const form =
        getElement(
            "expenseForm"
        );


    if (form) {
        form.reset();
    }


    const dateInput =
        getElement(
            "expenseDate"
        );


    if (dateInput) {

        dateInput.value =
            formatDateForDatabase(
                new Date()
            );

    }


    modal.hidden =
        false;


    requestAnimationFrame(
        () => {

            modal.classList.add(
                "show"
            );

        }
    );

}


function closeExpenseModal() {

    const modal =
        getElement(
            "expenseModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    setTimeout(
        () => {

            modal.hidden =
                true;

        },
        180
    );

}


function initializeFinanceForms() {

    const expenseForm =
        getElement(
            "expenseForm"
        );


    if (!expenseForm) {
        return;
    }


    expenseForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            await saveExpense();

        }
    );

}


async function saveExpense() {

    /*
       The expenses table has not yet been added.

       Do not pretend to save financial data locally.
    */

    showFinanceToast(
        "قسم المصروفات جاهز، لكن حفظ المصروفات سيُفعّل بعد إنشاء جدول المصروفات في Supabase.",
        "warning"
    );

}


/* =========================================================
Expenses Rendering
========================================================= */

function renderFinanceExpenses() {

    const tbody =
        getElement(
            "financeExpensesTableBody"
        );


    if (!tbody) {
        return;
    }


    if (!financeExpenses.length) {

        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="5">
                    لا توجد مصروفات مسجلة للفترة الحالية.
                </td>
            </tr>
        `;


        setText(
            "expensesPeriodTotal",
            formatMoney(0)
        );


        setText(
            "expensesCount",
            "0"
        );


        setText(
            "averageExpense",
            formatMoney(0)
        );


        return;

    }


    const total =
        financeExpenses.reduce(
            (sum, expense) =>
                sum +
                Number(
                    expense.amount ||
                    0
                ),
            0
        );


    const average =
        total /
        financeExpenses.length;


    setText(
        "expensesPeriodTotal",
        formatMoney(total)
    );


    setText(
        "expensesCount",
        formatNumber(
            financeExpenses.length
        )
    );


    setText(
        "averageExpense",
        formatMoney(average)
    );


    tbody.innerHTML =
        financeExpenses.map(
            expense => {

                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                expense.date ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                expense.category ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                expense.description ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                expense.amount
                            )}
                        </td>

                        <td>
                            —
                        </td>

                    </tr>
                `;

            }
        )
        .join("");

}


/* =========================================================
Inventory Rendering
========================================================= */

function renderFinanceInventory() {

    const tbody =
        getElement(
            "financeInventoryTableBody"
        );


    if (!tbody) {
        return;
    }


    const stats =
        calculateInventoryStats();


    setText(
        "inventoryProductsCount",
        formatNumber(
            stats.productCount
        )
    );


    setText(
        "inventoryCostValue",
        formatMoney(
            stats.costValue
        )
    );


    setText(
        "inventoryRetailValue",
        formatMoney(
            stats.retailValue
        )
    );


    setText(
        "inventoryExpectedProfit",
        formatMoney(
            stats.expectedProfit
        )
    );


    setText(
        "lowStockProductsCount",
        formatNumber(
            stats.lowStock
        )
    );


    setText(
        "outOfStockProductsCount",
        formatNumber(
            stats.outOfStock
        )
    );


    /* =========================================================
       Filter Inventory
    ========================================================== */

    const searchTerm =
        financeInventorySearchTerm
            .trim()
            .toLowerCase();


    const filteredProducts =
        searchTerm
            ? financeProducts.filter(
                product => {

                    const productName =
                        String(
                            product.name ||
                            ""
                        ).toLowerCase();


                    const productCode =
                        String(
                            product.product_code ||
                            ""
                        ).toLowerCase();


                    return (
                        productName.includes(
                            searchTerm
                        ) ||
                        productCode.includes(
                            searchTerm
                        )
                    );

                }
            )
            : financeProducts;


    /* =========================================================
       Empty Inventory
    ========================================================== */

    if (!financeProducts.length) {

        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="7">
                    لا توجد منتجات في قاعدة البيانات.
                </td>
            </tr>
        `;

        renderFinanceInventoryPagination(
            0
        );

        return;

    }


    /* =========================================================
       No Search Results
    ========================================================== */

    if (!filteredProducts.length) {

        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="7">
                    لا توجد نتائج مطابقة للبحث.
                </td>
            </tr>
        `;

        renderFinanceInventoryPagination(
            0
        );

        return;

    }


    /* =========================================================
       Pagination
    ========================================================== */

    const totalPages =
        Math.ceil(
            filteredProducts.length /
            FINANCE_INVENTORY_PER_PAGE
        );


    if (
        financeInventoryCurrentPage >
        totalPages
    ) {

        financeInventoryCurrentPage =
            totalPages;

    }


    if (
        financeInventoryCurrentPage < 1
    ) {

        financeInventoryCurrentPage =
            1;

    }


    const startIndex =
        (
            financeInventoryCurrentPage -
            1
        ) *
        FINANCE_INVENTORY_PER_PAGE;


    const endIndex =
        startIndex +
        FINANCE_INVENTORY_PER_PAGE;


    const currentProducts =
        filteredProducts.slice(
            startIndex,
            endIndex
        );


    tbody.innerHTML =
        currentProducts.map(
            product => {

                const quantity =
                    Number(
                        product.quantity ||
                        0
                    );


                const price =
                    Number(
                        product.price ||
                        0
                    );


                const purchaseCost =
                    Number(
                        financeProductCosts[
                            String(
                                product.id
                            )
                        ]
                    );


                const retailValue =
                    quantity *
                    price;


                const costValue =
                    Number.isFinite(
                        purchaseCost
                    ) &&
                    purchaseCost > 0
                        ? quantity *
                            purchaseCost
                        : null;


                const expectedProfit =
                    costValue !== null
                        ? retailValue -
                            costValue
                        : null;


                let status =
                    "متوفر";


                if (
                    quantity <= 0
                ) {

                    status =
                        "نافد";

                }

                else if (
                    quantity <= 5
                ) {

                    status =
                        "منخفض";

                }


                const purchaseCostHTML =
                    costValue !== null
                        ? formatMoney(
                            purchaseCost
                        )
                        : `
                            <span class="finance-warning-text">
                                ⚠️ غير مسجلة
                            </span>
                        `;


                const costValueHTML =
                    costValue !== null
                        ? formatMoney(
                            costValue
                        )
                        : "—";


                const expectedProfitHTML =
                    expectedProfit !== null
                        ? `
                            <span class="${
                                expectedProfit >= 0
                                    ? "finance-positive"
                                    : "finance-negative"
                            }">
                                ${formatMoney(
                                    expectedProfit
                                )}
                            </span>
                        `
                        : "—";


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                product.name ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                quantity
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                price
                            )}
                        </td>

                        <td>
                            ${purchaseCostHTML}
                        </td>

                        <td>
                            ${costValueHTML}
                        </td>

                        <td>
                            ${expectedProfitHTML}
                        </td>

                        <td>
                            <span class="finance-status ${
                                quantity <= 0
                                    ? "danger"
                                    : quantity <= 5
                                        ? "warning"
                                        : "success"
                            }">
                                ${status}
                            </span>
                        </td>

                    </tr>
                `;

            }
        )
        .join("");


    renderFinanceInventoryPagination(
        filteredProducts.length
    );

}

function renderFinanceInventoryPagination(
    totalProducts =
        financeProducts.length
) {

    const pagination =
        getElement(
            "financeInventoryPagination"
        );


    if (!pagination) {
        return;
    }


    const totalPages =
        Math.ceil(
            totalProducts /
            FINANCE_INVENTORY_PER_PAGE
        );


    if (
        totalProducts <=
        FINANCE_INVENTORY_PER_PAGE
    ) {

        pagination.innerHTML = "";

        return;

    }


    const currentPage =
        financeInventoryCurrentPage;


    const startItem =
        (
            currentPage -
            1
        ) *
        FINANCE_INVENTORY_PER_PAGE +
        1;


    const endItem =
        Math.min(
            currentPage *
                FINANCE_INVENTORY_PER_PAGE,
            totalProducts
        );


    let pagesHTML = "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        pagesHTML += `
            <button
                type="button"
                class="finance-pagination-page ${
                    page === currentPage
                        ? "active"
                        : ""
                }"
                data-page="${page}"
            >
                ${page}
            </button>
        `;

    }


    pagination.innerHTML = `

        <div class="finance-pagination-info">
            عرض
            ${formatNumber(startItem)}
            -
            ${formatNumber(endItem)}
            من
            ${formatNumber(totalProducts)}
            منتجًا
        </div>

        <div class="finance-pagination-controls">

            <button
                type="button"
                class="finance-pagination-arrow"
                data-page-action="previous"
                ${
                    currentPage === 1
                        ? "disabled"
                        : ""
                }
            >
                السابق
            </button>

            <div class="finance-pagination-pages">
                ${pagesHTML}
            </div>

            <button
                type="button"
                class="finance-pagination-arrow"
                data-page-action="next"
                ${
                    currentPage === totalPages
                        ? "disabled"
                        : ""
                }
            >
                التالي
            </button>

        </div>

    `;


    pagination
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        const selectedPage =
                            Number(
                                this.dataset.page
                            );


                        if (
                            selectedPage ===
                            financeInventoryCurrentPage
                        ) {

                            return;

                        }


                        financeInventoryCurrentPage =
                            selectedPage;


                        renderFinanceInventory();

                    }
                );

            }
        );


    const previousButton =
        pagination.querySelector(
            '[data-page-action="previous"]'
        );


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function () {

                if (
                    financeInventoryCurrentPage <=
                    1
                ) {

                    return;

                }


                financeInventoryCurrentPage--;


                renderFinanceInventory();

            }
        );

    }


    const nextButton =
        pagination.querySelector(
            '[data-page-action="next"]'
        );


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function () {

                if (
                    financeInventoryCurrentPage >=
                    totalPages
                ) {

                    return;

                }


                financeInventoryCurrentPage++;


                renderFinanceInventory();

            }
        );

    }

}

function setupFinanceInventoryPaginationContainer() {

    const tableBody =
        document.getElementById(
            "financeInventoryTableBody"
        );

    if (!tableBody) return;

    const table =
        tableBody.closest("table");

    if (!table) return;

    if (
        document.getElementById(
            "financeInventoryPagination"
        )
    ) {
        return;
    }

    const pagination =
        document.createElement("div");

    pagination.id =
        "financeInventoryPagination";

    pagination.className =
        "finance-inventory-pagination";

    const tableContainer =
        table.parentElement;

    if (
        tableContainer &&
        tableContainer.parentElement
    ) {

        tableContainer.parentElement.insertBefore(
            pagination,
            tableContainer.nextSibling
        );

    }

}

/* =========================================================
Capital
========================================================= */

function renderCapitalSummary() {

    const initialCapital =
        capitalMovements.reduce(
            (sum, movement) => {

                if (
                    movement.type ===
                    "initial"
                ) {

                    return sum +
                        Number(
                            movement.amount ||
                            0
                        );

                }

                return sum;

            },
            0
        );


    const additions =
        capitalMovements.reduce(
            (sum, movement) => {

                if (
                    movement.type ===
                    "addition"
                ) {

                    return sum +
                        Number(
                            movement.amount ||
                            0
                        );

                }

                return sum;

            },
            0
        );


    const withdrawals =
        capitalMovements.reduce(
            (sum, movement) => {

                if (
                    movement.type ===
                    "withdrawal"
                ) {

                    return sum +
                        Number(
                            movement.amount ||
                            0
                        );

                }

                return sum;

            },
            0
        );


    const current =
        initialCapital +
        additions -
        withdrawals;


    setText(
        "initialCapital",
        initialCapital
            ? formatMoney(
                initialCapital
            )
            : "غير مسجل"
    );


    setText(
        "capitalAdditions",
        additions
            ? formatMoney(
                additions
            )
            : "0.00 $"
    );


    setText(
        "capitalWithdrawals",
        withdrawals
            ? formatMoney(
                withdrawals
            )
            : "0.00 $"
    );


    setText(
        "currentCapital",
        current
            ? formatMoney(
                current
            )
            : "غير مسجل"
    );


    const tbody =
        getElement(
            "capitalMovementsTableBody"
        );


    if (!tbody) {
        return;
    }


    if (
        !capitalMovements.length
    ) {

        tbody.innerHTML = `
            <tr class="finance-empty-row">
                <td colspan="5">
                    لم يتم ربط حركات رأس المال بقاعدة البيانات بعد.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        capitalMovements.map(
            movement => {

                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                movement.date ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                movement.type ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                movement.amount
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                movement.description ||
                                "—"
                            )}
                        </td>

                        <td>
                            —
                        </td>

                    </tr>
                `;

            }
        )
        .join("");

}


/* =========================================================
Cash Flow
========================================================= */

function renderCashflowSummary() {

    const sales =
        financeOrders.reduce(
            (sum, order) =>
                sum +
                Number(
                    order.total ||
                    0
                ),
            0
        );


    const expenses =
        financeExpenses.reduce(
            (sum, expense) =>
                sum +
                Number(
                    expense.amount ||
                    0
                ),
            0
        );


    const inflow =
        sales;


    const outflow =
        expenses;


    const net =
        inflow -
        outflow;


    setText(
        "cashInflow",
        formatMoney(inflow)
    );


    setText(
        "cashOutflow",
        formatMoney(outflow)
    );


    setText(
        "netCashflow",
        formatMoney(net)
    );


    setText(
        "currentCashBalance",
        "غير مكتمل"
    );


    const tbody =
        getElement(
            "cashflowTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `
        <tr class="finance-empty-row">
            <td colspan="5">
                سجل التدفق النقدي التفصيلي سيُفعّل بعد ربط مصادر الحركة النقدية.
            </td>
        </tr>
    `;

}


/* =========================================================
Analytics
========================================================= */

function renderAnalyticsSummary() {

    const productSales =
        {};


    financeOrderItems.forEach(
        item => {

            const name =
                item.product_name ||
                "منتج";


            const quantity =
                Number(
                    item.quantity ||
                    0
                );


            if (
                !productSales[name]
            ) {

                productSales[name] =
                    0;

            }


            productSales[name] +=
                quantity;

        }
    );


    const bestProduct =
        Object.entries(
            productSales
        )
            .sort(
                (a, b) =>
                    b[1] -
                    a[1]
            )[0];


    if (bestProduct) {

        setText(
            "bestSellingProduct",
            bestProduct[0]
        );


        setText(
            "bestSellingProductSales",
            `${formatNumber(
                bestProduct[1]
            )} قطعة مباعة`
        );

    }

    else {

        setText(
            "bestSellingProduct",
            "—"
        );


        setText(
            "bestSellingProductSales",
            "لا توجد بيانات بعد"
        );

    }


    setText(
        "bestSalesDay",
        "غير متوفر"
    );


    setText(
        "bestSalesDayValue",
        "تحتاج قاعدة البيانات إلى تاريخ للطلبات"
    );


    setText(
        "highestExpenseCategory",
        "—"
    );


    setText(
        "highestExpenseCategoryValue",
        "لا توجد مصروفات مسجلة"
    );


    const ordersWithCost =
        financeOrders.filter(
            order =>
                Number.isFinite(
                    Number(
                        order.order_cost
                    )
                )
        );


    if (
        ordersWithCost.length
    ) {

        const totalMargin =
            ordersWithCost.reduce(
                (sum, order) => {

                    const total =
                        Number(
                            order.total ||
                            0
                        );


                    const cost =
                        Number(
                            order.order_cost ||
                            0
                        );


                    if (!total) {
                        return sum;
                    }


                    return sum +
                        (
                            (
                                total -
                                cost
                            ) /
                            total
                        ) * 100;

                },
                0
            );


        const averageMargin =
            totalMargin /
            ordersWithCost.length;


        setText(
            "averageProfitMargin",
            `${averageMargin.toFixed(1)}%`
        );

    }

    else {

        setText(
            "averageProfitMargin",
            "غير مكتمل"
        );

    }

}


/* =========================================================
Period Label
========================================================= */

function updateFinancePeriodLabel() {

    const label =
        getElement(
            "financePeriodLabel"
        );


    if (!label) {
        return;
    }


    const select =
        getElement(
            "financePeriod"
        );


    if (
        currentPeriod ===
        "custom"
    ) {

        label.textContent =
            `${currentStartDate || "—"} → ${
                currentEndDate || "—"
            }`;


        return;

    }


    if (select) {

        const selected =
            select.options[
                select.selectedIndex
            ];


        label.textContent =
            selected?.textContent ||
            "الفترة الحالية";

    }

}


/* =========================================================
Invoice
========================================================= */

function handlePrintInvoice() {

    if (!selectedFinanceOrder) {

        showFinanceToast(
            "لم يتم تحديد طلب.",
            "warning"
        );

        return;

    }


    /*
       The final invoice system will be
       implemented separately with its own
       professional printable layout,
       invoice number, QR codes and
       sharing options.
    */

    showFinanceToast(
        "نظام الفاتورة جاهز للربط وسيتم بناء تصميم الفاتورة النهائي في مرحلة الفواتير.",
        "warning"
    );

}


/* =========================================================
Export
========================================================= */

function exportFinanceReport() {

    const report = {

        period: {

            start:
                currentStartDate,

            end:
                currentEndDate

        },


        sales:
            financeOrders.reduce(
                (sum, order) =>
                    sum +
                    Number(
                        order.total ||
                        0
                    ),
                0
            ),


        orders:
            financeOrders.length,


        expenses:
            financeExpenses.reduce(
                (sum, expense) =>
                    sum +
                    Number(
                        expense.amount ||
                        0
                    ),
                0
            ),


        inventoryCostValue:
            calculateInventoryCostValue(),


        inventoryRetailValue:
            calculateInventoryRetailValue(),


        inventoryExpectedProfit:
            calculateInventoryExpectedProfit()

    };


    downloadJSON(
        report,
        "al-yosra-financial-report.json"
    );


    showFinanceToast(
        "تم تصدير التقرير المالي.",
        "success"
    );

}


function exportSalesReport() {

    const orders =
        getFilteredFinanceOrders();


    const rows =
        orders.map(
            order => {

                const total =
                    Number(
                        order.total ||
                        0
                    );


                const cost =
                    Number(
                        order.order_cost
                    );


                return {

                    order_number:
                        order.order_number ||
                        `#${order.id}`,


                    customer:
                        order.customer_name ||
                        "",


                    sales:
                        total,


                    cost:
                        Number.isFinite(
                            cost
                        )
                            ? cost
                            : "",


                    profit:
                        Number.isFinite(
                            cost
                        )
                            ? total -
                                cost
                            : ""

                };

            }
        );


    downloadJSON(
        rows,
        "al-yosra-sales-report.json"
    );


    showFinanceToast(
        "تم تصدير تقرير المبيعات.",
        "success"
    );

}


function downloadJSON(
    data,
    filename
) {

    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
Logout
========================================================= */

function initializeFinanceLogout() {

    const logoutButton =
        getElement(
            "logoutButton"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        async function () {

            logoutButton.disabled =
                true;


            logoutButton.textContent =
                "جاري تسجيل الخروج...";


            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    "Finance logout error:",
                    error
                );


                logoutButton.disabled =
                    false;


                logoutButton.textContent =
                    "تسجيل الخروج";


                showFinanceToast(
                    "تعذر تسجيل الخروج.",
                    "error"
                );


                return;

            }


            window.location.href =
                "admin-login.html";

        }
    );

}


/* =========================================================
Start
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        initializeFinanceLogout();

        await checkFinanceAccess();

    }
);