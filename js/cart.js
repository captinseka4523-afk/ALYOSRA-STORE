// ==========================================
// AL YOSRA STORE - Cart Logic
// Local Cart Data — No Supabase Requests
// ==========================================


// ==========================================
// مفاتيح الكاش والـSnapshots
// ==========================================

const PRODUCTS_CACHE_KEY =
    "alYosraProductsCache_v1";

const OFFERS_CACHE_KEY =
    "alYosraOffersCache_v1";

const VARIANT_CART_SNAPSHOTS_KEY =
    "alYosraVariantCartSnapshots_v1";

const OFFER_CART_SNAPSHOTS_KEY =
    "alYosraOfferCartSnapshots_v1";


// ==========================================
// قراءة السلة
// ==========================================

const userCart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || {};


// ==========================================
// عناصر الصفحة
// ==========================================

const cartContainer =
    document.getElementById("cartContainer");

const cartTotal =
    document.getElementById("cartTotal");


// ==========================================
// أدوات القراءة المحلية
// ==========================================

function readLocalJSON(
    key,
    fallback
) {
    try {

        const raw =
            localStorage.getItem(key);


        if (!raw) {
            return fallback;
        }


        const parsed =
            JSON.parse(raw);


        if (
            parsed === null ||
            parsed === undefined
        ) {
            return fallback;
        }


        return parsed;

    } catch (error) {

        console.warn(
            `تعذر قراءة البيانات المحلية: ${key}`,
            error
        );

        return fallback;
    }
}


// ==========================================
// كاش المنتجات
// ==========================================

function getCachedProducts() {

    const cache =
        readLocalJSON(
            PRODUCTS_CACHE_KEY,
            null
        );


    if (
        !cache ||
        !Array.isArray(
            cache.products
        )
    ) {

        return [];
    }


    return cache.products;
}


// ==========================================
// كاش العروض
// ==========================================

function getCachedOffers() {

    const cache =
        readLocalJSON(
            OFFERS_CACHE_KEY,
            null
        );


    if (
        !cache ||
        !Array.isArray(
            cache.offers
        )
    ) {

        return [];
    }


    return cache.offers;
}


// ==========================================
// Snapshots الخاصة بالـVariants
// ==========================================

function getVariantSnapshots() {

    const snapshots =
        readLocalJSON(
            VARIANT_CART_SNAPSHOTS_KEY,
            {}
        );


    if (
        !snapshots ||
        typeof snapshots !== "object" ||
        Array.isArray(snapshots)
    ) {

        return {};
    }


    return snapshots;
}


// ==========================================
// Snapshots الخاصة بالعروض
// ==========================================

function getOfferSnapshots() {

    const snapshots =
        readLocalJSON(
            OFFER_CART_SNAPSHOTS_KEY,
            {}
        );


    if (
        !snapshots ||
        typeof snapshots !== "object" ||
        Array.isArray(snapshots)
    ) {

        return {};
    }


    return snapshots;
}


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
// تنظيف الأسعار
// ==========================================

function cleanPrice(value) {

    return Number(
        Number(
            value || 0
        ).toPrecision(15)
    );
}


// ==========================================
// Toast
// ==========================================

let cartToastTimer;


function showCartToast(message) {

    let toast =
        document.getElementById(
            "cartToast"
        );


    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "cartToast";

        toast.className =
            "cart-toast";

        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        cartToastTimer
    );


    cartToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
}


// ==========================================
// العثور على المنتج المحلي
// ==========================================

function getLocalProduct(
    productId
) {

    const products =
        getCachedProducts();


    return (
        products.find(
            product =>
                String(product.id) ===
                String(productId)
        ) || null
    );
}


// ==========================================
// العثور على العرض محليًا
//
// الأولوية:
// 1. Offers Cache
// 2. Offer Snapshot
// ==========================================

function getLocalOffer(
    offerId
) {

    const offers =
        getCachedOffers();


    const cachedOffer =
        offers.find(
            offer =>
                String(offer.id) ===
                String(offerId)
        );


    if (cachedOffer) {
        return cachedOffer;
    }


    const snapshots =
        getOfferSnapshots();


    return (
        snapshots[
            `offer_${offerId}`
        ] || null
    );
}


// ==========================================
// العثور على Variant Snapshot
// ==========================================

function getLocalVariant(
    cartKey
) {

    const snapshots =
        getVariantSnapshots();


    return (
        snapshots[cartKey] ||
        null
    );
}


// ==========================================
// عرض خيارات الـVariant
// ==========================================

function createVariantSelectionsHTML(
    selections
) {

    if (
        !Array.isArray(selections) ||
        selections.length === 0
    ) {

        return "";
    }


    return `
        <div class="cart-variant-options">
            ${selections
                .map(selection => `
                    <div class="cart-variant-option">
                        <span>
                            ${selection.groupName || ""}
                        </span>

                        <strong>
                            ${selection.value || ""}
                        </strong>
                    </div>
                `)
                .join("")
            }
        </div>
    `;
}


