const userCart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || {};


const cartContainer =
    document.getElementById("cartContainer");

const cartTotal =
    document.getElementById("cartTotal");


// ==========================================
// تنظيف أخطاء الأرقام العشرية في JavaScript
// بدون تغيير الدقة الأصلية للسعر
// ==========================================

function cleanPrice(value) {

    return Number(
        Number(value || 0).toPrecision(15)
    );

}


// ==========================================
// رسالة غير مزعجة داخل السلة
// ==========================================

let cartToastTimer;

function showCartToast(message) {

    let toast =
        document.getElementById("cartToast");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id = "cartToast";

        toast.className = "cart-toast";

        document.body.appendChild(toast);

    }


    toast.textContent = message;

    toast.classList.add("show");


    clearTimeout(cartToastTimer);


    cartToastTimer =
        setTimeout(
            () => {

                toast.classList.remove("show");

            },
            2500
        );

}


// ==========================================
// العروض المحملة
// ==========================================

let offers = [];


// ==========================================
// حفظ السلة
// ==========================================

function saveCart() {

    localStorage.setItem(
        "cart",
        JSON.stringify(userCart)
    );


    if (
        typeof updateCartCount ===
        "function"
    ) {

        updateCartCount();

    }

}


// ==========================================
// تحميل العروض من Supabase
// ==========================================

