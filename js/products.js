window.products = [];

let cart =
    JSON.parse(localStorage.getItem("cart")) || {};


/* =========================================================
   إعدادات التحميل والكاش
========================================================= */

const PRODUCTS_PAGE_SIZE = 20;

const PRODUCTS_CACHE_KEY =
    "alYosraProductsCache_v1";


const productsContainer =
    document.getElementById("productsContainer");

const productSearchToggle =
    document.getElementById("productSearchToggle");

const productSearchPopover =
    document.getElementById("productSearchPopover");

const productSearchInput =
    document.getElementById("productSearchInput");


let currentPage = 0;

let isLoadingMore = false;

let hasMoreProducts = true;

let productsInitialized = false;

let productsSyncRunning = false;

let imageObserver = null;

let infiniteScrollObserver = null;

let productsSentinel = null;


/*
 * آخر ID تم تحميله فعليًا.
 *
 * نستخدمه بدل الاعتماد الكامل على offset،
 * حتى لا تحدث مشاكل عند حذف أو إضافة منتجات.
 */
let lastLoadedProductId = 0;


/* =========================================================
   أدوات الكاش
========================================================= */

function readProductsCache() {

    try {

        const cached =
            localStorage.getItem(
                PRODUCTS_CACHE_KEY
            );


        if (!cached) {
            return null;
        }


        const parsed =
            JSON.parse(cached);


        if (
            !parsed ||
            !Array.isArray(parsed.products)
        ) {

            return null;
        }


        return parsed;

    } catch (error) {

        console.warn(
            "تعذر قراءة كاش المنتجات:",
            error
        );

        return null;
    }
}


function saveProductsCache() {

    try {

        const cacheData = {

            version: 1,

            products:
                window.products.map(
                    product => ({
                        ...product
                    })
                ),

            savedAt:
                Date.now()
        };


        localStorage.setItem(
            PRODUCTS_CACHE_KEY,
            JSON.stringify(cacheData)
        );

    } catch (error) {

        /*
         * امتلاء localStorage لا يجب
         * أن يكسر المتجر.
         */
        console.warn(
            "تعذر حفظ كاش المنتجات:",
            error
        );
    }
}


/* =========================================================
   تحويل بيانات Supabase
========================================================= */

function normalizeProduct(product) {

    return {

        id:
            String(product.id),

        name:
            product.name ||
            "منتج بدون اسم",

        price:
            String(
                product.price ?? "0"
            ),

        quantity:
            Number(product.quantity) || 0,

        /*
         * اسم العمود الحقيقي في Supabase:
         * category_id
         */
        category:
            product.category_id ||
            product.category ||
            "",

        productCode:
            product.product_code ||
            "",

        image:
            product.main_image ||
            product.image ||
            "images/product1.png",

        description:
            product.description ||
            "منتج من متجر اليُسرى",

        target:
            product.target ||
            "",

        createdAt:
            product.created_at ||
            "",

        updatedAt:
            product.updated_at ||
            ""
    };
}


/* =========================================================
   مراقب تحميل الصور
========================================================= */

function setupImageObserver() {

    if (imageObserver) {

        imageObserver.disconnect();

    }


    imageObserver =
        new IntersectionObserver(
            function(entries, observer) {

                entries.forEach(entry => {

                    if (
                        !entry.isIntersecting
                    ) {

                        return;
                    }


                    const image =
                        entry.target;


                    const imageSource =
                        image.dataset.src;


                    if (imageSource) {

                        image.src =
                            imageSource;

                        image.removeAttribute(
                            "data-src"
                        );

                    }


                    observer.unobserve(
                        image
                    );

                });

            },
            {
                root: null,

                /*
                 * تحميل الصورة قبل وصولها
                 * إلى الشاشة بحوالي 300px.
                 */
                rootMargin:
                    "300px 0px",

                threshold: 0.01
            }
        );
}


/* =========================================================
   مراقبة الصور الموجودة
========================================================= */

function observeProductImages() {

    if (!imageObserver) {

        setupImageObserver();

    }


    if (!productsContainer) {
        return;
    }


    const images =
        productsContainer.querySelectorAll(
            "img[data-src]"
        );


    images.forEach(image => {

        imageObserver.observe(
            image
        );

    });
}


/* =========================================================
   إنشاء بطاقة المنتج
========================================================= */

function createProductCard(product) {

    const outOfStock =
        product.quantity <= 0;


    const card =
        document.createElement("div");


    card.className =
        "product-card";


    card.dataset.id =
        product.id;


    card.innerHTML = `
        <img
            data-src="${product.image}"
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
    `;


    return card;
}


