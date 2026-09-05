window.products = [];

let cart =
    JSON.parse(localStorage.getItem("cart")) || {};

const productsContainer =
    document.getElementById("productsContainer");

const productSearchToggle =
    document.getElementById("productSearchToggle");

const productSearchPopover =
    document.getElementById("productSearchPopover");

const productSearchInput =
    document.getElementById("productSearchInput");

async function loadProducts() {
    try {
        const { data, error } =
            await supabaseClient
                .from("products")
                .select("*")
                .order("id", { ascending: true });

        if (error) throw error;

        window.products = data.map(product => ({
            id: String(product.id),
            name: product.name || "منتج بدون اسم",
            price: String(product.price ?? "0"),
            quantity: Number(product.quantity) || 0,
            category:
                product.category ||
                product.category_id ||
                "",
            productCode:
                product.product_code || "",
            image:
                product.main_image ||
                product.image ||
                "images/product1.png",
            description:
                product.description ||
                "منتج من متجر اليُسرى"
        }));

        displayProducts();

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


/* =========================================================
   عرض المنتجات
========================================================= */

function displayProducts(
    productsToDisplay = window.products
) {

    if (!productsContainer) return;

    productsContainer.innerHTML = "";

    if (productsToDisplay.length === 0) {

        if (window.products.length === 0) {

            productsContainer.innerHTML = `
                <div class="products-empty">
                    لا توجد منتجات حاليًا.
                </div>
            `;

        } else {

            productsContainer.innerHTML = `
                <div class="products-search-empty">
                    لا توجد منتجات مطابقة لبحثك.
                </div>
            `;
        }

        return;
    }


    productsToDisplay.forEach(product => {

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

            <h3>${product.name}</h3>

            <p>${product.description}</p>

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


/* =========================================================
   البحث المحلي في المنتجات
========================================================= */

function normalizeSearchText(value) {

    return String(value || "")
        .trim()
        .toLocaleLowerCase("ar");
}


function filterProductsLocally() {

    if (!productSearchInput) return;

    const searchValue =
        normalizeSearchText(
            productSearchInput.value
        );


    /* إذا كان مربع البحث فارغًا،
       نعيد جميع المنتجات الموجودة أصلًا */

    if (!searchValue) {

        displayProducts(
            window.products
        );

        return;
    }


    /* البحث يتم داخل البيانات الموجودة
       في الصفحة فقط، دون أي طلب إلى Supabase */

    const filteredProducts =
        window.products.filter(product =>
            normalizeSearchText(
                product.name
            ).includes(searchValue)
        );


    displayProducts(
        filteredProducts
    );
}


/* =========================================================
   تحديد مكان مربع البحث
========================================================= */

function positionProductSearchPopover() {

    if (
        !productSearchToggle ||
        !productSearchPopover
    ) {
        return;
    }


    const buttonRect =
        productSearchToggle.getBoundingClientRect();


    const popoverWidth =
        productSearchPopover.getBoundingClientRect()
            .width;


    const viewportPadding = 15;


    let left =
        buttonRect.left +
        (buttonRect.width / 2) -
        (popoverWidth / 2);


    left = Math.max(
        viewportPadding,
        Math.min(
            left,
            window.innerWidth -
            popoverWidth -
            viewportPadding
        )
    );


    const arrowLeft =
        buttonRect.left +
        (buttonRect.width / 2) -
        left;


    productSearchPopover.style.left =
        `${left}px`;


    productSearchPopover.style.top =
        `${buttonRect.bottom + 10}px`;


    productSearchPopover.style
        .setProperty(
            "--search-arrow-left",
            `${arrowLeft}px`
        );
}


/* =========================================================
   فتح مربع البحث
========================================================= */

function openProductSearch() {

    if (
        !productSearchPopover ||
        !productSearchToggle
    ) {
        return;
    }


    productSearchPopover.classList.add(
        "show"
    );

    productSearchPopover.setAttribute(
        "aria-hidden",
        "false"
    );

    productSearchToggle.setAttribute(
        "aria-expanded",
        "true"
    );


    requestAnimationFrame(() => {

        positionProductSearchPopover();

        if (productSearchInput) {
            productSearchInput.focus();
        }
    });
}


/* =========================================================
   إغلاق مربع البحث
========================================================= */

function closeProductSearch() {

    if (
        !productSearchPopover ||
        !productSearchToggle
    ) {
        return;
    }


    productSearchPopover.classList.remove(
        "show"
    );

    productSearchPopover.setAttribute(
        "aria-hidden",
        "true"
    );

    productSearchToggle.setAttribute(
        "aria-expanded",
        "false"
    );
}


/* =========================================================
   زر البحث
========================================================= */

if (
    productSearchToggle &&
    productSearchPopover
) {

    productSearchToggle.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            const isOpen =
                productSearchPopover.classList
                    .contains("show");


            if (isOpen) {

                closeProductSearch();

            } else {

                openProductSearch();
            }
        }
    );
}


/* =========================================================
   البحث أثناء الكتابة
========================================================= */

if (productSearchInput) {

    productSearchInput.addEventListener(
        "input",
        filterProductsLocally
    );
}


/* =========================================================
   الضغط خارج مربع البحث
========================================================= */

document.addEventListener(
    "click",
    function(event) {

        if (
            !productSearchPopover ||
            !productSearchToggle
        ) {
            return;
        }


        const clickedInsidePopover =
            productSearchPopover.contains(
                event.target
            );


        const clickedSearchButton =
            productSearchToggle.contains(
                event.target
            );


        if (
            !clickedInsidePopover &&
            !clickedSearchButton
        ) {
            closeProductSearch();
        }
    }
);


/* =========================================================
   زر ESC لإغلاق البحث
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Escape") {
            closeProductSearch();
        }
    }
);


/* =========================================================
   الحفاظ على مكان مربع البحث عند
   تغيير حجم الشاشة أو التمرير
========================================================= */

window.addEventListener(
    "resize",
    function() {

        if (
            productSearchPopover &&
            productSearchPopover.classList
                .contains("show")
        ) {
            positionProductSearchPopover();
        }
    }
);


window.addEventListener(
    "scroll",
    function() {

        if (
            productSearchPopover &&
            productSearchPopover.classList
                .contains("show")
        ) {
            positionProductSearchPopover();
        }
    }
);


/* =========================================================
   النقر على بطاقة المنتج / إضافة للسلة
========================================================= */

document.addEventListener(
    "click",
    function(event) {

        const card =
            event.target.closest(
                ".product-card"
            );


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


        if (
            event.target.classList
                .contains("add-cart")
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


/* =========================================================
   تشغيل تحميل المنتجات
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    loadProducts
);