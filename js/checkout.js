// ==========================================
// AL YOSRA STORE
// Checkout System
// ==========================================


// ==========================================
// قراءة السلة
// ==========================================

const checkoutCart =
    JSON.parse(localStorage.getItem("cart")) || {};


// مكان عرض المنتجات

const orderSummary =
    document.getElementById("orderSummary");


// ==========================================
// عرض ملخص الطلب
// ==========================================

function displayCheckout() {

    if (!orderSummary) return;


    orderSummary.innerHTML = "";


    let totalPrice = 0;


    // --------------------------------------
    // السلة فارغة
    // --------------------------------------

    if (Object.keys(checkoutCart).length === 0) {

        orderSummary.innerHTML = `
            <p style="text-align:center;">
                السلة فارغة
            </p>
        `;

        return;

    }


    // --------------------------------------
    // عرض المنتجات
    // --------------------------------------

    Object.keys(checkoutCart).forEach(id => {

        const product =
            window.products.find(
                p => p.id === String(id)
            );


        if (!product) return;


        const quantity =
            Number(checkoutCart[id]) || 0;


        const price =
            Number(product.price) || 0;


        const subtotal =
            price * quantity;


        totalPrice += subtotal;


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

            <div style="flex:1;padding:0 15px;">

                <h3>
                    ${product.name}
                </h3>

                <p>
                    الكمية: ${quantity}
                </p>

                <p>
                    سعر القطعة: ${price}$
                </p>

            </div>

            <strong>
                ${subtotal}$
            </strong>

        </div>

        `;

    });


    // --------------------------------------
    // المجموع المعروض
    // --------------------------------------

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
// انتظار تحميل المنتجات من Supabase
// ==========================================

document.addEventListener(
    "productsLoaded",
    displayCheckout
);


// إذا كانت المنتجات محملة مسبقاً

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
    document.getElementById("confirmOrder");


if (confirmOrder) {

    confirmOrder.addEventListener(
        "click",
        async function() {


            // ==================================
            // منع الضغط المتكرر
            // ==================================

            if (confirmOrder.disabled) return;


            // ==================================
            // التحقق من وجود المنتجات
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
                Object.keys(checkoutCart).length === 0
            ) {

                alert(
                    "السلة فارغة."
                );

                return;

            }



            // ==================================
            // قراءة بيانات العميل
            // ==================================

            const name =
                document
                    .getElementById("customerName")
                    .value
                    .trim();


            const phone =
                document
                    .getElementById("customerPhone")
                    .value
                    .trim();


            const address =
                document
                    .getElementById("customerAddress")
                    .value
                    .trim();


            const note =
                document
                    .getElementById("customerNote")
                    .value
                    .trim();



            // ==================================
            // التحقق من البيانات المطلوبة
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
            // تجهيز المنتجات لإرسالها إلى Supabase
            // ==================================

            const orderItems = [];


            for (
                const id of Object.keys(checkoutCart)
            ) {

                const product =
                    window.products.find(
                        p => p.id === String(id)
                    );


                if (!product) {

                    alert(
                        "تعذر العثور على أحد المنتجات في قاعدة البيانات."
                    );

                    return;

                }


                const quantity =
                    Number(checkoutCart[id]);


                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {

                    alert(
                        "توجد كمية غير صالحة في السلة."
                    );

                    return;

                }


                orderItems.push({

                    product_id:
                        Number(product.id),

                    quantity:
                        quantity

                });

            }



            // ==================================
            // تغيير حالة الزر أثناء العملية
            // ==================================

            confirmOrder.disabled = true;

            const originalButtonText =
                confirmOrder.textContent;

            confirmOrder.textContent =
                "جاري تأكيد الطلب...";



            try {


                // ==================================
                // إنشاء الطلب داخل Supabase
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
// التحقق من الخطأ
// ==================================

if (error) {

    console.error(
        "Supabase order error:",
        {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code
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
                // بيانات الطلب التي أعادتها قاعدة البيانات
                // ==================================

                const orderNumber =
                    data.order_number;


                const total =
                    Number(data.total) || 0;



// ==================================
// إنشاء رسالة WhatsApp
// ==================================

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


// ==================================
// إضافة المنتجات إلى الرسالة
// ==================================

Object.keys(checkoutCart).forEach(
    id => {

        const product =
            window.products.find(
                p =>
                    p.id === String(id)
            );


        if (!product) return;


        const quantity =
            Number(
                checkoutCart[id]
            ) || 0;


        const price =
            Number(
                product.price
            ) || 0;


        const subtotal =
            price * quantity;


        message +=

`
${product.name}

الكمية: ${quantity}
سعر القطعة: ${price}$
الإجمالي: ${subtotal}$
`;

    }
);


// ==================================
// المجموع النهائي
// ==================================

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



                // ==================================
                // رقم WhatsApp الخاص بالمتجر
                // ==================================

                const whatsappNumber =
                    "963988902539";



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
                // في حال فشل إنشاء الطلب
                // ==================================

                console.error(
                    "خطأ أثناء إنشاء الطلب:",
                    error
                );


                alert(
                    "تعذر تأكيد الطلب حالياً.\n\n" +
                    "يرجى المحاولة مرة أخرى."
                );


                // إعادة الزر إلى حالته الطبيعية

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

customerFields.forEach(id => {

    const field =
        document.getElementById(id);


    if (field) {

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

});



// ==========================================
// استرجاع البيانات المحفوظة
// ==========================================

customerFields.forEach(id => {

    const savedData =
        localStorage.getItem(id);


    const field =
        document.getElementById(id);


    if (
        savedData !== null &&
        field
    ) {

        field.value =
            savedData;

    }

});