/* =========================================================
   عرض المنتجات
========================================================= */

function displayProducts(
    productsToDisplay = window.products
) {

    if (!productsContainer) {
        return;
    }


    /*
     * نعيد بناء البطاقات.
     * يستخدم هذا أيضًا عند البحث.
     */
    productsContainer.innerHTML = "";


    if (
        productsToDisplay.length === 0
    ) {

        if (
            window.products.length === 0
        ) {

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


    const fragment =
        document.createDocumentFragment();


    productsToDisplay.forEach(product => {

        fragment.appendChild(
            createProductCard(product)
        );

    });


    productsContainer.appendChild(
        fragment
    );


    observeProductImages();


    /*
     * لا نضع Sentinel أثناء البحث.
     */
    if (
        !productSearchInput ||
        !productSearchInput.value.trim()
    ) {

        setupProductsSentinel();

    }
}


/* =========================================================
   إضافة دفعة جديدة بدون مسح القديمة
========================================================= */

function appendProducts(
    productsToAppend
) {

    if (
        !productsContainer ||
        !Array.isArray(productsToAppend) ||
        productsToAppend.length === 0
    ) {

        return;
    }


    /*
     * إزالة Sentinel مؤقتًا.
     */
    if (productsSentinel) {

        productsSentinel.remove();

        productsSentinel = null;
    }


    const fragment =
        document.createDocumentFragment();


    productsToAppend.forEach(product => {

        fragment.appendChild(
            createProductCard(product)
        );

    });


    productsContainer.appendChild(
        fragment
    );


    observeProductImages();


    setupProductsSentinel();
}


/* =========================================================
   Sentinel الخاص بالـInfinite Scroll
========================================================= */

function setupProductsSentinel() {

    if (!productsContainer) {
        return;
    }


    if (productsSentinel) {

        productsSentinel.remove();

    }


    /*
     * إذا انتهت المنتجات فلا حاجة إلى Sentinel.
     */
    if (!hasMoreProducts) {

        productsSentinel = null;

        if (infiniteScrollObserver) {

            infiniteScrollObserver.disconnect();

        }

        return;
    }


    productsSentinel =
        document.createElement("div");


    productsSentinel.className =
        "products-load-sentinel";


    productsSentinel.setAttribute(
        "aria-hidden",
        "true"
    );


    productsSentinel.style.width =
        "100%";


    productsSentinel.style.height =
        "1px";


    productsContainer.appendChild(
        productsSentinel
    );


    if (
        infiniteScrollObserver
    ) {

        infiniteScrollObserver.disconnect();

    }


    infiniteScrollObserver =
        new IntersectionObserver(
            function(entries) {

                entries.forEach(entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        loadNextProductsPage();

                    }

                });

            },
            {
                root: null,

                /*
                 * يبدأ التحميل قبل نهاية القائمة
                 * بحوالي 700px.
                 */
                rootMargin:
                    "700px 0px",

                threshold: 0
            }
        );


    infiniteScrollObserver.observe(
        productsSentinel
    );
}


/* =========================================================
   تحميل دفعة المنتجات التالية
========================================================= */

