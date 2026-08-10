window.products = [];

let cart =
    JSON.parse(localStorage.getItem("cart")) || {};

const productsContainer =
    document.getElementById("productsContainer");


// ==========================================
// تحميل المنتجات من Supabase
// ==========================================

async function loadProducts() {

    try {

        const { data, error } =
            await supabaseClient
                .from("products")
                .select("*")
                .order("id", { ascending: true });


        if (error) {
            throw error;
        }


        window.products = data.map(product => ({

            id: String(product.id),

            name: product.name || "منتج بدون اسم",

            price: String(product.price ?? "0"),

            quantity:
                Number(product.quantity) || 0,

            category:
                product.category || "",

            productCode:
                product.product_code || "",

            image:
                product.image ||
                "images/product1.png",

            description:
                product.description ||
                product.category ||
                "منتج من متجر اليُسرى",

            specs:
                Array.isArray(product.specs)
                    ? product.specs
                    : []

        }));


        displayProducts();


        // إخبار الصفحات الأخرى بأن البيانات أصبحت جاهزة
        document.dispatchEvent(
            new CustomEvent("productsLoaded")
        );


    } catch (error) {

        console.error(
            "خطأ في تحميل المنتجات:",
            error
        );


        if (productsContainer) {

            productsContainer.innerHTML = `
                <div class="products-error">
                    حدث خطأ أثناء تحميل المنتجات.
                    <br>
                    يرجى المحاولة مرة أخرى.
                </div>
            `;

        }

    }

}



// ==========================================
// عرض المنتجات
// ==========================================

function displayProducts() {

    if (!productsContainer) return;


    productsContainer.innerHTML = "";


    if (window.products.length === 0) {

        productsContainer.innerHTML = `
            <div class="products-empty">
                لا توجد منتجات حاليًا.
            </div>
        `;

        return;

    }


    window.products.forEach(product => {

        const outOfStock =
            product.quantity <= 0;


        productsContainer.innerHTML += `

        <div
            class="product-card"
            data-id="${product.id}"
        >

            <img
                src="${product.image}"
                alt="${product.name}"
            >

            <h3>
                ${product.name}
            </h3>

            <p>
                ${product.description}
            </p>

            <span class="product-price">
                ${product.price} $
            </span>

            ${
                outOfStock

                ? `
                    <span class="out-of-stock">
                        غير متوفر حاليًا
                    </span>
                  `

                : `
                    <button
                        class="add-cart"
                        data-id="${product.id}"
                    >
                        أضف إلى السلة
                    </button>
                  `
            }

        </div>

        `;

    });

}



// ==========================================
// التعامل مع النقر
// ==========================================

document.addEventListener(
    "click",
    function(event) {


        // --------------------------------------
        // فتح تفاصيل المنتج
        // --------------------------------------

        const card =
            event.target.closest(".product-card");


        if (
            card &&
            !event.target.closest(".add-cart")
        ) {

            const id =
                card.dataset.id;


            window.location.href =
                "product.html?id=" + id;

            return;

        }



        // --------------------------------------
        // إضافة المنتج إلى السلة
        // --------------------------------------

        if (
            event.target.classList.contains("add-cart")
        ) {

            const id =
                event.target.dataset.id;


            const product =
                window.products.find(
                    item => item.id === id
                );


            if (!product) return;


            if (product.quantity <= 0) {

                return;

            }


            const currentQuantity =
                Number(cart[id]) || 0;


            if (
                currentQuantity >=
                product.quantity
            ) {

                alert(
                    "لا يمكن إضافة كمية أكبر من المتوفر في المخزون."
                );

                return;

            }


            cart[id] =
                currentQuantity + 1;


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
                product.name
            );

        }

    }
);



// ==========================================
// بدء التحميل
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    loadProducts
);