// ==========================================================
// AL YOSRA STORE — CHECKOUT
// Products + Variants + Offers + WhatsApp
// ==========================================================
//
// القاعدة الأساسية:
// create_order هي المصدر الوحيد للحقيقة بالنسبة للطلب.
//
// Telegram:
// - يتم إرساله تلقائيًا من قاعدة البيانات بعد إنشاء الطلب.
// - لا يوجد أي استدعاء Telegram من المتصفح.
// - لا يوجد Telegram Bot Token أو Chat ID هنا.
// - لا يوجد send_telegram_secure.
// - لا يتم إرسال الأسعار أو تفاصيل الطلب إلى Telegram من المتصفح.
//
// مهم:
// نجاح create_order = نجاح الطلب.
// Telegram مجرد إشعار إداري، ولا يجب أن يمنع نجاح الطلب.
//
// Variants:
// - تفاصيل الـ Variant تُقرأ من localStorage snapshot.
// - لا يتم إجراء طلب Supabase لاكتشاف تفاصيل الـ Variant.
// - السعر الموجود في snapshot للعرض فقط.
// - create_order يعيد التحقق من Variant والسعر والمخزون فعليًا.
// ==========================================================


// ==========================================================
// 1. Elements
// ==========================================================

const orderSummary =
    document.getElementById("orderSummary");

const checkoutFinalTotal =
    document.getElementById("checkoutFinalTotal");

const confirmOrderBtn =
    document.getElementById("confirmOrderBtn");

const whatsappOrderBtn =
    document.getElementById("whatsappOrderBtn");

const successModal =
    document.getElementById("successModal");

const backToHomeBtn =
    document.getElementById("backToHomeBtn");


// ==========================================================
// 2. Cart
// ==========================================================

function getCheckoutCart() {

    try {

        const rawCart =
            localStorage.getItem("cart");

        if (!rawCart) {
            return {};
        }

        const cart =
            JSON.parse(rawCart);

        if (
            !cart ||
            typeof cart !== "object" ||
            Array.isArray(cart)
        ) {
            return {};
        }

        return cart;

    } catch (error) {

        console.error(
            "تعذر قراءة السلة:",
            error
        );

        return {};
    }
}


// ==========================================================
// 3. Variant snapshots
// ==========================================================

const VARIANT_CART_SNAPSHOTS_KEY =
    "alYosraVariantCartSnapshots_v1";


function getVariantCartSnapshots() {

    try {

        const raw =
            localStorage.getItem(
                VARIANT_CART_SNAPSHOTS_KEY
            );

        if (!raw) {
            return {};
        }

        const snapshots =
            JSON.parse(raw);

        if (
            !snapshots ||
            typeof snapshots !== "object" ||
            Array.isArray(snapshots)
        ) {
            return {};
        }

        return snapshots;

    } catch (error) {

        console.error(
            "تعذر قراءة بيانات Variants المحلية:",
            error
        );

        return {};
    }
}


function getVariantSnapshot(id) {

    const snapshots =
        getVariantCartSnapshots();

    return (
        snapshots[String(id)] ||
        null
    );
}


// ==========================================================
// 4. Offers
// ==========================================================

let checkoutOffers = [];


// ==========================================================
// 5. State
// ==========================================================

let isOrderProcessing = false;


// ==========================================================
// 6. Helpers
// ==========================================================

function getCartEntries() {

    const cart =
        getCheckoutCart();

    return Object.entries(cart)

        .map(([id, quantity]) => ({
            id: String(id),
            quantity: Number(quantity)
        }))

        .filter(item =>
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        );
}


function isOfferItem(id) {

    return String(id)
        .startsWith("offer_");
}


function getOfferId(id) {

    return String(id)
        .replace("offer_", "");
}


function isVariantItem(id) {

    return String(id)
        .startsWith("variant_");
}


function getVariantId(id) {

    return String(id)
        .replace("variant_", "");
}


function getProduct(productId) {

    if (!Array.isArray(window.products)) {
        return null;
    }

    return (
        window.products.find(
            product =>
                String(product.id) ===
                String(productId)
        ) || null
    );
}