async function loadNextProductsPage() {

    if (
        isLoadingMore ||
        !hasMoreProducts
    ) {

        return;
    }


    /*
     * أثناء البحث لا نطلب دفعات جديدة.
     */
    if (
        productSearchInput &&
        productSearchInput.value.trim()
    ) {

        return;
    }


    isLoadingMore = true;


    try {

        let query =
            supabaseClient
                .from("products")
                .select(`
                    id,
                    name,
                    description,
                    price,
                    quantity,
                    main_image,
                    created_at,
                    updated_at,
                    target,
                    category_id,
                    product_code
                `)
                .order(
                    "id",
                    {
                        ascending: true
                    }
                )
                .limit(
                    PRODUCTS_PAGE_SIZE
                );


        /*
         * بعد أول دفعة:
         * نكمل من آخر ID تم تحميله.
         */
        if (
            lastLoadedProductId > 0
        ) {

            query =
                query.gt(
                    "id",
                    lastLoadedProductId
                );

        }


        const {
            data,
            error
        } =
            await query;


        if (error) {
            throw error;
        }


        const newProducts =
            (data || []).map(
                normalizeProduct
            );


        if (
            newProducts.length === 0
        ) {

            hasMoreProducts =
                false;

            setupProductsSentinel();

            return;
        }


        /*
         * منع تكرار المنتجات.
         */
        const existingIds =
            new Set(
                window.products.map(
                    product => product.id
                )
            );


        const uniqueProducts =
            newProducts.filter(
                product =>
                    !existingIds.has(
                        product.id
                    )
            );


        if (
            uniqueProducts.length > 0
        ) {

            window.products.push(
                ...uniqueProducts
            );

        }


        /*
         * ترتيب المنتجات حسب ID.
         */
        window.products.sort(
            (a, b) =>
                Number(a.id) -
                Number(b.id)
        );


        /*
         * تحديث آخر ID تم تحميله.
         */
        const highestLoadedId =
            newProducts.reduce(
                (
                    highest,
                    product
                ) =>
                    Math.max(
                        highest,
                        Number(product.id)
                    ),
                lastLoadedProductId
            );


        lastLoadedProductId =
            highestLoadedId;


        currentPage++;


        /*
         * إذا رجعت أقل من 20،
         * وصلنا إلى النهاية.
         */
        if (
            newProducts.length <
            PRODUCTS_PAGE_SIZE
        ) {

            hasMoreProducts =
                false;

        }


        saveProductsCache();


        appendProducts(
            uniqueProducts
        );


        document.dispatchEvent(
            new CustomEvent(
                "productsPageLoaded",
                {
                    detail: {

                        page:
                            currentPage,

                        count:
                            uniqueProducts.length

                    }
                }
            )
        );


    } catch (error) {

        console.error(
            "خطأ في تحميل دفعة المنتجات:",
            error
        );

    } finally {

        isLoadingMore =
            false;
    }
}


/* =========================================================
   تحميل المنتجات من الكاش أولًا
========================================================= */

function loadProductsFromCache() {

    const cache =
        readProductsCache();


    if (
        !cache ||
        !Array.isArray(
            cache.products
        ) ||
        cache.products.length === 0
    ) {

        return false;
    }


    window.products =
        cache.products.map(
            product => ({
                ...product
            })
        );


    /*
     * ترتيب الكاش حسب ID.
     */
    window.products.sort(
        (a, b) =>
            Number(a.id) -
            Number(b.id)
    );


    /*
     * معرفة آخر ID موجود في الكاش.
     */
    lastLoadedProductId =
        window.products.reduce(
            (
                highest,
                product
            ) =>
                Math.max(
                    highest,
                    Number(product.id)
                ),
            0
        );


    currentPage =
        Math.floor(
            window.products.length /
            PRODUCTS_PAGE_SIZE
        );


    /*
     * في البداية نفترض وجود المزيد،
     * ثم تقوم المزامنة بتحديد الحقيقة.
     */
    hasMoreProducts = true;


    displayProducts();


    return true;
}


/* =========================================================
   مزامنة الكاش مع Supabase
========================================================= */

