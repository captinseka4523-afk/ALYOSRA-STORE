// ==========================================
// Admin Order Details
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const orderId =
            new URLSearchParams(
                window.location.search
            ).get("id");


        if (!orderId) {

            showOrderError();

            return;
        }


        await loadOrderDetails(
            orderId
        );

    }
);


// ==========================================
// Load Order Details
// ==========================================

async function loadOrderDetails(
    orderId
) {

    const loading =
        document.getElementById(
            "orderLoading"
        );

    const content =
        document.getElementById(
            "orderContent"
        );


    try {

        // ----------------------------------
        // جلب الطلب
        // ----------------------------------

        const {
            data: order,
            error: orderError
        } = await supabaseClient
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();


        if (orderError) {

            console.error(
                "Order error:",
                orderError
            );

            showOrderError();

            return;
        }


        // ----------------------------------
        // جلب عناصر الطلب
        // ----------------------------------

        const {
            data: items,
            error: itemsError
        } = await supabaseClient
            .from("order_items")
            .select("*")
            .eq("order_id", orderId)
            .order("id", {
                ascending: true
            });


        if (itemsError) {

            console.error(
                "Order items error:",
                itemsError
            );

            showOrderError();

            return;
        }


        console.log(
            "ORDER:",
            order
        );

        console.log(
            "ORDER ITEMS:",
            items
        );


        // ----------------------------------
        // تعبئة البيانات
        // ----------------------------------

        document.getElementById(
            "orderNumber"
        ).textContent =
            order.order_number || "-";


        document.getElementById(
            "orderDate"
        ).textContent =
            formatDate(
                order.created_at
            );


        document.getElementById(
            "customerName"
        ).textContent =
            order.customer_name || "-";


        document.getElementById(
            "customerPhone"
        ).textContent =
            order.customer_phone || "-";


        document.getElementById(
            "customerAddress"
        ).textContent =
            order.customer_address || "-";


        document.getElementById(
            "customerNote"
        ).textContent =
            order.customer_note ||
            "لا توجد ملاحظات";


        // ----------------------------------
        // حالة الطلب
        // ----------------------------------

        createStatusSelector(
            orderId,
            order.status
        );


        document.getElementById(
            "orderTotal"
        ).textContent =
            "$" +
            formatPrice(
                order.total
            );


        // ----------------------------------
        // المنتجات
        // ----------------------------------

        renderOrderItems(
            items || []
        );


        loading.hidden = true;

        content.hidden = false;

    }

    catch (error) {

        console.error(
            "Unexpected order details error:",
            error
        );

        showOrderError();

    }

}


// ==========================================
// Create Status Selector
// ==========================================

function createStatusSelector(
    orderId,
    currentStatus
) {

    const statusElement =
        document.getElementById(
            "orderStatus"
        );


    if (!statusElement) {

        console.error(
            "orderStatus element not found"
        );

        return;
    }


    const select =
        document.createElement(
            "select"
        );


    select.id =
        "orderStatus";


    select.className =
        "order-details-status";


    const statuses = {

        pending:
            "قيد الانتظار",

        confirmed:
            "تم التأكيد",

        processing:
            "قيد التجهيز",

        delivered:
            "تم التسليم",

        completed:
            "مكتمل",

        cancelled:
            "ملغي"

    };


    Object.entries(
        statuses
    ).forEach(
        function([
            value,
            text
        ]) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                text;


            if (
                value ===
                currentStatus
            ) {

                option.selected =
                    true;

            }


            select.appendChild(
                option
            );

        }
    );


    select.dataset.previousStatus =
        currentStatus || "pending";


    console.log(
        "Initial order status:",
        select.dataset.previousStatus
    );


    select.addEventListener(
        "change",
        async function() {

            const newStatus =
                select.value;


            const previousStatus =
                select.dataset.previousStatus;


            if (
                newStatus ===
                previousStatus
            ) {

                return;

            }


            await updateOrderStatus(
                orderId,
                newStatus,
                previousStatus,
                select
            );

        }
    );


    statusElement.replaceWith(
        select
    );

}


// ==========================================
// Update Order Status
// ==========================================

async function updateOrderStatus(
    orderId,
    newStatus,
    previousStatus,
    select
) {

    select.disabled = true;


    const {
        error
    } = await supabaseClient
        .from("orders")
        .update({
            status: newStatus
        })
        .eq("id", orderId);


    if (error) {

        console.error(
            "Order status update error:",
            error
        );


        select.value =
            previousStatus;


        select.disabled =
            false;


        showStatusMessage(
            "تعذر تحديث حالة الطلب",
            "error"
        );


        return;

    }


    select.dataset.previousStatus =
        newStatus;


    select.disabled =
        false;


    showStatusMessage(
        "تم تحديث حالة الطلب بنجاح",
        "success"
    );


    console.log(
        "Order status updated:",
        newStatus
    );

}