// ==========================================
// تنظيف Snapshots التي لم تعد موجودة في السلة
// ==========================================

function cleanupUnusedSnapshots() {

    const variantSnapshots =
        getVariantSnapshots();

    const offerSnapshots =
        getOfferSnapshots();


    let variantsChanged = false;
    let offersChanged = false;


    Object.keys(
        variantSnapshots
    ).forEach(key => {

        if (
            !Object.prototype.hasOwnProperty.call(
                userCart,
                key
            )
        ) {

            delete variantSnapshots[key];

            variantsChanged = true;
        }

    });


    Object.keys(
        offerSnapshots
    ).forEach(key => {

        if (
            !Object.prototype.hasOwnProperty.call(
                userCart,
                key
            )
        ) {

            delete offerSnapshots[key];

            offersChanged = true;
        }

    });


    if (variantsChanged) {

        try {

            localStorage.setItem(
                VARIANT_CART_SNAPSHOTS_KEY,
                JSON.stringify(
                    variantSnapshots
                )
            );

        } catch (error) {

            console.warn(
                "تعذر تنظيف Snapshots الخاصة بالـVariants:",
                error
            );

        }
    }


    if (offersChanged) {

        try {

            localStorage.setItem(
                OFFER_CART_SNAPSHOTS_KEY,
                JSON.stringify(
                    offerSnapshots
                )
            );

        } catch (error) {

            console.warn(
                "تعذر تنظيف Snapshots الخاصة بالعروض:",
                error
            );

        }
    }
}


// ==========================================
// عرض السلة
// ==========================================