function getOffer(offerId) {

    return (
        checkoutOffers.find(
            offer =>
                String(offer.id) ===
                String(offerId)
        ) || null
    );
}


function formatPrice(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0.00";
    }

    return number.toFixed(2);
}


// ==========================================================
// 7. Toast
// ==========================================================

function showCheckoutToast(
    message,
    type = "error"
) {

    const existingToast =
        document.getElementById(
            "checkoutToast"
        );

    if (existingToast) {
        existingToast.remove();
    }

    const toast =
        document.createElement("div");

    toast.id =
        "checkoutToast";

    toast.setAttribute(
        "role",
        "alert"
    );

    toast.setAttribute(
        "aria-live",
        "polite"
    );

    const isError =
        type === "error";

    toast.innerHTML = `
        <div style="
            display:flex;
            align-items:flex-start;
            gap:12px;
        ">

            <div style="
                flex:0 0 auto;
                width:36px;
                height:36px;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:50%;
                background:${isError ? "#fee2e2" : "#dcfce7"};
                color:${isError ? "#dc2626" : "#16a34a"};
                font-size:20px;
                font-weight:700;
            ">
                ${isError ? "!" : "✓"}
            </div>

            <div style="
                flex:1;
                min-width:0;
                padding-top:2px;
            ">

                <div style="
                    font-size:15px;
                    font-weight:700;
                    color:#111827;
                    margin-bottom:3px;
                ">
                    ${isError ? "تنبيه" : "تم بنجاح"}
                </div>

                <div style="
                    font-size:14px;
                    line-height:1.6;
                    color:#374151;
                ">
                    ${escapeHtml(message)}
                </div>

            </div>

            <button
                type="button"
                aria-label="إغلاق التنبيه"
                style="
                    flex:0 0 auto;
                    border:0;
                    background:transparent;
                    color:#6b7280;
                    cursor:pointer;
                    font-size:20px;
                    line-height:1;
                    padding:2px;
                "
            >
                ×
            </button>

        </div>
    `;

    Object.assign(
        toast.style,
        {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform:
                "translate(-50%, -20px)",
            width:
                "min(calc(100vw - 32px), 430px)",
            padding:
                "14px 16px",
            background:
                "#ffffff",
            border:
                isError
                    ? "1px solid #fecaca"
                    : "1px solid #bbf7d0",
            borderRadius:
                "14px",
            boxShadow:
                "0 12px 35px rgba(15, 23, 42, 0.16)",
            zIndex:
                "99999",
            opacity:
                "0",
            transition:
                "opacity 0.25s ease, transform 0.25s ease",
            direction:
                "rtl",
            boxSizing:
                "border-box",
            fontFamily:
                "inherit"
        }
    );

    document.body.appendChild(
        toast
    );

    const closeButton =
        toast.querySelector(
            "button"
        );

    const removeToast = () => {

        toast.style.opacity =
            "0";

        toast.style.transform =
            "translate(-50%, -20px)";

        setTimeout(
            () => {
                toast.remove();
            },
            250
        );
    };

    closeButton.addEventListener(
        "click",
        removeToast
    );

    requestAnimationFrame(
        () => {

            toast.style.opacity =
                "1";

            toast.style.transform =
                "translate(-50%, 0)";
        }
    );

    setTimeout(
        removeToast,
        4000
    );
}


// ==========================================================
// 7b. escape
// ==========================================================

function escapeHtml(value) {

    return String(value ?? "")

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


// ==========================================================
// 8. Offers
// ==========================================================

async function loadCheckoutOffers() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("offers")
                .select(`
                    id,
                    name,
                    price,
                    image,
                    active
                `)
                .eq(
                    "active",
                    true
                );

        if (error) {
            throw error;
        }

        checkoutOffers =
            Array.isArray(data)
                ? data
                : [];

    } catch (error) {

        console.error(
            "خطأ في تحميل العروض:",
            error
        );

        checkoutOffers = [];
    }

    displayCheckout();
}