// ==========================================
// Status Message
// ==========================================

function showStatusMessage(
    message,
    type
) {

    const messageElement =
        document.getElementById(
            "orderStatusMessage"
        );


    if (!messageElement) {

        return;

    }


    messageElement.textContent =
        message;


    if (
        type ===
        "success"
    ) {

        messageElement.style.color =
            "#198754";

    }
    else {

        messageElement.style.color =
            "#c62828";

    }


    clearTimeout(
        messageElement._timer
    );


    messageElement._timer =
        setTimeout(
            function() {

                messageElement.textContent =
                    "";

            },
            3500
        );

}


// ==========================================
// Render Order Items
// ==========================================

function renderOrderItems(
    items
) {

    const container =
        document.getElementById(
            "orderItems"
        );


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML = `
            <div class="order-info-card">
                لا توجد منتجات مرتبطة بهذا الطلب.
            </div>
        `;

        return;
    }


    items.forEach(
        function(item) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "order-item";


            element.innerHTML = `

                <div class="order-item-name">
                    ${escapeHtml(
                        item.product_name || "-"
                    )}
                </div>

                <div class="order-item-quantity">
                    الكمية:
                    ${item.quantity}
                </div>

                <div class="order-item-subtotal">
                    ${formatPrice(
                        item.subtotal
                    )}
                $
                </div>

            `;


            container.appendChild(
                element
            );

        }
    );

}


// ==========================================
// Format Price
// ==========================================

function formatPrice(
    value
) {

    return Number(
        value || 0
    ).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

}


// ==========================================
// Format Date
// ==========================================

function formatDate(
    value
) {

    if (!value) {

        return "-";

    }


    return new Date(
        value
    ).toLocaleString(
        "ar-SY",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


// ==========================================
// Escape HTML
// ==========================================

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// ==========================================
// Error
// ==========================================

function showOrderError() {

    document.getElementById(
        "orderLoading"
    ).hidden = true;


    document.getElementById(
        "orderError"
    ).hidden = false;

}


// ==========================================
// Back To Orders
// ==========================================

document.addEventListener(
    "click",
    function(event) {

        if (
            event.target.id ===
            "backToOrders"
        ) {

            window.location.href =
                "admin-dashboard.html?section=orders";

        }

    }
);


// ==========================================
// Delete Order
// ==========================================

document.addEventListener(
    "click",
    async function(event) {

        if (
            event.target.id !==
            "deleteOrderButton"
        ) {

            return;

        }


        const button =
            event.target;


        const orderId =
            new URLSearchParams(
                window.location.search
            ).get("id");


        if (!orderId) {

            showStatusMessage(
                "تعذر تحديد الطلب.",
                "error"
            );

            return;

        }


        // ==================================
        // تأكيد الحذف
        // ==================================

        const confirmed =
            confirm(
                "هل أنت متأكد من حذف هذا الطلب؟\n\nسيتم حذف الطلب وإعادة الكميات إلى المخزون."
            );


        if (!confirmed) {

            return;

        }


        // ==================================
        // منع الضغط المتكرر
        // ==================================

        if (button.disabled) {

            return;

        }


        button.disabled =
            true;


        const originalText =
            button.textContent;


        button.textContent =
            "جاري حذف الطلب...";


        try {

            // ==================================
            // استدعاء دالة قاعدة البيانات
            // ==================================

            const {
                data,
                error
            } =
                await supabaseClient.rpc(
                    "delete_order",
                    {
                        p_order_id:
                            Number(orderId)
                    }
                );


            if (error) {

                console.error(
                    "Delete order error:",
                    error
                );

                throw error;

            }


            // ==================================
            // التحقق من النتيجة
            // ==================================

            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    "لم يتم حذف الطلب بشكل صحيح."
                );

            }


            // ==================================
            // نجاح الحذف
            // ==================================

            showStatusMessage(
                "تم حذف الطلب وإعادة الكميات إلى المخزون بنجاح.",
                "success"
            );


            setTimeout(
                function() {

                    window.location.href =
                        "admin-dashboard.html?section=orders";

                },
                3500
            );


        } catch (error) {

            console.error(
                "خطأ أثناء حذف الطلب:",
                error
            );


            showStatusMessage(
                "تعذر حذف الطلب حاليًا.",
                "error"
            );


            button.disabled =
                false;


            button.textContent =
                originalText;

        }

    }
);

