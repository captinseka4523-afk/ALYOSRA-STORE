const productId =
    new URLSearchParams(window.location.search)
        .get("id");


const productImage =
    document.getElementById("productImage");

const productName =
    document.getElementById("productName");

const productDescription =
    document.getElementById("productDescription");

const productPrice =
    document.getElementById("productPrice");

const productSpecs =
    document.getElementById("productSpecs");

const quantityInput =
    document.getElementById("quantityInput");

const plusBtn =
    document.getElementById("plusBtn");

const minusBtn =
    document.getElementById("minusBtn");

const addToCartBtn =
    document.getElementById("addToCartBtn");



let currentProduct = null;



// ==========================================
// عرض تفاصيل المنتج
// ==========================================

function displayProductDetails() {

    currentProduct =
        window.products.find(
            item => item.id === String(productId)
        );


    if (!currentProduct) {

        if (productName) {
            productName.textContent =
                "المنتج غير موجود";
        }

        if (productDescription) {
            productDescription.textContent =
                "تعذر العثور على هذا المنتج.";
        }

        if (addToCartBtn) {
            addToCartBtn.disabled = true;
        }

        return;

    }



    // الصورة

    if (productImage) {

        productImage.src =
            currentProduct.image;

        productImage.alt =
            currentProduct.name;

    }



    // الاسم

    if (productName) {

        productName.textContent =
            currentProduct.name;

    }



    // الوصف

    if (productDescription) {

        productDescription.textContent =
            currentProduct.description;

    }



    // السعر

    if (productPrice) {

        productPrice.textContent =
            currentProduct.price + " $";

    }



    // المواصفات

    if (productSpecs) {

        productSpecs.innerHTML = "";


        if (
            Array.isArray(currentProduct.specs) &&
            currentProduct.specs.length > 0
        ) {

            currentProduct.specs.forEach(
                spec => {

                    productSpecs.innerHTML += `
                        <li>
                            ${spec}
                        </li>
                    `;

                }
            );

        } else {

            productSpecs.innerHTML = `
                <li>
                    لا توجد مواصفات مضافة لهذا المنتج حاليًا.
                </li>
            `;

        }

    }



    // المخزون

    if (currentProduct.quantity <= 0) {

        if (addToCartBtn) {

            addToCartBtn.disabled = true;

            addToCartBtn.textContent =
                "غير متوفر حاليًا";

        }

    }



    // الحد الأقصى للكمية

    if (quantityInput) {

        quantityInput.max =
            currentProduct.quantity;

    }

}



// ==========================================
// زر +
// ==========================================

if (plusBtn) {

    plusBtn.addEventListener(
        "click",
        function() {

            if (!currentProduct) return;


            let quantity =
                Number(quantityInput.value) || 1;


            if (
                quantity <
                currentProduct.quantity
            ) {

                quantity++;

            }


            quantityInput.value =
                quantity;

        }
    );

}



// ==========================================
// زر -
// ==========================================

if (minusBtn) {

    minusBtn.addEventListener(
        "click",
        function() {

            let quantity =
                Number(quantityInput.value) || 1;


            if (quantity > 1) {

                quantity--;

            }


            quantityInput.value =
                quantity;

        }
    );

}



// ==========================================
// إضافة المنتج إلى السلة
// ==========================================

if (addToCartBtn) {

    addToCartBtn.addEventListener(
        "click",
        function() {

            if (!currentProduct) return;


            let quantity =
                Number(quantityInput.value) || 1;


            if (quantity < 1) {

                quantity = 1;

            }


            if (
                quantity >
                currentProduct.quantity
            ) {

                quantity =
                    currentProduct.quantity;

            }


            if (quantity <= 0) {

                return;

            }


            let cart =
                JSON.parse(
                    localStorage.getItem("cart")
                ) || {};


            const currentCartQuantity =
                Number(cart[currentProduct.id]) || 0;


            if (
                currentCartQuantity + quantity >
                currentProduct.quantity
            ) {

                alert(
                    "الكمية المطلوبة أكبر من الكمية المتوفرة في المخزون."
                );

                return;

            }


            cart[currentProduct.id] =
                currentCartQuantity + quantity;


            localStorage.setItem(
                "cart",
                JSON.stringify(cart)
            );


            if (
                typeof updateCartCount ===
                "function"
            ) {

                updateCartCount();

            }


            console.log(
                "تمت إضافة المنتج:",
                currentProduct.name,
                "الكمية:",
                quantity
            );


            addToCartBtn.textContent =
                "تمت الإضافة ✓";


            setTimeout(
                function() {

                    if (
                        currentProduct.quantity > 0
                    ) {

                        addToCartBtn.textContent =
                            "أضف إلى السلة";

                    }

                },
                1200
            );

        }
    );

}



// ==========================================
// انتظار تحميل المنتجات من Supabase
// ==========================================

document.addEventListener(
    "productsLoaded",
    displayProductDetails
);



// في حال كانت المنتجات موجودة مسبقًا

if (window.products.length > 0) {

    displayProductDetails();

}