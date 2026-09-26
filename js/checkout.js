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
// 3. بيانات Variants المحلية
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

    return snapshots[String(id)] || null;
}


// ==========================================================
// 4. بيانات العروض
// ==========================================================

let checkoutOffers = [];


// ==========================================================
// 5. حالة الطلب
// ==========================================================

let isOrderProcessing = false;


// ==========================================================
// 6. أدوات مساعدة
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
// 7. حماية النصوص المعروضة في HTML
// ==========================================================
//
// بيانات localStorage وبيانات قاعدة البيانات لا يجب أن تدخل
// إلى innerHTML بدون escaping.
// ==========================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================================
// 8. تحميل العروض
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
// 9. تنسيق خيارات Variant
// ==========================================================

function formatVariantSelections(snapshot) {

    if (
        !snapshot ||
        !Array.isArray(snapshot.selections)
    ) {
        return "";
    }

    return snapshot.selections
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
                <span
                    style="
                        display:inline-block;
                        margin:2px 4px 2px 0;
                        padding:4px 8px;
                        border-radius:6px;
                        background:#f3f4f6;
                        font-size:0.9em;
                    "
                >
                    ${groupName}: ${value}
                </span>
            `;
        })
        .join("");
}


// ==========================================================
// 10. التحقق من وجود منتجات عادية فقط
// ==========================================================
//
// الـ Variant لا يحتاج window.products.
// بياناته موجودة في snapshot.
// العرض له مصدره الخاص.
//
// لذلك لا نمنع الطلب لمجرد أن products.js لم يحمل بعد
// إذا كانت السلة تحتوي فقط على Variants/Offers.
// ==========================================================

function cartRequiresProductsData() {

    return getCartEntries().some(
        ({ id }) =>
            !isOfferItem(id) &&
            !isVariantItem(id)
    );
}


// ==========================================================
// 11. عرض ملخص الطلب
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

                const offerName =
                    escapeHtml(
                        offer.name || "عرض"
                    );

                const offerImage =
                    escapeHtml(
                        offer.image || ""
                    );

                orderSummary.innerHTML += `

                    <div class="order-item">

                        ${
                            offerImage
                                ? `
                                    <img
                                        src="${offerImage}"
                                        alt="${offerName}"
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
                                ${offerName}
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
                        snapshot.image || ""
                    );

                const sku =
                    escapeHtml(
                        snapshot.sku || ""
                    );

                const selectionsHtml =
                    formatVariantSelections(
                        snapshot
                    );

                orderSummary.innerHTML += `

                    <div class="order-item">

                        ${
                            image
                                ? `
                                    <img
                                        src="${image}"
                                        alt="${productName}"
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
                                        منتج
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
                                ${productName}
                            </h3>

                            <p>
                                النوع: خيار منتج
                            </p>

                            ${
                                selectionsHtml
                                    ? `
                                        <div
                                            style="
                                                margin:6px 0;
                                            "
                                        >
                                            ${selectionsHtml}
                                        </div>
                                      `
                                    : ""
                            }

                        

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

                return;
            }


            // ==================================================
            // منتج عادي
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
                    product.name || "منتج"
                );

            const productImage =
                escapeHtml(
                    product.image ||
                    product.main_image ||
                    ""
                );

            orderSummary.innerHTML += `

                <div class="order-item">

                    <img
                        src="${productImage}"
                        alt="${productName}"
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
                            ${productName}
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
// 12. تجهيز عناصر الطلب
// ==========================================================
// نرسل IDs والكميات فقط.
//
// السعر والمخزون يتم التحقق منهما داخل create_order.
//
// Variant:
// - product_id = المنتج الأب
// - variant_id = الـ Variant المحدد
// - offer_id = null
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

                    variant_id: null,

                    offer_id:
                        Number(offer.id),

                    quantity
                };
            }


            // ================================================
            // Variant
            // ================================================

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
                    !Number.isInteger(productId) ||
                    productId <= 0 ||
                    !Number.isInteger(variantId) ||
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

                    offer_id: null,

                    quantity
                };
            }


            // ================================================
            // منتج عادي
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

                variant_id: null,

                offer_id: null,

                quantity
            };
        }
    );
}


// ==========================================================
// 13. بيانات العميل
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
// 14. التحقق من بيانات العميل
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
// 15. بناء رسالة WhatsApp
// ==========================================================
// هذا المسار مستقل عن Telegram.
//
// ملاحظة:
// السعر هنا للعرض في الرسالة فقط.
// السعر النهائي الذي تم اعتماده للطلب هو total الناتج
// من create_order.
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
            // Variant
            // ================================================

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
                        `   SKU: ${
                            snapshot.sku
                        }\n`;
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


            // ================================================
            // منتج عادي
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
// 16. التحكم بالأزرار
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
// 17. معالجة الطلب
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
    // التحقق من البيانات المطلوبة
    // ------------------------------------------------------
    //
    // المنتج العادي يحتاج window.products.
    //
    // Variant يعتمد على snapshot المحلي.
    // العرض يعتمد على checkoutOffers.
    // ------------------------------------------------------

    if (
        cartRequiresProductsData() &&
        (
            !Array.isArray(window.products) ||
            window.products.length === 0
        )
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
// 18. ربط الأزرار
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
// 19. تحميل المنتجات
// ==========================================================

document.addEventListener(
    "productsLoaded",
    () => {
        displayCheckout();
    }
);


// ==========================================================
// 20. تحميل الصفحة
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCheckoutOffers();

        displayCheckout();
    }
);


// ==========================================================
// 21. إذا كانت المنتجات محملة مسبقًا
// ==========================================================

if (
    Array.isArray(window.products) &&
    window.products.length > 0
) {

    displayCheckout();
}


// ==========================================================
// 22. حفظ بيانات العميل
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
// 23. زر العودة للرئيسية
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