async function loadOffersForCart() {

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
                active,
                quantity,
                offer_items (
                    product_id,
                    quantity
                )
            `)

            .eq(
                "active",
                true
            );


        if (error) {

            throw error;

        }


        offers = data || [];


    } catch (error) {

        console.error(
            "خطأ في تحميل العروض للسلة:",
            error
        );

        offers = [];

    }


    displayCart();

}


// ==========================================
// عرض السلة
// ==========================================

function displayCart() {

    if (!cartContainer) return;


    cartContainer.innerHTML = "";


    if (
        Object.keys(userCart).length === 0
    ) {

        cartContainer.innerHTML = `
            <div class="empty-cart">
                السلة فارغة
            </div>
        `;


        if (cartTotal) {

            cartTotal.textContent =
                "0$";

        }

        return;

    }


    let total = 0;


    Object.keys(userCart).forEach(
        id => {

            const quantity =
                Number(userCart[id]) || 0;


            if (quantity <= 0) {

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
                    offers.find(
                        item =>
                            String(item.id) ===
                            String(offerId)
                    );


                if (!offer) {

                    return;

                }


                const price =
                    Number(
                        offer.price
                    ) || 0;


                const subtotal =
                    cleanPrice(
                        price * quantity
                    );


                total =
                    cleanPrice(
                        total + subtotal
                    );


                cartContainer.innerHTML += `

                    <div
                        class="cart-item offer-cart-item"
                    >

                        ${
                            offer.image
                                ? `
                                    <img
                                        src="${offer.image}"
                                        alt="${offer.name}"
                                    >
                                  `
                                : `
                                    <div
                                        class="cart-offer-placeholder"
                                    >
                                        عرض
                                    </div>
                                  `
                        }


                        <div class="cart-info">

                            <h3>
                                ${offer.name}
                            </h3>


                            <p>
                                عرض خاص:
                                ${cleanPrice(offer.price)} $
                            </p>


                            <div class="quantity-box">

                                <button
                                    class="quantity-btn plus"
                                    data-id="${id}"
                                    type="button"
                                >
                                    +
                                </button>


                                <span>
                                    ${quantity}
                                </span>


                                <button
                                    class="quantity-btn minus"
                                    data-id="${id}"
                                    type="button"
                                >
                                    -
                                </button>

                            </div>


                            <button
                                class="remove-btn"
                                data-id="${id}"
                                type="button"
                            >
                                حذف
                            </button>

                        </div>

                    </div>

                `;


                return;

            }


            // ==================================
            // المنتج العادي
            // ==================================

            const product =
                window.products.find(
                    item =>
                        String(item.id) ===
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
                cleanPrice(
                    price * quantity
                );


            total =
                cleanPrice(
                    total + subtotal
                );


            cartContainer.innerHTML += `

                <div class="cart-item">

                    <img
                        src="${product.image}"
                        alt="${product.name}"
                    >


                    <div class="cart-info">

                        <h3>
                            ${product.name}
                        </h3>


                        <p>
                            السعر:
                            ${cleanPrice(product.price)} $
                        </p>


                        <div class="quantity-box">

                            <button
                                class="quantity-btn plus"
                                data-id="${id}"
                                type="button"
                            >
                                +
                            </button>


                            <span>
                                ${quantity}
                            </span>


                            <button
                                class="quantity-btn minus"
                                data-id="${id}"
                                type="button"
                            >
                                -
                            </button>

                        </div>


                        <button
                            class="remove-btn"
                            data-id="${id}"
                            type="button"
                        >
                            حذف
                        </button>

                    </div>

                </div>

            `;

        }
    );


    // ==================================
    // المجموع
    // ==================================

    if (cartTotal) {

        cartTotal.textContent =
            cleanPrice(total) + "$";

    }

}


// ==========================================
// حساب الحد الأقصى للعرض
// ==========================================

function getMaxOfferQuantity(offer) {

    if (!offer) {

        return 0;

    }


    // مخزون العرض مستقل عن مخزون المنتجات

    const availableQuantity =
        Number(offer.quantity) || 0;


    return Math.max(
        0,
        availableQuantity
    );

}


// ==========================================
// أزرار السلة
// ==========================================

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                ".quantity-btn, .remove-btn"
            );


        if (!button) return;


        const id =
            button.dataset.id;


        if (!id) return;


        const isOffer =
            String(id).startsWith(
                "offer_"
            );


        // ==================================
        // زيادة الكمية
        // ==================================

        if (
            button.classList.contains(
                "plus"
            )
        ) {

            // ------------------------------
            // عرض
            // ------------------------------

            if (isOffer) {

                const offerId =
                    String(id).replace(
                        "offer_",
                        ""
                    );


                const offer =
                    offers.find(
                        item =>
                            String(item.id) ===
                            String(offerId)
                    );


                if (!offer) {

                    showCartToast(
                        "تعذر العثور على بيانات العرض."
                    );

                    return;

                }


                const currentQuantity =
                    Number(
                        userCart[id]
                    ) || 0;


                const maxQuantity =
                    getMaxOfferQuantity(
                        offer
                    );


                if (
                    maxQuantity <= 0
                ) {

                    showCartToast(
                        "لا يمكن إضافة المزيد من هذا العرض لأن مخزونه غير متوفر."
                    );

                    return;

                }


                if (
                    currentQuantity >=
                    maxQuantity
                ) {

                    showCartToast(
                        `الحد الأقصى المتاح من هذا العرض هو ${maxQuantity}.`
                    );

                    return;

                }


                userCart[id] =
                    currentQuantity + 1;


                saveCart();
                displayCart();


                return;

            }


            // ------------------------------
            // منتج عادي
            // ------------------------------

            const product =
                window.products.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );


            if (!product) {

                return;

            }


            const currentQuantity =
                Number(
                    userCart[id]
                ) || 0;


            const availableQuantity =
                Number(
                    product.quantity
                ) || 0;


            if (
                currentQuantity <
                availableQuantity
            ) {

                userCart[id] =
                    currentQuantity + 1;


                saveCart();
                displayCart();

            } else {

                showCartToast(
                    "لا توجد كمية إضافية متوفرة في المخزون."
                );

            }


            return;

        }


        // ==================================
        // إنقاص الكمية
        // ==================================

        if (
            button.classList.contains(
                "minus"
            )
        ) {

            const currentQuantity =
                Number(
                    userCart[id]
                ) || 0;


            if (
                currentQuantity > 1
            ) {

                userCart[id] =
                    currentQuantity - 1;

            } else {

                delete userCart[id];

            }


            saveCart();
            displayCart();


            return;

        }


        // ==================================
        // حذف العنصر
        // ==================================

        if (
            button.classList.contains(
                "remove-btn"
            )
        ) {

            delete userCart[id];


            saveCart();
            displayCart();

        }

    }
);


// ==========================================
// انتظار تحميل المنتجات
// ==========================================

document.addEventListener(
    "productsLoaded",
    function() {

        displayCart();

    }
);


// ==========================================
// بدء الصفحة
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadOffersForCart();

    }
);