function displayCart() {

    if (!cartContainer) {
        return;
    }


    cartContainer.innerHTML = "";


    cleanupUnusedSnapshots();


    const cartKeys =
        Object.keys(userCart);


    if (
        cartKeys.length === 0
    ) {

        cartContainer.innerHTML = `
            <div
                class="empty-cart"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 40px;
                    color: #6b7280;
                    font-size: 18px;
                "
            >
                سلة المشتريات فارغة
            </div>
        `;


        if (cartTotal) {

            cartTotal.textContent =
                "0$";

        }


        return;
    }


    let total = 0;

    let renderedItems = 0;


    // ======================================
    // المرور على عناصر السلة
    // ======================================

    cartKeys.forEach(
        id => {

            const quantity =
                Number(
                    userCart[id]
                ) || 0;


            if (
                quantity <= 0
            ) {

                return;
            }


            // ==================================
            // 1. العرض
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
                    getLocalOffer(
                        offerId
                    );


                if (!offer) {

                    console.warn(
                        "تعذر العثور على بيانات العرض محليًا:",
                        offerId
                    );

                    return;
                }


                const price =
                    Number(
                        offer.price
                    ) || 0;


                const subtotal =
                    cleanPrice(
                        price *
                        quantity
                    );


                total =
                    cleanPrice(
                        total +
                        subtotal
                    );


                renderedItems++;


                cartContainer.innerHTML += `
                    <div
                        class="cart-item offer-cart-item"
                    >

                        ${
                            offer.image
                                ? `
                                    <img
                                        src="${offer.image}"
                                        alt="${offer.name || "عرض"}"
                                        loading="lazy"
                                        decoding="async"
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
                                ${offer.name || "عرض"}
                            </h3>


                            <p>
                                السعر:
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
            // 2. Variant
            // ==================================

            if (
                String(id).startsWith(
                    "variant_"
                )
            ) {

                const variant =
                    getLocalVariant(
                        id
                    );


                if (!variant) {

                    console.warn(
                        "تعذر العثور على بيانات Variant محليًا:",
                        id
                    );

                    return;
                }


                const price =
                    Number(
                        variant.price
                    ) || 0;


                const subtotal =
                    cleanPrice(
                        price *
                        quantity
                    );


                total =
                    cleanPrice(
                        total +
                        subtotal
                    );


                renderedItems++;


                const selectionsHTML =
                    createVariantSelectionsHTML(
                        variant.selections
                    );


                cartContainer.innerHTML += `
                    <div
                        class="cart-item variant-cart-item"
                    >

                        ${
                            variant.image
                                ? `
                                    <img
                                        src="${variant.image}"
                                        alt="${variant.productName || "منتج"}"
                                        loading="lazy"
                                        decoding="async"
                                    >
                                  `
                                : `
                                    <div
                                        class="cart-product-placeholder"
                                    >
                                        اليُسرى
                                    </div>
                                  `
                        }


                        <div class="cart-info">

                            <h3>
                                ${variant.productName || "منتج"}
                            </h3>


                            ${
                                selectionsHTML
                            }




                            <p>
                                السعر:
                                ${cleanPrice(variant.price)} $
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
            // 3. المنتج العادي
            // ==================================

            const product =
                getLocalProduct(
                    id
                );


            if (!product) {

                console.warn(
                    "تعذر العثور على بيانات المنتج محليًا:",
                    id
                );

                return;
            }


            const price =
                Number(
                    product.price
                ) || 0;


            const subtotal =
                cleanPrice(
                    price *
                    quantity
                );


            total =
                cleanPrice(
                    total +
                    subtotal
                );


            renderedItems++;


            cartContainer.innerHTML += `
                <div
                    class="cart-item"
                >

                    <img
                        src="${
                            product.image ||
                            product.main_image ||
                            ""
                        }"
                        alt="${product.name || "منتج"}"
                        loading="lazy"
                        decoding="async"
                    >


                    <div class="cart-info">

                        <h3>
                            ${product.name || "منتج"}
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


    // ======================================
    // حالة وجود عناصر في السلة
    // لكن بياناتها المحلية غير موجودة
    // ======================================

    if (
        renderedItems === 0
    ) {

        cartContainer.innerHTML = `
            <div
                class="empty-cart"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 40px;
                    color: #6b7280;
                    font-size: 18px;
                "
            >
                تعذر العثور على بيانات عناصر السلة المحلية.
                <br>
                يرجى العودة إلى صفحة المنتجات والمحاولة مرة أخرى.
            </div>
        `;

        if (cartTotal) {
            cartTotal.textContent =
                "0$";
        }

        return;
    }


    if (cartTotal) {

        cartTotal.textContent =
            cleanPrice(total) +
            "$";

    }
}


// ==========================================
// التعامل مع + / - / حذف
// ==========================================

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                ".quantity-btn, .remove-btn"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.id;


        if (!id) {
            return;
        }


        // ======================================
        // إزالة العنصر
        // ======================================

        if (
            button.classList.contains(
                "remove-btn"
            )
        ) {

            delete userCart[id];

            saveCart();

            displayCart();

            showCartToast(
                "تم حذف المنتج من السلة."
            );

            return;
        }


        // ======================================
        // -
        // ======================================

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


        // ======================================
        // +
        // ======================================

        if (
            button.classList.contains(
                "plus"
            )
        ) {

            const currentQuantity =
                Number(
                    userCart[id]
                ) || 0;


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
                    getLocalOffer(
                        offerId
                    );


                if (!offer) {

                    showCartToast(
                        "تعذر العثور على بيانات العرض المحلية."
                    );

                    return;
                }


                const maxQuantity =
                    Number(
                        offer.quantity
                    ) || 0;


                if (
                    maxQuantity <= 0
                ) {

                    showCartToast(
                        "هذا العرض غير متوفر حاليًا."
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


            // ==================================
            // Variant
            // ==================================

            if (
                String(id).startsWith(
                    "variant_"
                )
            ) {

                const variant =
                    getLocalVariant(
                        id
                    );


                if (!variant) {

                    showCartToast(
                        "تعذر العثور على بيانات Variant المحلية."
                    );

                    return;
                }


                const maxQuantity =
                    Number(
                        variant.quantity
                    ) || 0;


                if (
                    maxQuantity <= 0
                ) {

                    showCartToast(
                        "هذا الخيار غير متوفر حاليًا."
                    );

                    return;
                }


                if (
                    currentQuantity >=
                    maxQuantity
                ) {

                    showCartToast(
                        `الحد الأقصى المتاح من هذا الخيار هو ${maxQuantity}.`
                    );

                    return;
                }


                userCart[id] =
                    currentQuantity + 1;


                saveCart();

                displayCart();

                return;
            }


            // ==================================
            // المنتج العادي
            // ==================================

            const product =
                getLocalProduct(
                    id
                );


            if (!product) {

                showCartToast(
                    "تعذر العثور على بيانات المنتج المحلية."
                );

                return;
            }


            const maxQuantity =
                Number(
                    product.quantity
                ) || 0;


            if (
                maxQuantity <= 0
            ) {

                showCartToast(
                    "هذا المنتج غير متوفر حاليًا."
                );

                return;
            }


            if (
                currentQuantity >=
                maxQuantity
            ) {

                showCartToast(
                    "لا توجد كمية إضافية متوفرة في المخزون."
                );

                return;
            }


            userCart[id] =
                currentQuantity + 1;


            saveCart();

            displayCart();

        }

    }
);


// ==========================================
// تشغيل السلة
// ==========================================
//
// لا يوجد هنا:
// - Supabase
// - fetch
// - products.js
// - offers.js
// - أي طلب شبكة
//
// السلة تقرأ البيانات من localStorage فقط.
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        displayCart();

    }
);