async function syncProductsCache() {

    if (
        productsSyncRunning
    ) {

        return;
    }


    productsSyncRunning = true;


    try {

        /*
         * طلب Metadata خفيف.
         *
         * لا نحمل بيانات المنتجات الكاملة.
         */
        const {
            data: metadata,
            error
        } =
            await supabaseClient
                .from("products")
                .select(
                    "id, updated_at"
                )
                .order(
                    "id",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        const remoteProducts =
            metadata || [];


        const remoteMap =
            new Map(
                remoteProducts.map(
                    product => [
                        String(product.id),
                        product.updated_at || ""
                    ]
                )
            );


        /*
         * نسخة من المنتجات الموجودة قبل التعديل.
         */
        const cachedProducts =
            [...window.products];


        const cachedIds =
            new Set(
                cachedProducts.map(
                    product => product.id
                )
            );


        /* =====================================================
           حذف المنتجات التي لم تعد موجودة
        ===================================================== */

        const deletedIds =
            cachedProducts
                .filter(
                    product =>
                        !remoteMap.has(
                            product.id
                        )
                )
                .map(
                    product =>
                        product.id
                );


        if (
            deletedIds.length > 0
        ) {

            window.products =
                window.products.filter(
                    product =>
                        !deletedIds.includes(
                            product.id
                        )
                );

        }


        /* =====================================================
           تحديد المنتجات التي تغيرت
        ===================================================== */

        const changedIds =
            cachedProducts
                .filter(product => {

                    const remoteUpdatedAt =
                        remoteMap.get(
                            product.id
                        );


                    return (
                        remoteUpdatedAt &&
                        remoteUpdatedAt !==
                        product.updatedAt
                    );

                })
                .map(
                    product =>
                        product.id
                );


        /*
         * لا نجلب كل المنتجات الجديدة.
         *
         * نحتاج فقط إلى معرفة المنتجات الموجودة
         * ضمن أول 20 منتجًا حاليًا.
         */
        const firstPageIds =
            remoteProducts
                .slice(
                    0,
                    PRODUCTS_PAGE_SIZE
                )
                .map(
                    product =>
                        String(product.id)
                );


        const missingFirstPageIds =
            firstPageIds.filter(
                id =>
                    !cachedIds.has(id)
            );


        /*
         * المنتجات التي تغيرت + المنتجات الناقصة
         * من أول صفحة فقط.
         */
        const idsToFetch = [
            ...new Set([
                ...changedIds,
                ...missingFirstPageIds
            ])
        ];


        if (
            idsToFetch.length > 0
        ) {

            const {
                data,
                error: productsError
            } =
                await supabaseClient
                    .from("products")
                    .select(`
                        id,
                        name,
                        description,
                        price,
                        quantity,
                        main_image,
                        created_at,
                        updated_at,
                        target,
                        category_id,
                        product_code
                    `)
                    .in(
                        "id",
                        idsToFetch
                    );


            if (productsError) {
                throw productsError;
            }


            const updatedProducts =
                (data || []).map(
                    normalizeProduct
                );


            const updatedMap =
                new Map(
                    updatedProducts.map(
                        product => [
                            product.id,
                            product
                        ]
                    )
                );


            /*
             * استبدال المنتجات التي تغيرت.
             */
            window.products =
                window.products.map(
                    product =>
                        updatedMap.has(
                            product.id
                        )
                        ? updatedMap.get(
                            product.id
                        )
                        : product
                );


            /*
             * إضافة المنتجات الناقصة من أول صفحة فقط.
             */
            updatedProducts.forEach(
                product => {

                    const exists =
                        window.products.some(
                            item =>
                                item.id ===
                                product.id
                        );


                    if (!exists) {

                        window.products.push(
                            product
                        );

                    }

                }
            );


            window.products.sort(
                (a, b) =>
                    Number(a.id) -
                    Number(b.id)
            );


            /*
             * إعادة العرض فقط إذا حدث تغيير.
             */
            if (
                changedIds.length > 0 ||
                missingFirstPageIds.length > 0 ||
                deletedIds.length > 0
            ) {

                const searchValue =
                    productSearchInput
                    ? normalizeSearchText(
                        productSearchInput.value
                    )
                    : "";


                if (searchValue) {

                    filterProductsLocally();

                } else {

                    displayProducts();

                }

            }

        }


        /*
         * تحديث آخر ID موجود في البيانات المحملة.
         */
        lastLoadedProductId =
            window.products.reduce(
                (
                    highest,
                    product
                ) =>
                    Math.max(
                        highest,
                        Number(product.id)
                    ),
                0
            );


        /*
         * حفظ الكاش بعد المزامنة.
         */
        saveProductsCache();


        /* =====================================================
           تحديد حالة Infinite Scroll
        ===================================================== */

        /*
         * إذا لم توجد منتجات محملة،
         * نطلب أول دفعة.
         */
        if (
            window.products.length === 0
        ) {

            currentPage = 0;

            lastLoadedProductId = 0;

            hasMoreProducts = true;

            await loadNextProductsPage();

            return;
        }


        /*
         * إذا كان لدينا أقل من 20 منتجًا،
         * نتحقق من الصفحة الأولى.
         *
         * لا نمسح الكاش.
         */
        if (
            window.products.length <
            PRODUCTS_PAGE_SIZE
        ) {

            /*
             * إذا كانت المنتجات المحملة تمثل
             * كل المنتجات الموجودة فعليًا،
             * فلا توجد دفعة أخرى.
             */
            if (
                remoteProducts.length <=
                window.products.length
            ) {

                hasMoreProducts =
                    false;

            } else {

                hasMoreProducts =
                    true;

                /*
                 * إذا كان لدينا أقل من 20،
                 * نحتاج تحميل ما ينقص الصفحة الأولى.
                 *
                 * نعيد آخر ID إلى صفر فقط إذا كانت
                 * البيانات المحملة لا تغطي الصفحة الأولى.
                 */
                const firstPageLoadedIds =
                    new Set(
                        window.products.map(
                            product =>
                                product.id
                        )
                    );


                const firstMissing =
                    remoteProducts
                        .slice(
                            0,
                            PRODUCTS_PAGE_SIZE
                        )
                        .filter(
                            product =>
                                !firstPageLoadedIds
                                    .has(
                                        String(
                                            product.id
                                        )
                                    )
                        );


                if (
                    firstMissing.length > 0
                ) {

                    /*
                     * جلب النواقص فقط.
                     */
                    const {
                        data,
                        error:
                            firstPageError
                    } =
                        await supabaseClient
                            .from("products")
                            .select(`
                                id,
                                name,
                                description,
                                price,
                                quantity,
                                main_image,
                                created_at,
                                updated_at,
                                target,
                                category_id,
                                product_code
                            `)
                            .in(
                                "id",
                                firstMissing.map(
                                    product =>
                                        String(
                                            product.id
                                        )
                                )
                            );


                    if (
                        firstPageError
                    ) {

                        throw firstPageError;
                    }


                    const missingProducts =
                        (data || []).map(
                            normalizeProduct
                        );


                    window.products.push(
                        ...missingProducts
                    );


                    window.products.sort(
                        (a, b) =>
                            Number(a.id) -
                            Number(b.id)
                    );


                    lastLoadedProductId =
                        window.products.reduce(
                            (
                                highest,
                                product
                            ) =>
                                Math.max(
                                    highest,
                                    Number(
                                        product.id
                                    )
                                ),
                            0
                        );


                    currentPage =
                        Math.floor(
                            window.products.length /
                            PRODUCTS_PAGE_SIZE
                        );


                    saveProductsCache();


                    /*
                     * إعادة العرض بعد إضافة النواقص.
                     */
                    displayProducts();

                }

            }

        } else {

            /*
             * لدينا 20 أو أكثر.
             *
             * عدد المنتجات المحملة أقل من عدد
             * المنتجات الموجودة في قاعدة البيانات؟
             * إذن توجد دفعات أخرى.
             */
            hasMoreProducts =
                remoteProducts.length >
                window.products.length;

        }


        setupProductsSentinel();


    } catch (error) {

        console.warn(
            "تعذر مزامنة كاش المنتجات:",
            error
        );

        /*
         * في حالة فشل المزامنة:
         * لا نمسح الكاش ولا نكسر المتجر.
         */

    } finally {

        productsSyncRunning =
            false;
    }
}


/* =========================================================
   تحميل المنتجات الأساسي
========================================================= */

async function loadProducts() {

    try {

        const hasCache =
            loadProductsFromCache();


        /*
         * إذا لم يوجد Cache:
         * نجلب أول 20 فقط.
         */
        if (!hasCache) {

            currentPage = 0;

            lastLoadedProductId = 0;

            hasMoreProducts = true;

            await loadNextProductsPage();

        }


        /*
         * مزامنة واحدة عند فتح الصفحة.
         *
         * لا يوجد polling.
         */
        await syncProductsCache();


        /*
         * إرسال productsLoaded مرة واحدة فقط.
         */
        if (
            !productsInitialized
        ) {

            productsInitialized = true;


            document.dispatchEvent(
                new CustomEvent(
                    "productsLoaded"
                )
            );

        }


    } catch (error) {

        console.error(
            "خطأ في تحميل المنتجات:",
            error
        );


        if (
            productsContainer &&
            window.products.length === 0
        ) {

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
   البحث المحلي
========================================================= */

function normalizeSearchText(value) {

    return String(value || "")
        .trim()
        .toLocaleLowerCase("ar");
}


function filterProductsLocally() {

    if (!productSearchInput) {
        return;
    }


    const searchValue =
        normalizeSearchText(
            productSearchInput.value
        );


    if (!searchValue) {

        displayProducts(
            window.products
        );

        return;
    }


    /*
     * البحث محلي بالكامل.
     * لا يوجد طلب Supabase أثناء الكتابة.
     */
    const filteredProducts =
        window.products.filter(
            product =>
                normalizeSearchText(
                    product.name
                ).includes(
                    searchValue
                )
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
        productSearchToggle
            .getBoundingClientRect();


    const popoverWidth =
        productSearchPopover
            .getBoundingClientRect()
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
                productSearchPopover
                    .classList
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
   زر ESC
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            closeProductSearch();

        }

    }
);


/* =========================================================
   الحفاظ على مكان مربع البحث
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
            !event.target.closest(
                ".add-cart"
            )
        ) {

            const id =
                card.dataset.id;


            sessionStorage.setItem(
                "productsReturnProductId",
                id
            );


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
                    item =>
                        item.id === id
                );


            if (!product) {
                return;
            }


            if (
                product.quantity <= 0
            ) {

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