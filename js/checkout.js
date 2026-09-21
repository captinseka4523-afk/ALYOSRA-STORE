// ==========================================================
// AL YOSRA STORE — CHECKOUT
// Products + Offers + WhatsApp
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
// ==========================================================


// ==========================================================
// 1. عناصر الصفحة
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
// 2. بيانات السلة
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
// 3. بيانات العروض
// ==========================================================

let checkoutOffers = [];


// ==========================================================
// 4. حالة الطلب
// ==========================================================

let isOrderProcessing = false;


// ==========================================================
// 5. أدوات مساعدة
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


function getProduct(productId) {

    if (
        !Array.isArray(window.products)
    ) {
        return null;
    }

    return window.products.find(
        product =>
            String(product.id) ===
            String(productId)
    ) || null;
}


function getOffer(offerId) {

    return checkoutOffers.find(
        offer =>
            String(offer.id) ===
            String(offerId)
    ) || null;
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
// 6. تحميل العروض
// ==========================================================

async function loadCheckoutOffers() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("offers")
            .select(`
                id,
                name,
                price,
                image,
                active
            `)
            .eq("active", true);

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
// 7. عرض ملخص الطلب
// ==========================================================

function displayCheckout() {

    if (!orderSummary) {
        return;
    }

    orderSummary.innerHTML = "";

    const entries =
        getCartEntries();

    if (entries.length === 0) {

        orderSummary.innerHTML = `
            <p style="text-align:center;">
                السلة فارغة
            </p>
        `;

        if (checkoutFinalTotal) {
            checkoutFinalTotal.textContent =
                "0.00 $";
        }

        return;
    }

    let displayTotal = 0;

    entries.forEach(
        ({
            id,
            quantity
        }) => {

            // ==================================================
            // عرض
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

                orderSummary.innerHTML += `

                    <div class="order-item">

                        ${
                            offer.image
                                ? `
                                    <img
                                        src="${offer.image}"
                                        alt="${offer.name || "عرض"}"
                                        style="
                                            width:80px;
                                            height:80px;
                                            object-fit:contain;
                                        "
                                    >
                                  `
                                : `
                                    <div
                                        style="
                                            width:80px;
                                            height:80px;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            background:#f3f4f6;
                                            border-radius:10px;
                                        "
                                    >
                                        عرض
                                    </div>
                                  `
                        }

                        <div
                            style="
                                flex:1;
                                padding:0 15px;
                            "
                        >

                            <h3>
                                ${offer.name || "عرض"}
                            </h3>

                            <p>
                                النوع: عرض
                            </p>

                            <p>
                                الكمية: ${quantity}
                            </p>

                            <p>
                                سعر العرض:
                                ${formatPrice(price)}$
                            </p>

                        </div>

                        <strong>
                            ${formatPrice(subtotal)}$
                        </strong>

                    </div>
                `;

                return;
            }


            // ==================================================
            // منتج
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

            orderSummary.innerHTML += `

                <div class="order-item">

                    <img
                        src="${
                            product.image ||
                            product.main_image ||
                            ""
                        }"
                        alt="${product.name || "منتج"}"
                        style="
                            width:80px;
                            height:80px;
                            object-fit:contain;
                        "
                    >

                    <div
                        style="
                            flex:1;
                            padding:0 15px;
                        "
                    >

                        <h3>
                            ${product.name || "منتج"}
                        </h3>

                        <p>
                            الكمية: ${quantity}
                        </p>

                        <p>
                            سعر القطعة:
                            ${formatPrice(price)}$
                        </p>

                    </div>

                    <strong>
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
// 8. تجهيز عناصر الطلب
// ==========================================================
// نرسل IDs والكميات فقط.
// السعر والمخزون يتم التحقق منهما داخل create_order.
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
        ({
            id,
            quantity
        }) => {

            // ================================================
            // عرض
            // ================================================

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

                    offer_id:
                        Number(offer.id),

                    quantity
                };
            }


            // ================================================
            // منتج
            // ================================================

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

                offer_id: null,

                quantity
            };
        }
    );
}


// ==========================================================
// 9. بيانات العميل
// ==========================================================

function getCustomerData() {

    return {

        name:
            document
                .getElementById("customerName")
                ?.value
                .trim() || "",

        phone:
            document
                .getElementById("customerPhone")
                ?.value
                .trim() || "",

        address:
            document
                .getElementById("customerAddress")
                ?.value
                .trim() || "",

        note:
            document
                .getElementById("customerNote")
                ?.value
                .trim() || ""
    };
}


// ==========================================================
// 10. التحقق من بيانات العميل
// ==========================================================

function validateCustomer(customer) {

    if (!customer.name) {

        return {
            valid: false,
            message: "يرجى إدخال الاسم."
        };
    }

    if (!customer.phone) {

        return {
            valid: false,
            message: "يرجى إدخال رقم الهاتف."
        };
    }

    if (!customer.address) {

        return {
            valid: false,
            message: "يرجى إدخال العنوان."
        };
    }

    return {
        valid: true,
        message: ""
    };
}


// ==========================================================
// 11. بناء رسالة WhatsApp
// ==========================================================
// هذا المسار مستقل عن Telegram.
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
            customer.note || "لا توجد"
        }\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 *تفاصيل الطلب:*\n`;

    getCartEntries().forEach(
        ({
            id,
            quantity
        }) => {

            // ================================================
            // عرض
            // ================================================

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
                        offer.name || "عرض"
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


            // ================================================
            // منتج
            // ================================================

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
                    product.name || "منتج"
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
// 12. التحكم بالأزرار
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
// 13. معالجة الطلب
// ==========================================================

async function processOrder(orderType) {

    // ------------------------------------------------------
    // منع الضغط المكرر
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // التحقق من السلة
    // ------------------------------------------------------

    if (
        getCartEntries().length === 0
    ) {

        alert(
            "السلة فارغة."
        );

        return;
    }


    // ------------------------------------------------------
    // التحقق من تحميل المنتجات
    // ------------------------------------------------------

    if (
        !Array.isArray(window.products) ||
        window.products.length === 0
    ) {

        alert(
            "لم يتم تحميل المنتجات بعد. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى."
        );

        return;
    }


    // ------------------------------------------------------
    // بيانات العميل
    // ------------------------------------------------------

    const customer =
        getCustomerData();


    const validation =
        validateCustomer(customer);


    if (!validation.valid) {

        alert(
            validation.message
        );

        return;
    }


    // ------------------------------------------------------
    // تجهيز عناصر الطلب
    // ------------------------------------------------------

    let orderItems;


    try {

        orderItems =
            prepareOrderItems();

    } catch (error) {

        console.error(
            "خطأ في تجهيز عناصر الطلب:",
            error
        );

        alert(
            error.message ||
            "تعذر تجهيز الطلب."
        );

        return;
    }


    // ------------------------------------------------------
    // بدء العملية
    // ------------------------------------------------------

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

        // ==================================================
        // 1. إنشاء الطلب
        // ==================================================
        //
        // create_order هي المصدر الوحيد للحقيقة.
        //
        // السعر النهائي والمخزون يحسبان داخل PostgreSQL.
        // ==================================================

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "create_order",
            {
                p_customer_name:
                    customer.name,

                p_customer_phone:
                    customer.phone,

                p_customer_address:
                    customer.address,

                p_customer_note:
                    customer.note || null,

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
            Number(data.order_id);


        const orderNumber =
            data.order_number;


        const total =
            Number(data.total) || 0;


        if (
            !Number.isInteger(orderId) ||
            orderId <= 0 ||
            !orderNumber
        ) {

            throw new Error(
                "تم إنشاء الطلب ولكن بيانات الطلب الناتجة غير مكتملة."
            );
        }


        // ==================================================
        // 2. حفظ رقم الطلب
        // ==================================================

        localStorage.setItem(
            "orderId",
            String(orderNumber)
        );


        // ==================================================
        // 3. مسار WhatsApp
        // ==================================================
        //
        // WhatsApp يحتاج الرسالة التي سيقوم المستخدم
        // بإرسالها يدويًا، لذلك يبقى هذا المسار مستقلًا.
        // ==================================================

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


            // الطلب أصبح مسجلًا بنجاح.
            // إزالة السلة المحلية قبل الانتقال.

            localStorage.removeItem(
                "cart"
            );


            window.location.href =
                "order-success.html";


            return;
        }


        // ==================================================
        // 4. إنهاء عملية العميل بعد نجاح create_order
        // ==================================================
        //
        // Telegram يتم إرساله تلقائيًا من قاعدة البيانات
        // عبر Trigger + pg_net بعد اكتمال عملية إنشاء الطلب.
        //
        // لا يوجد أي انتظار أو استدعاء Telegram من المتصفح.
        // ==================================================

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


        // --------------------------------------------------
        // العملية انتهت من وجهة نظر العميل.
        // --------------------------------------------------

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


        alert(
            "تعذر تأكيد الطلب حالياً.\n\nيرجى المحاولة مرة أخرى."
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
// 14. ربط الأزرار
// ==========================================================

if (confirmOrderBtn) {

    confirmOrderBtn.addEventListener(
        "click",
        () => processOrder("telegram")
    );
}


if (whatsappOrderBtn) {

    whatsappOrderBtn.addEventListener(
        "click",
        () => processOrder("whatsapp")
    );
}


// ==========================================================
// 15. تحميل المنتجات
// ==========================================================

document.addEventListener(
    "productsLoaded",
    () => {
        displayCheckout();
    }
);


// ==========================================================
// 16. تحميل الصفحة
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCheckoutOffers();

        displayCheckout();
    }
);


// ==========================================================
// 17. إذا كانت المنتجات محملة مسبقًا
// ==========================================================

if (
    Array.isArray(window.products) &&
    window.products.length > 0
) {

    displayCheckout();
}


// ==========================================================
// 18. حفظ بيانات العميل
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
            document.getElementById(id);

        if (!field) {
            return;
        }


        const savedValue =
            localStorage.getItem(id);


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
// 19. زر العودة للرئيسية
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