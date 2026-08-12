// ==========================================
// AL YOSRA STORE
// Checkout System
// Products + Offers
// ==========================================


// ==========================================
// قراءة السلة
// ==========================================

const checkoutCart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || {};


// ==========================================
// مكان عرض ملخص الطلب
// ==========================================

const orderSummary =
    document.getElementById(
        "orderSummary"
    );


// ==========================================
// بيانات العروض
// ==========================================

let checkoutOffers = [];


// ==========================================
// تحميل العروض
// ==========================================

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
            data || [];


    } catch (error) {

        console.error(
            "خطأ في تحميل العروض:",
            error
        );

        checkoutOffers = [];

    }


    displayCheckout();

}


// ==========================================
// عرض ملخص الطلب
// ==========================================

function displayCheckout() {

    if (!orderSummary) return;


    orderSummary.innerHTML = "";


    let totalPrice = 0;


    // ======================================
    // السلة فارغة
    // ======================================

    if (
        Object.keys(
            checkoutCart
        ).length === 0
    ) {

        orderSummary.innerHTML = `
            <p style="text-align:center;">
                السلة فارغة
            </p>
        `;

        return;

    }


    // ======================================
    // عرض عناصر السلة
    // ======================================

    Object.keys(
        checkoutCart
    ).forEach(
        id => {

            const quantity =
                Number(
                    checkoutCart[id]
                ) || 0;


            if (
                quantity <= 0
            ) {

                return;

            }


            // ==================================
            // العرض
            // ==================================

            if (
                String(id).startsWith(
                    "offer_"
                )
            ) {

                const offerId =
                    String(id).replace(
                        "offer_",
                        ""
                    );


                const offer =
                    checkoutOffers.find(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                offerId
                            )
                    );


                if (!offer) {

                    return;

                }


                const price =
                    Number(
                        offer.price
                    ) || 0;


                const subtotal =
                    price * quantity;


                totalPrice +=
                    subtotal;


                orderSummary.innerHTML += `

                <div class="order-item">

                    ${
                        offer.image
                            ? `
                                <img
                                    src="${offer.image}"
                                    alt="${offer.name}"
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
                            ${offer.name}
                        </h3>


                        <p>
                            النوع: عرض
                        </p>


                        <p>
                            الكمية:
                            ${quantity}
                        </p>


                        <p>
                            سعر العرض:
                            ${price}$
                        </p>

                    </div>


                    <strong>
                        ${subtotal}$
                    </strong>

                </div>

                `;


                return;

            }


            // ==================================
            // المنتج العادي
            // ==================================

            const product =
                window.products.find(
                    p =>
                        p.id ===
                        String(id)
                );


            if (!product) {

                return;

            }


            const price =
                Number(
                    product.price
                ) || 0;


            const subtotal =
                price * quantity;


            totalPrice +=
                subtotal;


            orderSummary.innerHTML += `

            <div class="order-item">

                <img
                    src="${product.image}"
                    alt="${product.name}"
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
                        ${product.name}
                    </h3>


                    <p>
                        الكمية:
                        ${quantity}
                    </p>


                    <p>
                        سعر القطعة:
                        ${price}$
                    </p>

                </div>


                <strong>
                    ${subtotal}$
                </strong>

            </div>

            `;

        }
    );


    // ======================================
    // المجموع
    // ======================================

    orderSummary.innerHTML += `

        <hr>

        <h2 style="text-align:center;">

            المجموع التقديري:

            <span style="color:#2563eb;">

                ${totalPrice}$

            </span>

        </h2>

        <p style="
            text-align:center;
            font-size:14px;
            opacity:0.75;
        ">

            يتم اعتماد السعر النهائي عند تأكيد الطلب.

        </p>

    `;

}


// ==========================================
// تجهيز عناصر الطلب
// ==========================================

function prepareOrderItems() {

    const orderItems = [];


    for (
        const id of Object.keys(
            checkoutCart
        )
    ) {

        const quantity =
            Number(
                checkoutCart[id]
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0
        ) {

            throw new Error(
                "توجد كمية غير صالحة في السلة."
            );

        }


        // ==================================
        // عرض
        // ==================================

        if (
            String(id).startsWith(
                "offer_"
            )
        ) {

            const offerId =
                String(id).replace(
                    "offer_",
                    ""
                );


            const offer =
                checkoutOffers.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            offerId
                        )
                );


            if (!offer) {

                throw new Error(
                    "تعذر العثور على أحد العروض."
                );

            }


            orderItems.push({

                product_id: null,

                offer_id:
                    Number(
                        offer.id
                    ),

                quantity:
                    quantity

            });


            continue;

        }


        // ==================================
        // منتج عادي
        // ==================================

        const product =
            window.products.find(
                p =>
                    p.id ===
                    String(id)
            );


        if (!product) {

            throw new Error(
                "تعذر العثور على أحد المنتجات في قاعدة البيانات."
            );

        }


        orderItems.push({

            product_id:
                Number(
                    product.id
                ),

            offer_id: null,

            quantity:
                quantity

        });

    }


    return orderItems;

}


// ==========================================
// إنشاء رسالة WhatsApp
// ==========================================

function buildWhatsAppMessage(
    orderNumber,
    total,
    name,
    phone,
    address,
    note
) {

    let message =

`متجر اليُسرى

━━━━━━━━━━━━━━━━━━

طلب جديد

رقم الطلب:
${orderNumber}

بيانات العميل

الاسم:
${name}

رقم الهاتف:
${phone}

العنوان:
${address}

━━━━━━━━━━━━━━━━━━

تفاصيل الطلب

`;


    // ======================================
    // إضافة عناصر السلة
    // ======================================

    Object.keys(
        checkoutCart
    ).forEach(
        id => {

            const quantity =
                Number(
                    checkoutCart[id]
                ) || 0;


            if (
                quantity <= 0
            ) {

                return;

            }


            // ==================================
            // عرض
            // ==================================

            if (
                String(id).startsWith(
                    "offer_"
                )
            ) {

                const offerId =
                    String(id).replace(
                        "offer_",
                        ""
                    );


                const offer =
                    checkoutOffers.find(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                offerId
                            )
                    );


                const offerName =
                    offer?.name ||
                    `العرض رقم ${offerId}`;


                const offerPrice =
                    Number(
                        offer?.price
                    ) || 0;


                const subtotal =
                    offerPrice *
                    quantity;


                message +=

`
${offerName}

النوع: عرض
الكمية: ${quantity}
سعر العرض: ${offerPrice}$
الإجمالي: ${subtotal}$
`;

                return;

            }


            // ==================================
            // منتج عادي
            // ==================================

            const product =
                window.products.find(
                    p =>
                        p.id ===
                        String(id)
                );


            if (!product) {

                return;

            }


            const price =
                Number(
                    product.price
                ) || 0;


            const subtotal =
                price *
                quantity;


            message +=

`
${product.name}

الكمية: ${quantity}
سعر القطعة: ${price}$
الإجمالي: ${subtotal}$
`;

        }
    );


    // ======================================
    // المجموع النهائي
    // ======================================

    message +=

`
━━━━━━━━━━━━━━━━━━

المجموع الكلي:
${total}$

ملاحظات:
${note || "لا توجد ملاحظات"}

━━━━━━━━━━━━━━━━━━

شكراً لاختياركم متجر اليُسرى

نتمنى لكم تجربة موفقة.
`;


    return message;

}


// ==========================================
// انتظار تحميل المنتجات
// ==========================================

document.addEventListener(
    "productsLoaded",
    function() {

        displayCheckout();

    }
);


// ==========================================
// بدء الصفحة
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadCheckoutOffers();

    }
);


// ==========================================
// إذا كانت المنتجات محملة مسبقًا
// ==========================================

if (
    window.products &&
    window.products.length > 0
) {

    displayCheckout();

}


// ==========================================
// زر تأكيد الطلب
// ==========================================

const confirmOrder =
    document.getElementById(
        "confirmOrder"
    );


if (confirmOrder) {

    confirmOrder.addEventListener(
        "click",
        async function() {


            // ==================================
            // منع الضغط المتكرر
            // ==================================

            if (
                confirmOrder.disabled
            ) {

                return;

            }


            // ==================================
            // التحقق من تحميل المنتجات
            // ==================================

            if (
                !window.products ||
                window.products.length === 0
            ) {

                alert(
                    "لم يتم تحميل المنتجات بعد. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى."
                );

                return;

            }


            // ==================================
            // التحقق من السلة
            // ==================================

            if (
                Object.keys(
                    checkoutCart
                ).length === 0
            ) {

                alert(
                    "السلة فارغة."
                );

                return;

            }


            // ==================================
            // بيانات العميل
            // ==================================

            const name =
                document
                    .getElementById(
                        "customerName"
                    )
                    .value
                    .trim();


            const phone =
                document
                    .getElementById(
                        "customerPhone"
                    )
                    .value
                    .trim();


            const address =
                document
                    .getElementById(
                        "customerAddress"
                    )
                    .value
                    .trim();


            const note =
                document
                    .getElementById(
                        "customerNote"
                    )
                    .value
                    .trim();


            // ==================================
            // التحقق من البيانات
            // ==================================

            if (
                !name ||
                !phone ||
                !address
            ) {

                alert(
                    "يرجى تعبئة الاسم ورقم الهاتف والعنوان."
                );

                return;

            }


            // ==================================
            // تجهيز عناصر الطلب
            // ==================================

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
                    error.message
                );

                return;

            }


            // ==================================
            // تغيير حالة الزر
            // ==================================

            confirmOrder.disabled =
                true;


            const originalButtonText =
                confirmOrder.textContent;


            confirmOrder.textContent =
                "جاري تأكيد الطلب...";


            try {


                // ==================================
                // إنشاء الطلب في Supabase
                // ==================================

                const {
                    data,
                    error
                } =
                    await supabaseClient.rpc(
                        "create_order",
                        {

                            p_customer_name:
                                name,

                            p_customer_phone:
                                phone,

                            p_customer_address:
                                address,

                            p_customer_note:
                                note || null,

                            p_items:
                                orderItems

                        }
                    );


                // ==================================
                // التحقق من خطأ Supabase
                // ==================================

                if (error) {

                    console.error(
                        "Supabase order error:",
                        {
                            message:
                                error?.message,

                            details:
                                error?.details,

                            hint:
                                error?.hint,

                            code:
                                error?.code
                        }
                    );


                    throw error;

                }


                // ==================================
                // التحقق من نتيجة الدالة
                // ==================================

                if (
                    !data ||
                    data.success !== true
                ) {

                    throw new Error(
                        "لم يتم إنشاء الطلب بشكل صحيح."
                    );

                }


                // ==================================
                // بيانات الطلب
                // ==================================

                const orderNumber =
                    data.order_number;


                const total =
                    Number(
                        data.total
                    ) || 0;


                // ==================================
                // رسالة WhatsApp
                // ==================================

                const message =
                    buildWhatsAppMessage(
                        orderNumber,
                        total,
                        name,
                        phone,
                        address,
                        note
                    );


                // ==================================
                // رقم WhatsApp
                // ==================================

                const whatsappNumber =
                    "963988902539";


                // المتغير محفوظ للاستخدام لاحقًا
                // في صفحة نجاح الطلب

                console.log(
                    "WhatsApp:",
                    whatsappNumber
                );


                // ==================================
                // حفظ بيانات الطلب
                // ==================================

                localStorage.setItem(
                    "orderId",
                    orderNumber
                );


                localStorage.setItem(
                    "whatsappMessage",
                    message
                );


                // ==================================
                // الانتقال إلى صفحة نجاح الطلب
                // ==================================

                window.location.href =
                    "order-success.html";


            } catch (error) {


                // ==================================
                // فشل إنشاء الطلب
                // ==================================

                console.error(
                    "خطأ أثناء إنشاء الطلب:",
                    error
                );


                alert(
                    "تعذر تأكيد الطلب حالياً.\n\n" +
                    "يرجى المحاولة مرة أخرى."
                );


                confirmOrder.disabled =
                    false;


                confirmOrder.textContent =
                    originalButtonText;

            }

        }
    );

}


// ==========================================
// حقول العميل
// ==========================================

const customerFields = [

    "customerName",

    "customerPhone",

    "customerAddress",

    "customerNote"

];


// ==========================================
// حفظ البيانات أثناء الكتابة
// ==========================================

customerFields.forEach(
    id => {

        const field =
            document.getElementById(
                id
            );


        if (field) {

            field.addEventListener(
                "input",
                function() {

                    localStorage.setItem(
                        id,
                        field.value
                    );

                }
            );

        }

    }
);


// ==========================================
// استرجاع البيانات المحفوظة
// ==========================================

customerFields.forEach(
    id => {

        const savedData =
            localStorage.getItem(
                id
            );


        const field =
            document.getElementById(
                id
            );


        if (
            savedData !== null &&
            field
        ) {

            field.value =
                savedData;

        }

    }
);