// ==========================================================
// 9. Variant selections
// Compact details panel
// ==========================================================

function formatVariantSelections(
    snapshot
) {

    if (
        !snapshot ||
        !Array.isArray(
            snapshot.selections
        ) ||
        snapshot.selections.length === 0
    ) {
        return "";
    }

    return `
        <div
            class="variant-details-panel"
            aria-label="تفاصيل خيار المنتج"
        >

            <div
                class="variant-details-title"
            >
                تفاصيل المنتج
            </div>

            <div
                class="variant-details-list"
            >

                ${
                    snapshot.selections
                        .map(selection => {

                            const groupName =
                                escapeHtml(
                                    selection.groupName ||
                                    "الخيار"
                                );

                            const value =
                                escapeHtml(
                                    selection.value ||
                                    ""
                                );

                            return `
                                <div
                                    class="variant-detail-row"
                                >

                                    <span
                                        class="variant-detail-name"
                                    >
                                        ${groupName}
                                    </span>

                                    <span
                                        class="variant-detail-value"
                                    >
                                        ${value}
                                    </span>

                                </div>
                            `;
                        })
                        .join("")
                }

            </div>

        </div>
    `;
}

// ==========================================================
// 10. Product data requirement
// ==========================================================

function cartRequiresProductsData() {

    return getCartEntries()
        .some(
            ({ id }) =>
                !isOfferItem(id) &&
                !isVariantItem(id)
        );
}


// ==========================================================
// 11. displayCheckout
// ==========================================================

