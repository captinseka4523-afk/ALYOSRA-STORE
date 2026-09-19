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


/*
 * الدفعات التي تمت مزامنتها خلال
 * جلسة الصفحة الحالية.
 *
 * مثال:
 * 0 = المنتجات 1 - 20
 * 1 = المنتجات 21 - 40
 * 2 = المنتجات 41 - 60
 */
const syncedProductBatches =
    new Set();


/*
 * الدفعات التي تتم مزامنتها حاليًا.
 *
 * تمنع إرسال طلبين متزامنين لنفس الدفعة
 * إذا حدثت عدة إشارات من IntersectionObserver.
 */
const syncingProductBatches =
    new Set();


/*
 * مراقب الدفعات.
 *
 * يستخدم لمراقبة وصول المستخدم إلى
 * دفعة جديدة من المنتجات الموجودة في الكاش.
 */
let productBatchSyncObserver = null;


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


        /*
         * التحقق من أن البيانات الموجودة
         * في الكاش عبارة عن منتجات صالحة.
         */
        const validProducts =
            parsed.products.filter(
                product =>
                    product &&
                    product.id !== undefined &&
                    product.id !== null
            );


        if (
            validProducts.length === 0
        ) {

            return null;
        }


        return {
            ...parsed,
            products: validProducts
        };

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


        return true;

    } catch (error) {

        /*
         * امتلاء localStorage أو فشل الحفظ
         * لا يجب أن يكسر المتجر.
         */
        console.warn(
            "تعذر حفظ كاش المنتجات:",
            error
        );


        return false;
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
   أدوات مشتركة لجلب المنتجات
========================================================= */

function getProductsSelectFields() {

    return `
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
    `;
}


/*
 * جلب منتجات محددة بالـ IDs.
 *
 * يستخدم فقط عندما يتبين أن updated_at
 * تغيّر فعلًا أو أن هناك منتجات ناقصة.
 */
async function fetchProductsByIds(ids) {

    if (
        !Array.isArray(ids) ||
        ids.length === 0
    ) {

        return [];
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("products")
            .select(
                getProductsSelectFields()
            )
            .in(
                "id",
                ids
            );


    if (error) {
        throw error;
    }


    return (data || []).map(
        normalizeProduct
    );
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
                 * نبدأ تحميل الصور قبل وصولها
                 * إلى الشاشة بحوالي 500px.
                 *
                 * هذا يقلل احتمال أن يصل المستخدم
                 * إلى البطاقة قبل انتهاء تحميل صورتها،
                 * مع بقاء Lazy Loading فعالًا.
                 */
                rootMargin:
                    "500px 0px",

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
            loading="lazy"
            decoding="async"
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


        /*
         * حتى عند عدم وجود منتجات معروضة،
         * نعيد مراقبة الدفعات الموجودة.
         */
        setupProductBatchSyncObserver();

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


    /*
     * إعادة تجهيز مراقب الدفعات بعد
     * إعادة بناء الواجهة.
     */
    setupProductBatchSyncObserver();
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
     * أثناء البحث لا نضيف دفعات جديدة.
     */
    if (
        productSearchInput &&
        productSearchInput.value.trim()
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


    /*
     * إعادة تجهيز مراقب الدفعات.
     */
    setupProductBatchSyncObserver();
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


    /*
     * لا نضع Sentinel أثناء البحث.
     */
    if (
        productSearchInput &&
        productSearchInput.value.trim()
    ) {

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
                .select(
                    getProductsSelectFields()
                )
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


        /*
         * =====================================================
         * طلب واحد فقط إلى Supabase.
         *
         * هذا الطلب يجلب:
         * - بيانات المنتج كاملة
         * - updated_at
         *
         * لذلك لا يوجد بعده طلب منفصل
         * لـ id + updated_at.
         * =====================================================
         */
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


        /*
         * =====================================================
         * هذه الدفعة جاءت مباشرة من Supabase
         * ومعها updated_at في نفس الطلب.
         *
         * لذلك نعتبرها متزامنة مباشرة.
         *
         * لا يوجد طلب:
         * select("id, updated_at")
         *
         * لهذه الدفعة.
         * =====================================================
         */
        const batchIndex =
            Math.max(
                0,
                currentPage - 1
            );


        syncedProductBatches.add(
            batchIndex
        );


        /*
         * حفظ الكاش مجرد تحسين أداء.
         * فشل الحفظ لا يمنع العرض.
         */
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


    /*
     * حساب عدد الدفعات الموجودة
     * في الكاش.
     */
    currentPage =
        Math.ceil(
            window.products.length /
            PRODUCTS_PAGE_SIZE
        );


    /*
     * في البداية نفترض وجود المزيد،
     * ثم يتم تصحيح ذلك عند الحاجة
     * بواسطة Infinite Scroll.
     */
    hasMoreProducts = true;


    /*
     * إعادة ضبط قائمة الدفعات
     * التي تم فحصها في هذه الجلسة.
     */
    syncedProductBatches.clear();


    syncingProductBatches.clear();


    /*
     * الكاش يمكن تحميله كاملًا إلى الذاكرة
     * وعرضه مباشرة.
     *
     * هذا لا يعني أننا قمنا بتحميل كل المنتجات
     * من Supabase؛ البيانات هنا جاءت من localStorage.
     */
    displayProducts();


    return true;
}


/* =========================================================
   تحديد الدفعة الموجودة في الكاش
========================================================= */

function getProductBatchIndexByPosition(
    index
) {

    return Math.floor(
        index /
        PRODUCTS_PAGE_SIZE
    );
}


/* =========================================================
   مزامنة دفعة واحدة مع Supabase
========================================================= */

async function syncProductBatch(
    batchIndex
) {

    /*
     * إذا تمت مزامنة الدفعة بالفعل،
     * لا نرسل أي طلب.
     */
    if (
        syncedProductBatches.has(
            batchIndex
        )
    ) {

        return true;
    }


    /*
     * منع طلبين متزامنين لنفس الدفعة.
     */
    if (
        syncingProductBatches.has(
            batchIndex
        )
    ) {

        return false;
    }


    syncingProductBatches.add(
        batchIndex
    );


    const startIndex =
        batchIndex *
        PRODUCTS_PAGE_SIZE;


    const batchProducts =
        window.products.slice(
            startIndex,
            startIndex +
            PRODUCTS_PAGE_SIZE
        );


    if (
        batchProducts.length === 0
    ) {

        syncedProductBatches.add(
            batchIndex
        );

        syncingProductBatches.delete(
            batchIndex
        );

        return true;
    }


    /*
     * IDs الموجودة في الكاش لهذه الدفعة فقط.
     */
    const batchIds =
        batchProducts.map(
            product =>
                String(product.id)
        );


    try {

        /*
         * =====================================================
         * هذا الطلب خاص فقط بالدفعات القادمة من CACHE.
         *
         * الهدف:
         * مقارنة updated_at دون تحميل بيانات
         * المنتجات كاملة.
         *
         * لا يتم تنفيذ هذا الطلب للدفعات التي
         * جُلبت حديثًا من Supabase، لأنها تكون
         * قد حصلت على updated_at أصلًا.
         * =====================================================
         */
        const {
            data: metadata,
            error: metadataError
        } =
            await supabaseClient
                .from("products")
                .select(
                    "id, updated_at"
                )
                .in(
                    "id",
                    batchIds
                );


        if (metadataError) {
            throw metadataError;
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
         * المنتجات المحذوفة من قاعدة البيانات
         * داخل هذه الدفعة فقط.
         */
        const deletedIds =
            batchProducts
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


        /*
         * المنتجات التي تغير updated_at
         * داخل هذه الدفعة فقط.
         */
        const changedIds =
            batchProducts
                .filter(product => {

                    const remoteUpdatedAt =
                        remoteMap.get(
                            product.id
                        );


                    return (
                        remoteUpdatedAt !== undefined &&
                        remoteUpdatedAt !==
                        product.updatedAt
                    );

                })
                .map(
                    product =>
                        product.id
                );


        /*
         * إذا لم يحدث أي تغيير،
         * ننهي المزامنة بدون جلب
         * بيانات المنتج الكاملة.
         */
        if (
            changedIds.length === 0 &&
            deletedIds.length === 0
        ) {

            syncedProductBatches.add(
                batchIndex
            );

            return true;
        }


        /*
         * نجلب البيانات الكاملة فقط
         * للمنتجات التي تغيرت.
         */
        let updatedProducts = [];


        if (
            changedIds.length > 0
        ) {

            updatedProducts =
                await fetchProductsByIds(
                    changedIds
                );

        }


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
         * تحديث المنتجات التي تغيرت
         * وحذف المنتجات التي اختفت.
         */
        window.products =
            window.products
                .filter(
                    product =>
                        !deletedIds.includes(
                            product.id
                        )
                )
                .map(
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
         * إعادة ترتيب القائمة.
         */
        window.products.sort(
            (a, b) =>
                Number(a.id) -
                Number(b.id)
        );


        /*
         * لأن حذف منتج قد يغيّر موضع الدفعات
         * التالية، نعيد بناء مراقب الدفعات.
         */
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


        /*
         * الكاش يتم تحديثه بعد نجاح المزامنة.
         *
         * وإذا فشل الحفظ، يبقى المتجر يعمل.
         */
        saveProductsCache();


        /*
         * نعتبر الدفعة متزامنة فقط بعد
         * نجاح عملية المزامنة بالكامل.
         */
        syncedProductBatches.add(
            batchIndex
        );


        return true;


    } catch (error) {

        console.warn(
            `تعذر مزامنة دفعة المنتجات رقم ${batchIndex + 1}:`,
            error
        );


        /*
         * لا نضيف الدفعة إلى syncedProductBatches.
         *
         * وبالتالي يمكن إعادة محاولة مزامنتها
         * لاحقًا.
         */
        return false;


    } finally {

        syncingProductBatches.delete(
            batchIndex
        );
    }
}


/* =========================================================
   مراقبة دفعات المنتجات الموجودة في الكاش
========================================================= */

function setupProductBatchSyncObserver() {

    if (!productsContainer) {
        return;
    }


    /*
     * إيقاف المراقب السابق.
     */
    if (
        productBatchSyncObserver
    ) {

        productBatchSyncObserver.disconnect();

    }


    /*
     * أثناء البحث لا نحتاج إلى مزامنة
     * دفعات جديدة؛ البحث محلي.
     */
    if (
        productSearchInput &&
        productSearchInput.value.trim()
    ) {

        return;
    }


    /*
     * نبحث عن بطاقات المنتجات الحالية.
     */
    const productCards =
        productsContainer.querySelectorAll(
            ".product-card"
        );


    if (
        productCards.length === 0
    ) {

        return;
    }


    /*
     * نراقب أول بطاقة في كل دفعة.
     *
     * مثال:
     * البطاقة 1  → الدفعة الأولى
     * البطاقة 21 → الدفعة الثانية
     * البطاقة 41 → الدفعة الثالثة
     */
    productBatchSyncObserver =
        new IntersectionObserver(
            function(entries, observer) {

                entries.forEach(entry => {

                    if (
                        !entry.isIntersecting
                    ) {

                        return;
                    }


                    const card =
                        entry.target;


                    const cardsArray =
                        Array.from(
                            productCards
                        );


                    const cardIndex =
                        cardsArray.indexOf(
                            card
                        );


                    if (
                        cardIndex < 0
                    ) {

                        return;
                    }


                    const batchIndex =
                        getProductBatchIndexByPosition(
                            cardIndex
                        );


                    /*
                     * نبدأ مزامنة الدفعة.
                     *
                     * إذا نجحت، نوقف مراقبة البطاقة.
                     *
                     * إذا فشلت، تبقى البطاقة مراقبة
                     * ويمكن إعادة المحاولة.
                     */
                    syncProductBatch(
                        batchIndex
                    ).then(
                        success => {

                            if (
                                success
                            ) {

                                observer.unobserve(
                                    card
                                );

                            }

                        }
                    );

                });

            },
            {
                root: null,

                /*
                 * المزامنة تبدأ قبل الوصول الفعلي
                 * إلى الدفعة بحوالي 700px.
                 */
                rootMargin:
                    "700px 0px",

                threshold: 0
            }
        );


    /*
     * أول بطاقة في كل دفعة فقط.
     */
    productCards.forEach(
        (card, index) => {

            if (
                index %
                PRODUCTS_PAGE_SIZE ===
                0
            ) {

                productBatchSyncObserver.observe(
                    card
                );

            }

        }
    );
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
         * لا نقوم هنا بفحص جميع المنتجات.
         *
         * نفحص الدفعة الأولى فقط لأنها
         * أول دفعة ظاهرة للمستخدم.
         *
         * وإذا كانت هذه الدفعة قد جُلبت حديثًا
         * من Supabase في نفس الجلسة، فإن
         * syncedProductBatches تحتوي عليها،
         * وبالتالي لا يتم إرسال أي طلب إضافي.
         */
        await syncProductBatch(0);


        /*
         * إذا لم توجد منتجات محملة،
         * نطلب أول دفعة مباشرة من Supabase.
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
         * Infinite Scroll سيطلب الدفعة التالية
         * عند اقتراب المستخدم من نهاية المنتجات.
         */
        setupProductsSentinel();


        setupProductBatchSyncObserver();


    } catch (error) {

        console.warn(
            "تعذر مزامنة كاش المنتجات:",
            error
        );


        /*
         * إذا كانت هناك منتجات في الكاش،
         * لا نمسحها ولا نكسر المتجر.
         *
         * وإذا لم توجد منتجات أصلًا،
         * نستخدم Supabase لجلب أول دفعة فقط.
         */
        if (
            window.products.length === 0
        ) {

            try {

                currentPage = 0;

                lastLoadedProductId = 0;

                hasMoreProducts = true;

                await loadNextProductsPage();

            } catch (fallbackError) {

                console.error(
                    "فشل Fallback تحميل أول دفعة:",
                    fallbackError
                );

            }

        }

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
         * =====================================================
         * الحالة الأولى: لا يوجد Cache
         * =====================================================
         *
         * نطلب أول 20 منتجًا فقط.
         *
         * الطلب نفسه يحتوي على:
         * - بيانات المنتج الكاملة
         * - updated_at
         *
         * لذلك لا يوجد طلب ثانٍ لمقارنة
         * id + updated_at.
         */
        if (!hasCache) {

            currentPage = 0;

            lastLoadedProductId = 0;

            hasMoreProducts = true;

            syncedProductBatches.clear();

            syncingProductBatches.clear();


            const previousCount =
                window.products.length;


            await loadNextProductsPage();


            /*
             * إذا فشل تحميل أول دفعة ولم نحصل
             * على أي منتج، نعرض حالة الخطأ.
             */
            if (
                window.products.length ===
                previousCount &&
                window.products.length === 0
            ) {

                throw new Error(
                    "تعذر تحميل أول دفعة من المنتجات."
                );

            }


            /*
             * =================================================
             * مهم جدًا:
             *
             * لا نستدعي syncProductsCache() هنا.
             *
             * loadNextProductsPage() قام أصلًا:
             *
             * Supabase
             *      ↓
             * أول 20 منتجًا + updated_at
             *      ↓
             * syncedProductBatches.add(0)
             *
             * لذلك لا يوجد أي طلب إضافي.
             * =================================================
             */

        } else {

            /*
             * =================================================
             * الحالة الثانية: يوجد Cache
             * =================================================
             *
             * هنا فقط نبدأ مزامنة الدفعة الأولى
             * الموجودة في الكاش.
             */
            await syncProductsCache();

        }


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