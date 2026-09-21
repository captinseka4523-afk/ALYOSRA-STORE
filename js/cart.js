// ==========================================
// AL YOSRA STORE - Cart Logic (Optimized)
// ==========================================

const userCart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || {};

const cartContainer =
    document.getElementById("cartContainer");

const cartTotal =
    document.getElementById("cartTotal");

let offers = [];

// ==========================================
// تنظيف أخطاء الأرقام العشرية
// ==========================================
function cleanPrice(value) {
    return Number(
        Number(value || 0).toPrecision(15)
    );
}

// ==========================================
// إشعار غير مزعج (Toast) داخل السلة
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
// حفظ السلة وتحديث العداد
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
// تحميل العروض الفعالة (طلب واحد مجمع للخادم)
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
            .eq("active", true);

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
// عرض محتويات السلة
// ==========================================
function displayCart() {
    if (!cartContainer) return;

    cartContainer.innerHTML = "";

    if (
        Object.keys(userCart).length === 0
    ) {
        cartContainer.innerHTML = `
            <div class="empty-cart" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280; font-size: 18px;">
                سلة المشتريات فارغة
            </div>
        `;

        if (cartTotal) {
            cartTotal.textContent = "0$";
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

            // ----------------------------------
            // عرض خاص (Offer)
            // ----------------------------------
            if (
                String(id).startsWith("offer_")
            ) {
                const offerId =
                    String(id).replace("offer_", "");

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
                    Number(offer.price) || 0;

                const subtotal =
                    cleanPrice(price * quantity);

                total =
                    cleanPrice(total + subtotal);

                cartContainer.innerHTML += `
                    <div class="cart-item offer-cart-item">
                        ${
                            offer.image
                                ? `<img src="${offer.image}" alt="${offer.name}">`
                                : `<div class="cart-offer-placeholder">عرض</div>`
                        }
                        <div class="cart-info">
                            <h3>${offer.name}</h3>
                            <p>السعر: ${cleanPrice(offer.price)} $</p>
                            
                            <div class="quantity-box">
                                <button class="quantity-btn plus" data-id="${id}" type="button">+</button>
                                <span>${quantity}</span>
                                <button class="quantity-btn minus" data-id="${id}" type="button">-</button>
                            </div>

                            <button class="remove-btn" data-id="${id}" type="button">حذف</button>
                        </div>
                    </div>
                `;
                return;
            }

            // ----------------------------------
            // منتج عادي (Product)
            // ملاحظة: نعتمد على window.products إذا كانت محملة مسبقاً
            // ----------------------------------
            const product =
                window.products &&
                window.products.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            // إذا لم يتم تحميل المنتجات في النافذة بعد، نعرض بيانات مؤقتة أو نتخطى لحين التحميل
            if (!product) {
                return;
            }

            const price =
                Number(product.price) || 0;

            const subtotal =
                cleanPrice(price * quantity);

            total =
                cleanPrice(total + subtotal);

            cartContainer.innerHTML += `
                <div class="cart-item">
                    <img src="${product.image || product.main_image || ''}" alt="${product.name}">
                    <div class="cart-info">
                        <h3>${product.name}</h3>
                        <p>السعر: ${cleanPrice(product.price)} $</p>
                        
                        <div class="quantity-box">
                            <button class="quantity-btn plus" data-id="${id}" type="button">+</button>
                            <span>${quantity}</span>
                            <button class="quantity-btn minus" data-id="${id}" type="button">-</button>
                        </div>

                        <button class="remove-btn" data-id="${id}" type="button">حذف</button>
                    </div>
                </div>
            `;
        }
    );

    if (cartTotal) {
        cartTotal.textContent =
            cleanPrice(total) + "$";
    }
}

// ==========================================
// إدارة أحداث الأزرار (زيادة، نقصان، حذف) محلياً
// ==========================================
document.addEventListener(
    "click",
    function(event) {
        const button =
            event.target.closest(
                ".quantity-btn, .remove-btn"
            );

        if (!button) return;

        const id = button.dataset.id;
        if (!id) return;

        const isOffer =
            String(id).startsWith("offer_");

        // زر الزيادة (+)
        if (
            button.classList.contains("plus")
        ) {
            if (isOffer) {
                const offerId =
                    String(id).replace("offer_", "");
                const offer =
                    offers.find(
                        item =>
                            String(item.id) ===
                            String(offerId)
                    );

                if (!offer) {
                    showCartToast("تعذر العثور على بيانات العرض.");
                    return;
                }

                const currentQuantity =
                    Number(userCart[id]) || 0;
                const maxQuantity =
                    Number(offer.quantity) || 0;

                if (currentQuantity >= maxQuantity) {
                    showCartToast(`الحد الأقصى المتاح من هذا العرض هو ${maxQuantity}.`);
                    return;
                }

                userCart[id] = currentQuantity + 1;
                saveCart();
                displayCart();
                return;
            }

            // منتج عادي
            const product =
                window.products &&
                window.products.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!product) return;

            const currentQuantity =
                Number(userCart[id]) || 0;
            const availableQuantity =
                Number(product.quantity) || 0;

            if (currentQuantity < availableQuantity) {
                userCart[id] = currentQuantity + 1;
                saveCart();
                displayCart();
            } else {
                showCartToast("لا توجد كمية إضافية متوفرة في المخزون.");
            }
            return;
        }

        // زر النقصان (-)
        if (
            button.classList.contains("minus")
        ) {
            const currentQuantity =
                Number(userCart[id]) || 0;

            if (currentQuantity > 1) {
                userCart[id] = currentQuantity - 1;
            } else {
                delete userCart[id];
            }

            saveCart();
            displayCart();
            return;
        }

        // زر الحذف (Remove)
        if (
            button.classList.contains("remove-btn")
        ) {
            delete userCart[id];
            saveCart();
            displayCart();
            showCartToast("تم حذف المنتج من السلة.");
        }
    }
);

// ==========================================
// ربط الأحداث عند التحميل
// ==========================================
document.addEventListener(
    "productsLoaded",
    function() {
        displayCart();
    }
);

document.addEventListener(
    "DOMContentLoaded",
    function() {
        loadOffersForCart();
    }
);