function displayCheckout() {

    if (!orderSummary) {
        return;
    }

    orderSummary.innerHTML =
        "";

    const entries =
        getCartEntries();

    if (entries.length === 0) {

        orderSummary.innerHTML = `
            <p
                style="
                    text-align:center;
                    margin:auto;
                "
            >
                السلة فارغة
            </p>
        `;

        if (checkoutFinalTotal) {
            checkoutFinalTotal.textContent =
                "0.00 $";
        }

        return;
    }

    let displayTotal =
        0;


    entries.forEach(
        ({ id, quantity }) => {


            // ==================================================
            // Offer
            // ==================================================

            if (isOfferItem(id)) {

                const offer =
                    getOffer(
                        getOfferId(id)
                    );

                if (!offer) {
                    return;
                }

                const price =
                    Number(offer.price) || 0;

                const subtotal =
                    price * quantity;

                displayTotal +=
                    subtotal;

                const offerName =
                    escapeHtml(
                        offer.name ||
                        "عرض"
                    );

                const offerImage =
                    escapeHtml(
                        offer.image ||
                        ""
                    );

                orderSummary.innerHTML += `

                    <div
                        class="order-item order-item-offer"
                    >

                        ${
                            offerImage
                                ? `
                                    <img
                                        src="${offerImage}"
                                        alt="${offerName}"
                                        class="order-item-image"
                                    >
                                  `
                                : `
                                    <div
                                        class="
                                            order-item-image
                                            order-item-image-placeholder
                                        "
                                    >
                                        عرض
                                    </div>
                                  `
                        }

                        <div
                            class="order-item-content"
                        >

                            <h3>
                                ${offerName}
                            </h3>

                            <p
                                class="order-item-type"
                            >
                                النوع: عرض
                            </p>

                            <div
                                class="order-item-meta"
                            >

                                <span>
                                    الكمية: ${quantity}
                                </span>

                                <span>
                                    سعر العرض:
                                    ${formatPrice(price)}$
                                </span>

                            </div>

                        </div>

                        <strong
                            class="order-item-total"
                        >
                            ${formatPrice(subtotal)}$
                        </strong>

                    </div>

                `;

                return;
            }


            // ==================================================
            // Variant
            // ==================================================

            if (isVariantItem(id)) {

                const snapshot =
                    getVariantSnapshot(id);

                if (!snapshot) {

                    console.warn(
                        "لم يتم العثور على snapshot للـ Variant:",
                        id
                    );

                    return;
                }

                const price =
                    Number(snapshot.price) || 0;

                const subtotal =
                    price * quantity;

                displayTotal +=
                    subtotal;

                const productName =
                    escapeHtml(
                        snapshot.productName ||
                        "منتج"
                    );

                const image =
                    escapeHtml(
                        snapshot.image ||
                        ""
                    );

                const sku =
                    escapeHtml(
                        snapshot.sku ||
                        ""
                    );

                const selectionsHtml =
                    formatVariantSelections(
                        snapshot
                    );

              orderSummary.innerHTML += `

    <div
        class="
            order-item
            order-item-variant
        "
    >

        ${
            image
                ? `
                    <img
                        src="${image}"
                        alt="${productName}"
                        class="order-item-image"
                    >
                  `
                : `
                    <div
                        class="
                            order-item-image
                            order-item-image-placeholder
                        "
                    >
                        منتج
                    </div>
                  `
        }

        <div
            class="order-item-content"
        >

            <h3>
                ${productName}
            </h3>

            <p
                class="order-item-type"
            >
                النوع: خيار منتج
            </p>

            <div
                class="order-item-meta"
            >

                <span>
                    الكمية: ${quantity}
                </span>

                <span>
                    سعر القطعة:
                    ${formatPrice(price)}$
                </span>

            </div>

        </div>

        ${
            selectionsHtml
                ? selectionsHtml
                : ""
        }

        <strong
            class="order-item-total"
        >
            ${formatPrice(subtotal)}$
        </strong>

    </div>

`;

                return;
            }


            // ==================================================
            // Normal product
            // ==================================================

            const product =
                getProduct(id);

            if (!product) {
                return;
            }

            const price =
                Number(product.price) || 0;

            const subtotal =
                price * quantity;

            displayTotal +=
                subtotal;

            const productName =
                escapeHtml(
                    product.name ||
                    "منتج"
                );

            const productImage =
                escapeHtml(
                    product.image ||
                    product.main_image ||
                    ""
                );

            orderSummary.innerHTML += `

                <div
                    class="order-item order-item-product"
                >

                    <img
                        src="${productImage}"
                        alt="${productName}"
                        class="order-item-image"
                    >

                    <div
                        class="order-item-content"
                    >

                        <h3>
                            ${productName}
                        </h3>

                        <div
                            class="order-item-meta"
                        >

                            <span>
                                الكمية: ${quantity}
                            </span>

                            <span>
                                سعر القطعة:
                                ${formatPrice(price)}$
                            </span>

                        </div>

                    </div>

                    <strong
                        class="order-item-total"
                    >
                        ${formatPrice(subtotal)}$
                    </strong>

                </div>

            `;
        }
    );


    if (checkoutFinalTotal) {

        checkoutFinalTotal.textContent =
            `${formatPrice(displayTotal)} $`;
    }
}


// ==========================================================
// 12. prepareOrderItems
// ==========================================================

function prepareOrderItems() {

    const entries =
        getCartEntries();

    if (entries.length === 0) {
        throw new Error(
            "السلة فارغة."
        );
    }

    return entries.map(
        ({ id, quantity }) => {


            // Offer
            if (isOfferItem(id)) {

                const offer =
                    getOffer(
                        getOfferId(id)
                    );

                if (!offer) {
                    throw new Error(
                        "تعذر العثور على أحد العروض."
                    );
                }

                return {
                    product_id: null,
                    variant_id: null,
                    offer_id:
                        Number(offer.id),
                    quantity
                };
            }


            // Variant
            if (isVariantItem(id)) {

                const snapshot =
                    getVariantSnapshot(id);

                if (!snapshot) {

                    throw new Error(
                        "تعذر العثور على بيانات أحد خيارات المنتجات. يرجى العودة إلى المنتج وإضافته إلى السلة من جديد."
                    );
                }

                const productId =
                    Number(
                        snapshot.productId
                    );

                const variantId =
                    Number(
                        snapshot.variantId
                    );

                if (
                    !Number.isInteger(
                        productId
                    ) ||
                    productId <= 0 ||
                    !Number.isInteger(
                        variantId
                    ) ||
                    variantId <= 0
                ) {

                    throw new Error(
                        "بيانات أحد خيارات المنتجات غير صالحة. يرجى إضافته إلى السلة من جديد."
                    );
                }

                return {
                    product_id:
                        productId,

                    variant_id:
                        variantId,

                    offer_id:
                        null,

                    quantity
                };
            }


            // Normal product
            const product =
                getProduct(id);

            if (!product) {

                throw new Error(
                    "تعذر العثور على أحد المنتجات."
                );
            }

            return {
                product_id:
                    Number(product.id),

                variant_id:
                    null,

                offer_id:
                    null,

                quantity
            };
        }
    );
}


