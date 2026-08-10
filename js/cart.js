const userCart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || {};


const cartContainer =
    document.getElementById("cartContainer");

const cartTotal =
    document.getElementById("cartTotal");



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


            const product =
                window.products.find(
                    item =>
                        item.id === String(id)
                );


            // إذا لم يصل المنتج من قاعدة البيانات
            // نتجاهله مؤقتًا

            if (!product) return;



            const quantity =
                Number(userCart[id]) || 0;


            const price =
                Number(product.price) || 0;


            total +=
                price * quantity;



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
                        السعر: ${product.price} $
                    </p>


                    <div class="quantity-box">

                        <button
                            class="quantity-btn plus"
                            data-id="${id}"
                        >
                            +
                        </button>


                        <span>
                            ${quantity}
                        </span>


                        <button
                            class="quantity-btn minus"
                            data-id="${id}"
                        >
                            -
                        </button>

                    </div>


                    <button
                        class="remove-btn"
                        data-id="${id}"
                    >
                        حذف
                    </button>

                </div>

            </div>

            `;

        }
    );



    if (cartTotal) {

        cartTotal.textContent =
            total + "$";

    }

}



// ==========================================
// أزرار السلة
// ==========================================

document.addEventListener(
    "click",
    function(event) {


        const id =
            event.target.dataset.id;


        if (!id) return;



        // زيادة الكمية

        if (
            event.target.classList.contains(
                "plus"
            )
        ) {

            const product =
                window.products.find(
                    item =>
                        item.id === String(id)
                );


            if (!product) return;


            const currentQuantity =
                Number(userCart[id]) || 0;


            if (
                currentQuantity <
                product.quantity
            ) {

                userCart[id] =
                    currentQuantity + 1;

                saveCart();
                displayCart();

            } else {

                alert(
                    "لا توجد كمية إضافية متوفرة في المخزون."
                );

            }

        }



        // إنقاص الكمية

        if (
            event.target.classList.contains(
                "minus"
            )
        ) {

            if (
                userCart[id] > 1
            ) {

                userCart[id]--;

            } else {

                delete userCart[id];

            }


            saveCart();
            displayCart();

        }



        // حذف المنتج

        if (
            event.target.classList.contains(
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
// انتظار تحميل المنتجات من Supabase
// ==========================================

document.addEventListener(
    "productsLoaded",
    displayCart
);



// في حال كانت المنتجات موجودة مسبقًا

document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (window.products.length > 0) {

            displayCart();

        }

    }
);