// ==========================================
// AL YOSRA STORE - Admin Orders
// ==========================================

let adminOrders = [];


// ==========================================
// Load Orders
// ==========================================

async function loadAdminOrders() {

    const {
    data: adminCheck,
    error: adminCheckError
} = await supabaseClient.rpc("is_admin");

console.log("IS ADMIN:", adminCheck);
console.log("IS ADMIN ERROR:", adminCheckError);

    const table =
        document.getElementById(
            "adminOrdersTable"
        );

    const loading =
        document.getElementById(
            "ordersLoading"
        );

    const empty =
        document.getElementById(
            "ordersEmpty"
        );


    if (!table) {
        return;
    }


    if (loading) {
        loading.hidden = false;
    }


    if (empty) {
        empty.hidden = true;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("orders")
            .select("*")
            .order(
                "id",
                {
                    ascending: false
                }
            );


        console.log(
            "ORDERS DATA:",
            data
        );


        console.log(
            "ORDERS ERROR:",
            error
        );


        if (error) {
            throw error;
        }


        adminOrders =
            data || [];


        renderAdminOrders();


        updateOrdersCount();


    } catch (error) {

        console.error(
            "Error loading orders:",
            error
        );


        if (loading) {

            loading.textContent =
                "حدث خطأ أثناء تحميل الطلبات.";

        }

    }

}



// ==========================================
// Render Orders
// ==========================================

function renderAdminOrders() {

    const table =
        document.getElementById(
            "adminOrdersTable"
        );

    const loading =
        document.getElementById(
            "ordersLoading"
        );

    const empty =
        document.getElementById(
            "ordersEmpty"
        );


    if (!table) {
        return;
    }


    if (loading) {
        loading.hidden = true;
    }


    table.innerHTML = "";


    if (
        adminOrders.length === 0
    ) {

        if (empty) {
            empty.hidden = false;
        }

        return;

    }


    if (empty) {
        empty.hidden = true;
    }


    adminOrders.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
                );


            const orderNumber =
                order.order_number ||
                `#${order.id}`;


            const customerName =
                order.customer_name ||
                "—";


            const customerPhone =
                order.customer_phone ||
                "—";


            const total =
                Number(
                    order.total || 0
                );


            const createdAt =
                formatOrderDate(
                    order.created_at
                );


            const status =
                order.status ||
                "new";


            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeOrderHtml(
                            orderNumber
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeOrderHtml(
                        customerName
                    )}

                </td>


                <td>

                    ${escapeOrderHtml(
                        customerPhone
                    )}

                </td>


                <td>

                    ${total.toFixed(2)} $

                </td>


                <td>

                    <span
                        class="order-status ${getOrderStatusClass(
                            status
                        )}"
                    >

                        ${getOrderStatusText(
                            status
                        )}

                    </span>

                </td>


                <td>

                    ${createdAt}

                </td>


                <td>

                    <button
                        type="button"
                        class="admin-edit-button"
                        data-order-action="view"
                        data-id="${order.id}"
                    >
                        التفاصيل
                    </button>

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}



// ==========================================
// Orders Count
// ==========================================

function updateOrdersCount() {

    const element =
        document.getElementById(
            "ordersCount"
        );


    if (element) {

        element.textContent =
            adminOrders.length;

    }

}



// ==========================================
// Order Status
// ==========================================

function getOrderStatusText(
    status
) {

    const statuses = {

        new:
            "جديد",

        pending:
            "قيد الانتظار",

        processing:
            "قيد التجهيز",

        delivered:
    "تم التسليم",

        completed:
            "مكتمل",

        cancelled:
            "ملغي"

    };


    return (
        statuses[status] ||
        status ||
        "جديد"
    );

}


function getOrderStatusClass(
    status
) {

    return `status-${String(
        status || "new"
    ).toLowerCase()}`;

}



// ==========================================
// Format Date
// ==========================================

function formatOrderDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleString(
        "ar-SY",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}



// ==========================================
// Escape HTML
// ==========================================

function escapeOrderHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}



// ==========================================
// Start
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        await loadAdminOrders();

    }
);

// ==========================================
// View Order Details
// ==========================================

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                '[data-order-action="view"]'
            );

        if (!button) {
            return;
        }

        const orderId =
            button.dataset.id;

        if (!orderId) {
            return;
        }

        window.location.href =
            `admin-order-details.html?id=${orderId}`;

    }
);