// ==========================================================
// 13. Customer
// ==========================================================

function getCustomerData() {

    return {

        name:
            document
                .getElementById(
                    "customerName"
                )
                ?.value
                .trim() || "",

        phone:
            document
                .getElementById(
                    "customerPhone"
                )
                ?.value
                .trim() || "",

        address:
            document
                .getElementById(
                    "customerAddress"
                )
                ?.value
                .trim() || "",

        note:
            document
                .getElementById(
                    "customerNote"
                )
                ?.value
                .trim() || ""
    };
}


// ==========================================================
// 14. Validate
// ==========================================================

function validateCustomer(
    customer
) {

    if (!customer.name) {

        return {
            valid: false,
            message:
                "يرجى إدخال الاسم."
        };
    }

    if (!customer.phone) {

        return {
            valid: false,
            message:
                "يرجى إدخال رقم الهاتف."
        };
    }

    if (!customer.address) {

        return {
            valid: false,
            message:
                "يرجى إدخال العنوان."
        };
    }

    return {
        valid: true,
        message: ""
    };
}


// ==========================================================
// 15. WhatsApp
// ==========================================================

function buildWhatsAppMessage(
    orderNumber,
    total,
    customer
) {

    let message =

        `🛒 *طلب جديد | متجر اليُسرى*\n` +

        `━━━━━━━━━━━━━━━━━━\n` +

        `🆔 *رقم الطلب:* ${orderNumber}\n\n` +

        `👤 *بيانات العميل:*\n` +

        `▪️ *الاسم:* ${customer.name}\n` +

        `▪️ *الهاتف:* ${customer.phone}\n` +

        `▪️ *العنوان:* ${customer.address}\n` +

        `📝 *الملاحظات:* ${
            customer.note ||
            "لا توجد"
        }\n` +

        `━━━━━━━━━━━━━━━━━━\n` +

        `📦 *تفاصيل الطلب:*\n`;


    getCartEntries().forEach(
        ({ id, quantity }) => {


            // Offer
            if (isOfferItem(id)) {

                const offer =
                    getOffer(
                        getOfferId(id)
                    );

                if (!offer) {
                    return;
                }

                const price =
                    Number(offer.price) || 0;

                const subtotal =
                    price * quantity;

                message +=

                    `\n🎁 *${
                        offer.name ||
                        "عرض"
                    }* (عرض)\n` +

                    `   الكمية: ${quantity} | ` +

                    `السعر: ${
                        formatPrice(price)
                    }$ | ` +

                    `الإجمالي: ${
                        formatPrice(subtotal)
                    }$\n`;

                return;
            }


            // Variant
            if (isVariantItem(id)) {

                const snapshot =
                    getVariantSnapshot(id);

                if (!snapshot) {
                    return;
                }

                const price =
                    Number(snapshot.price) || 0;

                const subtotal =
                    price * quantity;

                const productName =
                    snapshot.productName ||
                    "منتج";

                message +=
                    `\n🔹 *${productName}* (خيار منتج)\n`;


                if (
                    Array.isArray(
                        snapshot.selections
                    )
                ) {

                    snapshot.selections.forEach(
                        selection => {

                            if (
                                selection &&
                                selection.groupName &&
                                selection.value
                            ) {

                                message +=

                                    `   ${
                                        selection.groupName
                                    }: ${
                                        selection.value
                                    }\n`;
                            }
                        }
                    );
                }


                if (snapshot.sku) {

                    message +=
                        `   SKU: ${snapshot.sku}\n`;
                }


                message +=

                    `   الكمية: ${quantity} | ` +

                    `السعر: ${
                        formatPrice(price)
                    }$ | ` +

                    `الإجمالي: ${
                        formatPrice(subtotal)
                    }$\n`;

                return;
            }


            // Normal product
            const product =
                getProduct(id);

            if (!product) {
                return;
            }

            const price =
                Number(product.price) || 0;

            const subtotal =
                price * quantity;

            message +=

                `\n🔹 *${
                    product.name ||
                    "منتج"
                }*\n` +

                `   الكمية: ${quantity} | ` +

                `السعر: ${
                    formatPrice(price)
                }$ | ` +

                `الإجمالي: ${
                    formatPrice(subtotal)
                }$\n`;
        }
    );


    message +=

        `\n━━━━━━━━━━━━━━━━━━\n` +

        `💰 *المجموع الكلي:* ${
            formatPrice(total)
        }$\n` +

        `━━━━━━━━━━━━━━━━━━\n` +

        `شكراً لاختياركم متجر اليُسرى 🌟`;


    return message;
}


// ==========================================================
// 16. Buttons
// ==========================================================

function setOrderButtonsDisabled(
    disabled
) {

    if (confirmOrderBtn) {
        confirmOrderBtn.disabled =
            disabled;
    }

    if (whatsappOrderBtn) {
        whatsappOrderBtn.disabled =
            disabled;
    }
}


// ==========================================================
// 17. Process order
// ==========================================================

async function processOrder(
    orderType
) {

    if (isOrderProcessing) {
        return;
    }

    const activeBtn =
        orderType === "whatsapp"
            ? whatsappOrderBtn
            : confirmOrderBtn;

    if (!activeBtn) {
        return;
    }


    if (
        getCartEntries().length === 0
    ) {

        showCheckoutToast(
            "السلة فارغة. أضف منتجًا واحدًا على الأقل قبل إتمام الطلب."
        );

        return;
    }


    if (
        cartRequiresProductsData() &&
        (
            !Array.isArray(
                window.products
            ) ||
            window.products.length === 0
        )
    ) {

        showCheckoutToast(
            "لم يتم تحميل المنتجات بعد. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى."
        );

        return;
    }


    const customer =
        getCustomerData();

    const validation =
        validateCustomer(
            customer
        );

    if (!validation.valid) {

        showCheckoutToast(
            validation.message
        );

        return;
    }


    let orderItems;


    try {

        orderItems =
            prepareOrderItems();

    } catch (error) {

        console.error(
            "خطأ في تجهيز عناصر الطلب:",
            error
        );

        showCheckoutToast(
            error.message ||
            "تعذر تجهيز الطلب."
        );

        return;
    }


    isOrderProcessing =
        true;

    setOrderButtonsDisabled(
        true
    );


    const originalText =
        activeBtn.textContent;

    activeBtn.textContent =
        "جاري تأكيد الطلب...";


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "create_order",
                {
                    p_customer_name:
                        customer.name,

                    p_customer_phone:
                        customer.phone,

                    p_customer_address:
                        customer.address,

                    p_customer_note:
                        customer.note ||
                        null,

                    p_items:
                        orderItems
                }
            );


        if (error) {
            throw error;
        }


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                "لم يتم إنشاء الطلب بشكل صحيح."
            );
        }


        const orderId =
            Number(
                data.order_id
            );

        const orderNumber =
            data.order_number;

        const total =
            Number(data.total) || 0;


        if (
            !Number.isInteger(
                orderId
            ) ||
            orderId <= 0 ||
            !orderNumber
        ) {

            throw new Error(
                "تم إنشاء الطلب ولكن بيانات الطلب الناتجة غير مكتملة."
            );
        }


        localStorage.setItem(
            "orderId",
            String(orderNumber)
        );


        if (
            orderType === "whatsapp"
        ) {

            const message =
                buildWhatsAppMessage(
                    orderNumber,
                    total,
                    customer
                );


            localStorage.setItem(
                "whatsappMessage",
                message
            );

            localStorage.removeItem(
                "cart"
            );

            window.location.href =
                "order-success.html";

            return;
        }


        localStorage.removeItem(
            "cart"
        );


        if (successModal) {

            successModal.hidden =
                false;

        } else {

            window.location.href =
                "index.html";
        }


        isOrderProcessing =
            false;

        setOrderButtonsDisabled(
            false
        );


    } catch (error) {

        console.error(
            "خطأ أثناء إنشاء الطلب:",
            error
        );

        showCheckoutToast(
            "تعذر تأكيد الطلب حالياً. يرجى المحاولة مرة أخرى."
        );

        isOrderProcessing =
            false;

        setOrderButtonsDisabled(
            false
        );

        activeBtn.textContent =
            originalText;
    }
}


// ==========================================================
// 18. Buttons
// ==========================================================

if (confirmOrderBtn) {

    confirmOrderBtn.addEventListener(
        "click",
        () =>
            processOrder(
                "telegram"
            )
    );
}


if (whatsappOrderBtn) {

    whatsappOrderBtn.addEventListener(
        "click",
        () =>
            processOrder(
                "whatsapp"
            )
    );
}


// ==========================================================
// 19. Products loaded
// ==========================================================

document.addEventListener(
    "productsLoaded",
    () => {
        displayCheckout();
    }
);


// ==========================================================
// 20. DOMContentLoaded
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCheckoutOffers();

        displayCheckout();
    }
);


// ==========================================================
// 21. Already loaded
// ==========================================================

if (
    Array.isArray(
        window.products
    ) &&
    window.products.length > 0
) {

    displayCheckout();
}


// ==========================================================
// 22. Customer fields
// ==========================================================

const customerFields = [

    "customerName",

    "customerPhone",

    "customerAddress",

    "customerNote"

];


customerFields.forEach(
    id => {

        const field =
            document.getElementById(
                id
            );

        if (!field) {
            return;
        }


        const savedValue =
            localStorage.getItem(
                id
            );


        if (
            savedValue !== null
        ) {

            field.value =
                savedValue;
        }


        field.addEventListener(
            "input",
            () => {

                localStorage.setItem(
                    id,
                    field.value
                );
            }
        );
    }
);


// ==========================================================
// 23. Back home
// ==========================================================

if (backToHomeBtn) {

    backToHomeBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "index.html";
        }
    );
}


// ==========================================================
// Checkout side menu
// ==========================================================

function setupCheckoutSideMenu() {

    const menuToggle =
        document.getElementById(
            "menuToggle"
        );

    const sideMenu =
        document.getElementById(
            "sideMenu"
        );

    const sideMenuClose =
        document.getElementById(
            "sideMenuClose"
        );

    const sideMenuOverlay =
        document.getElementById(
            "sideMenuOverlay"
        );


    if (
        !menuToggle ||
        !sideMenu ||
        !sideMenuOverlay
    ) {

        return;
    }


    function openCheckoutMenu() {

        sideMenu.classList.add(
            "open"
        );

        sideMenu.removeAttribute(
            "inert"
        );

        sideMenuOverlay.classList.add(
            "open"
        );

        sideMenu.setAttribute(
            "aria-hidden",
            "false"
        );
    }


    function closeCheckoutMenu() {

        sideMenu.classList.remove(
            "open"
        );

        sideMenu.setAttribute(
            "inert",
            ""
        );

        sideMenuOverlay.classList.remove(
            "open"
        );

        sideMenu.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    menuToggle.addEventListener(
        "click",
        openCheckoutMenu
    );


    if (sideMenuClose) {

        sideMenuClose.addEventListener(
            "click",
            closeCheckoutMenu
        );
    }


    sideMenuOverlay.addEventListener(
        "click",
        closeCheckoutMenu
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        setupCheckoutSideMenu
    );

} else {

    setupCheckoutSideMenu();
}