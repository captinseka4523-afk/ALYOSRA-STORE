// ==========================================================
// AL YOSRA STORE — PRODUCT DETAILS
// Products + Variants
// ==========================================================


// ==========================================================
// 1. Product ID
// ==========================================================

const productId =
    new URLSearchParams(window.location.search)
        .get("id");


// ==========================================================
// 2. عناصر الصفحة
// ==========================================================

const productImage =
    document.getElementById("productImage");

const productName =
    document.getElementById("productName");

const productPrice =
    document.getElementById("productPrice");

const productSpecs =
    document.getElementById("productSpecs");

const productStock =
    document.getElementById("productStock");

const quantityInput =
    document.getElementById("quantityInput");

const plusBtn =
    document.getElementById("plusBtn");

const minusBtn =
    document.getElementById("minusBtn");

const addToCartBtn =
    document.getElementById("addToCartBtn");


// ==========================================================
// Variant Elements
// ==========================================================

const variantSelector =
    document.getElementById("variantSelector");

const variantProgress =
    document.getElementById("variantProgress");

const variantChoices =
    document.getElementById("variantChoices");

const variantSelectedSummary =
    document.getElementById(
        "variantSelectedSummary"
    );

const variantNavigation =
    document.getElementById(
        "variantNavigation"
    );

const variantPreviousBtn =
    document.getElementById(
        "variantPreviousBtn"
    );


// ==========================================================
// 3. الحالة
// ==========================================================

let currentProduct = null;

let hasVariants = false;

let variantGroups = [];

let variantValues = [];

let variants = [];

let variantOptions = [];

let selectedOptions = {};

let currentVariant = null;

let currentVariantStep = 0;


// ==========================================================
// Local Storage Keys
// ==========================================================

const VARIANT_CART_SNAPSHOTS_KEY =
    "alYosraVariantCartSnapshots_v1";


// ==========================================================
// 4. Variant Cart Snapshots
// ==========================================================

function readVariantCartSnapshots() {

    try {

        const raw =
            localStorage.getItem(
                VARIANT_CART_SNAPSHOTS_KEY
            );

        if (!raw) {
            return {};
        }

        const parsed =
            JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) {
            return {};
        }

        return parsed;

    } catch (error) {

        console.warn(
            "تعذر قراءة بيانات Variants المحلية:",
            error
        );

        return {};
    }
}


function saveVariantCartSnapshot(
    variant,
    quantity
) {

    const snapshots =
        readVariantCartSnapshots();

    const selections = [];

    variantGroups.forEach(
        group => {

            const valueId =
                selectedOptions[
                    String(group.id)
                ];

            if (valueId === undefined) {
                return;
            }

            const value =
                variantValues.find(
                    item =>
                        Number(item.id) ===
                        Number(valueId)
                );

            if (!value) {
                return;
            }

            selections.push({
                groupId:
                    Number(group.id),

                groupName:
                    group.name,

                valueId:
                    Number(value.id),

                value:
                    value.value
            });
        }
    );

    const price =
        variant.price !== null &&
        variant.price !== undefined
            ? Number(variant.price)
            : Number(currentProduct.price);

    snapshots[
        `variant_${variant.id}`
    ] = {

        variantId:
            Number(variant.id),

        productId:
            String(currentProduct.id),

        productName:
            currentProduct.name,

        image:
            currentProduct.image ||
            currentProduct.main_image ||
            "",

        sku:
            variant.sku || "",

        price:
            price,

        quantity:
            Number(variant.quantity) || 0,

        selections:
            selections,

        savedAt:
            Date.now()
    };

    try {

        localStorage.setItem(
            VARIANT_CART_SNAPSHOTS_KEY,
            JSON.stringify(snapshots)
        );

    } catch (error) {

        console.warn(
            "تعذر حفظ بيانات Variant المحلية:",
            error
        );
    }
}


// ==========================================================
// 5. أدوات عامة
// ==========================================================

function resetQuantity() {

    if (!quantityInput) {
        return;
    }

    quantityInput.value = "1";
}


function setProductStockText(text) {

    if (productStock) {
        productStock.textContent = text;
    }
}


function setAddButton(
    disabled,
    text
) {

    if (!addToCartBtn) {
        return;
    }

    addToCartBtn.disabled =
        disabled;

    if (text !== undefined) {
        addToCartBtn.textContent =
            text;
    }
}


// ==========================================================
// 6. تحميل بيانات الـVariants
// ==========================================================

async function loadProductVariants() {

    // ======================================================
    // تصفير بيانات الـVariants القديمة
    // ======================================================

    variantGroups = [];
    variantValues = [];
    variants = [];
    variantOptions = [];


    if (!currentProduct) {

        return {
            ok: false,
            hasVariants: false
        };
    }


    // ======================================================
    // تحميل Variants مباشرة من قاعدة البيانات
    //
    // لا يوجد Cache للـVariants.
    // عند فتح صفحة المنتج يتم جلب أحدث بيانات
    // الـVariants الخاصة بهذا المنتج فقط.
    // ======================================================

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_product_variants_bundle",
                    {
                        p_product_id:
                            Number(
                                currentProduct.id
                            )
                    }
                );


        if (error) {
            throw error;
        }


        const bundle =
            data || {};


        // ==================================================
        // استخراج بيانات الـVariants
        // ==================================================

        variantGroups =
            Array.isArray(
                bundle.groups
            )
                ? bundle.groups
                : [];


        variantValues =
            Array.isArray(
                bundle.values
            )
                ? bundle.values
                : [];


        variants =
            Array.isArray(
                bundle.variants
            )
                ? bundle.variants
                : [];


        variantOptions =
            Array.isArray(
                bundle.options
            )
                ? bundle.options
                : [];


        // ==================================================
        // التحقق من وجود Variants فعالة
        // ==================================================

        if (
            variantGroups.length === 0 ||
            variants.length === 0
        ) {

            return {
                ok: true,
                hasVariants: false
            };
        }


        return {
            ok: true,
            hasVariants: true
        };


    } catch (error) {

        console.error(
            "تعذر تحميل خيارات المنتج:",
            error
        );


        // ==================================================
        // عند الفشل:
        //
        // لا نستخدم أي بيانات قديمة.
        // المنتج لن يعرض Variants غير مؤكدة.
        // ==================================================

        variantGroups = [];
        variantValues = [];
        variants = [];
        variantOptions = [];


        return {
            ok: false,
            hasVariants: false
        };
    }
}


// ==========================================================
// 7. مطابقة Variant مع الاختيارات الحالية
// ==========================================================

function getVariantSelections(variantId) {

    const links =
        variantOptions.filter(
            item =>
                Number(item.variant_id) ===
                Number(variantId)
        );


    const selections = {};


    links.forEach(
        link => {

            const value =
                variantValues.find(
                    item =>
                        Number(item.id) ===
                        Number(
                            link.option_value_id
                        )
                );

            if (!value) {
                return;
            }


            const group =
                variantGroups.find(
                    item =>
                        Number(item.id) ===
                        Number(
                            value.option_group_id
                        )
                );

            if (!group) {
                return;
            }


            selections[
                String(group.id)
            ] =
                Number(value.id);
        }
    );


    return selections;
}


// ==========================================================
// 8. هل الـVariant يطابق الاختيارات الحالية؟
// ==========================================================

function variantMatchesSelections(
    variant,
    selections
) {

    const variantSelection =
        getVariantSelections(
            variant.id
        );


    for (
        const groupId in selections
    ) {

        if (
            Number(
                variantSelection[groupId]
            ) !==
            Number(
                selections[groupId]
            )
        ) {

            return false;
        }
    }


    return true;
}


// ==========================================================
// 9. القيم المتاحة للمجموعة الحالية
// ==========================================================

function getAvailableValuesForGroup(
    groupId
) {

    const availableValues = [];


    const groupValues =
        variantValues.filter(
            value =>
                Number(
                    value.option_group_id
                ) ===
                Number(groupId)
        );


    groupValues.forEach(
        value => {

            const testSelections = {

                ...selectedOptions,

                [String(groupId)]:
                    Number(value.id)
            };


            const possibleVariant =
                variants.some(
                    variant => {

                        if (
                            !variantMatchesSelections(
                                variant,
                                testSelections
                            )
                        ) {

                            return false;
                        }


                        const quantity =
                            Number(
                                variant.quantity
                            ) || 0;


                        return quantity > 0;
                    }
                );


            if (possibleVariant) {

                availableValues.push(
                    value
                );
            }
        }
    );


    return availableValues;
}


// ==========================================================
// 10. الحصول على الـVariant النهائي
// ==========================================================

function findSelectedVariant() {

    if (
        Object.keys(selectedOptions).length !==
        variantGroups.length
    ) {

        return null;
    }


    return (
        variants.find(
            variant =>
                variantMatchesSelections(
                    variant,
                    selectedOptions
                )
        ) || null
    );
}


// ==========================================================
// 11. عرض ملخص الاختيارات
// ==========================================================

function renderSelectedSummary() {

    if (!variantSelectedSummary) {
        return;
    }


    variantSelectedSummary.innerHTML = "";


    variantGroups.forEach(
        group => {

            const selectedValueId =
                selectedOptions[
                    String(group.id)
                ];


            if (
                selectedValueId ===
                undefined
            ) {

                return;
            }


            const value =
                variantValues.find(
                    item =>
                        Number(item.id) ===
                        Number(
                            selectedValueId
                        )
                );


            if (!value) {
                return;
            }


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "variant-selected-item";


            item.textContent =
                `✓ ${group.name} — ${value.value}`;


            variantSelectedSummary.appendChild(
                item
            );
        }
    );
}


// ==========================================================
// 12. عرض مرحلة اختيار واحدة
// ==========================================================

function renderVariantStep() {

    if (!variantSelector) {
        return;
    }


    const group =
        variantGroups[
            currentVariantStep
        ];


    if (!group) {
        return;
    }


    const availableValues =
        getAvailableValuesForGroup(
            group.id
        );


  if (variantProgress) {

    variantProgress.innerHTML = `
        <span class="variant-progress-step">
            الخيار ${currentVariantStep + 1} من ${variantGroups.length}
        </span>

        <span class="variant-progress-title">
            ${group.name}
        </span>
    `;
}

    if (variantChoices) {

        variantChoices.innerHTML = "";


        availableValues.forEach(
            value => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type = "button";


                button.className =
                    "variant-choice-btn";


                button.textContent =
                    value.value;


                const selected =
                    Number(
                        selectedOptions[
                            String(group.id)
                        ]
                    ) ===
                    Number(value.id);


                if (selected) {

                    button.classList.add(
                        "selected"
                    );
                }


                button.addEventListener(
                    "click",
                    function() {

                        selectedOptions[
                            String(group.id)
                        ] =
                            Number(value.id);


                        for (
                            let index =
                                currentVariantStep + 1;

                            index <
                            variantGroups.length;

                            index++
                        ) {

                            delete selectedOptions[
                                String(
                                    variantGroups[
                                        index
                                    ].id
                                )
                            ];
                        }


                        if (
                            currentVariantStep <
                            variantGroups.length - 1
                        ) {

                            currentVariantStep++;

                            renderVariantStep();

                        } else {

                            currentVariant =
                                findSelectedVariant();

                            renderVariantStep();
                        }
                    }
                );


                variantChoices.appendChild(
                    button
                );
            }
        );


        if (
            availableValues.length === 0
        ) {

            variantChoices.innerHTML = `
                <div class="variant-unavailable">
                    لا توجد خيارات متاحة لهذه المجموعة.
                </div>
            `;
        }
    }


    renderSelectedSummary();


    if (variantPreviousBtn) {

        variantPreviousBtn.hidden =
            currentVariantStep <= 0;


        variantPreviousBtn.onclick =
            function() {

                if (
                    currentVariantStep <= 0
                ) {

                    return;
                }


                delete selectedOptions[
                    String(
                        variantGroups[
                            currentVariantStep
                        ].id
                    )
                ];


                currentVariant = null;


                currentVariantStep--;


                renderVariantStep();


                updateVariantProductState();
            };
    }


    updateVariantProductState();
}


// ==========================================================
// 13. حالة المنتج بعد اختيار الـVariant
// ==========================================================

function updateVariantProductState() {

    if (!currentProduct) {
        return;
    }


    const complete =
        Object.keys(selectedOptions).length ===
        variantGroups.length;


    if (!complete) {

        currentVariant = null;


        if (productPrice) {

            productPrice.textContent =
                currentProduct.price + " $";
        }


        setProductStockText(
            "اختر الخيارات لمعرفة السعر والمخزون"
        );


        resetQuantity();


        if (quantityInput) {

            quantityInput.removeAttribute(
                "max"
            );
        }


        setAddButton(
            true,
            "اختر الخيارات أولاً"
        );


        return;
    }


    currentVariant =
        findSelectedVariant();


    if (!currentVariant) {

        setProductStockText(
            "هذا الاختيار غير متوفر حاليًا"
        );


        resetQuantity();


        setAddButton(
            true,
            "غير متوفر حاليًا"
        );


        return;
    }


    const price =
        currentVariant.price !== null &&
        currentVariant.price !== undefined
            ? Number(
                currentVariant.price
            )
            : Number(
                currentProduct.price
            );


    const quantity =
        Number(
            currentVariant.quantity
        ) || 0;


    if (productPrice) {

        productPrice.textContent =
            price + " $";
    }


    if (quantity <= 0) {

        setProductStockText(
            "غير متوفر حاليًا"
        );


        setAddButton(
            true,
            "غير متوفر حاليًا"
        );


        if (quantityInput) {

            quantityInput.max =
                "0";

            quantityInput.value =
                "1";
        }


        return;
    }


    setProductStockText(
        `متوفر في المخزون: ${quantity}`
    );


    if (quantityInput) {

        quantityInput.max =
            String(quantity);

        quantityInput.value =
            "1";
    }


    setAddButton(
        false,
        "أضف إلى السلة"
    );
}


// ==========================================================
// 14. تهيئة واجهة Variants
// ==========================================================

function initializeVariants() {

    if (
        !hasVariants ||
        !variantSelector
    ) {

        return;
    }


    variantSelector.hidden =
        false;


    selectedOptions = {};


    currentVariant = null;


    currentVariantStep = 0;


    renderVariantStep();
}


// ==========================================================
// 15. عرض تفاصيل المنتج
// ==========================================================

async function displayProductDetails() {

    currentProduct =
        window.products.find(
            item =>
                String(item.id) ===
                String(productId)
        );


    // ======================================================
    // Fallback إذا لم يكن المنتج موجودًا في window.products
    // ======================================================

    if (!currentProduct) {

        try {

            const {
                data,
                error
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
                        target,
                        product_code,
                        category_id,
                        updated_at,
                        variants_updated_at
                    `)
                    .eq(
                        "id",
                        Number(productId)
                    )
                    .maybeSingle();


            if (!error && data) {

                currentProduct = {

                    ...data,

                    image:
                        data.main_image || ""
                };
            }

        } catch (error) {

            console.error(
                "تعذر تحميل المنتج مباشرة:",
                error
            );
        }
    }


    // ======================================================
    // المنتج غير موجود
    // ======================================================

    if (!currentProduct) {

        if (productName) {

            productName.textContent =
                "المنتج غير موجود";
        }


        if (productSpecs) {

            productSpecs.innerHTML = `
                <li>
                    تعذر العثور على هذا المنتج.
                </li>
            `;
        }


        setAddButton(
            true,
            "غير متوفر"
        );


        return;
    }


    // ======================================================
    // عرض بيانات المنتج الأساسية
    // ======================================================

    if (productImage) {

        productImage.src =
            currentProduct.image ||
            currentProduct.main_image ||
            "";


        productImage.alt =
            currentProduct.name;
    }


    if (productName) {

        productName.textContent =
            currentProduct.name;
    }


    if (productSpecs) {

        productSpecs.innerHTML = "";


        const description =
            String(
                currentProduct.description || ""
            ).trim();


        const descriptionItem =
            document.createElement(
                "li"
            );


        descriptionItem.textContent =
            description ||
            "لا يوجد وصف مضاف لهذا المنتج حاليًا.";


        productSpecs.appendChild(
            descriptionItem
        );
    }


    if (productPrice) {

        productPrice.textContent =
            currentProduct.price + " $";
    }


    // ======================================================
    // تحميل Variants
    // ======================================================

    const variantLoadResult =
        await loadProductVariants();


    // ======================================================
    // فشل التحقق من Variants
    // ======================================================

    if (!variantLoadResult.ok) {

        hasVariants = false;


        if (variantSelector) {

            variantSelector.hidden =
                true;
        }


        setProductStockText(
            "تعذر التحقق من خيارات المنتج والمخزون حاليًا"
        );


        setAddButton(
            true,
            "تعذر التحقق حاليًا"
        );


        resetQuantity();


        if (quantityInput) {

            quantityInput.removeAttribute(
                "max"
            );
        }


        return;
    }


    // ======================================================
    // المنتج لديه Variants
    // ======================================================

    hasVariants =
        variantLoadResult.hasVariants;


    if (hasVariants) {

        if (variantSelector) {

            variantSelector.hidden =
                false;
        }


        setProductStockText(
            "اختر الخيارات لمعرفة السعر والمخزون"
        );


        setAddButton(
            true,
            "اختر الخيارات أولاً"
        );


        if (quantityInput) {

            quantityInput.removeAttribute(
                "max"
            );
        }


        initializeVariants();


        return;
    }


    // ======================================================
    // المنتج عادي — بدون Variants
    // ======================================================

    if (variantSelector) {

        variantSelector.hidden =
            true;
    }


    if (
        Number(
            currentProduct.quantity
        ) <= 0
    ) {

        setProductStockText(
            "غير متوفر حاليًا"
        );


        setAddButton(
            true,
            "غير متوفر حاليًا"
        );

    } else {

        setProductStockText(
            "متوفر في المخزون"
        );


        setAddButton(
            false,
            "أضف إلى السلة"
        );
    }


    if (quantityInput) {

        quantityInput.max =
            currentProduct.quantity;
    }
}


// ==========================================================
// 16. زر +
// ==========================================================

if (plusBtn) {

    plusBtn.addEventListener(
        "click",
        function() {

            if (!currentProduct) {
                return;
            }


            let quantity =
                Number(
                    quantityInput.value
                ) || 1;


            const maxQuantity =
                hasVariants
                    ? Number(
                        currentVariant?.quantity
                    ) || 0
                    : Number(
                        currentProduct.quantity
                    ) || 0;


            if (
                quantity < maxQuantity
            ) {

                quantity++;
            }


            quantityInput.value =
                quantity;
        }
    );
}


// ==========================================================
// 17. زر -
// ==========================================================

if (minusBtn) {

    minusBtn.addEventListener(
        "click",
        function() {

            let quantity =
                Number(
                    quantityInput.value
                ) || 1;


            if (quantity > 1) {

                quantity--;
            }


            quantityInput.value =
                quantity;
        }
    );
}


// ==========================================================
// 18. إضافة إلى السلة
// ==========================================================

if (addToCartBtn) {

    addToCartBtn.addEventListener(
        "click",
        function() {

            if (!currentProduct) {
                return;
            }


            // ==================================================
            // Variant
            // ==================================================

            if (hasVariants) {

                if (!currentVariant) {
                    return;
                }


                const availableQuantity =
                    Number(
                        currentVariant.quantity
                    ) || 0;


                if (
                    availableQuantity <= 0
                ) {

                    return;
                }


                let quantity =
                    Number(
                        quantityInput.value
                    ) || 1;


                if (quantity < 1) {

                    quantity = 1;
                }


                if (
                    quantity >
                    availableQuantity
                ) {

                    quantity =
                        availableQuantity;
                }


                const cart =
                    JSON.parse(
                        localStorage.getItem(
                            "cart"
                        )
                    ) || {};


                const cartKey =
                    `variant_${currentVariant.id}`;


                const currentCartQuantity =
                    Number(
                        cart[cartKey]
                    ) || 0;


                if (
                    currentCartQuantity +
                    quantity >
                    availableQuantity
                ) {

                    alert(
                        "الكمية المطلوبة أكبر من الكمية المتوفرة في المخزون."
                    );

                    return;
                }


                cart[cartKey] =
                    currentCartQuantity +
                    quantity;


                saveVariantCartSnapshot(
                    currentVariant,
                    currentCartQuantity + quantity
                );


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


                addToCartBtn.textContent =
                    "تمت الإضافة ✓";


                setTimeout(
                    function() {

                        if (
                            currentVariant &&
                            Number(
                                currentVariant.quantity
                            ) > 0
                        ) {

                            addToCartBtn.textContent =
                                "أضف إلى السلة";
                        }

                    },
                    1200
                );


                return;
            }


            // ==================================================
            // منتج عادي — السلوك القديم
            // ==================================================

            let quantity =
                Number(
                    quantityInput.value
                ) || 1;


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


            const cart =
                JSON.parse(
                    localStorage.getItem(
                        "cart"
                    )
                ) || {};


            const currentCartQuantity =
                Number(
                    cart[
                        currentProduct.id
                    ]
                ) || 0;


            if (
                currentCartQuantity +
                quantity >
                currentProduct.quantity
            ) {

                alert(
                    "الكمية المطلوبة أكبر من الكمية المتوفرة في المخزون."
                );

                return;
            }


            cart[
                currentProduct.id
            ] =
                currentCartQuantity +
                quantity;


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


            addToCartBtn.textContent =
                "تمت الإضافة ✓";


            setTimeout(
                function() {

                    if (
                        currentProduct.quantity >
                        0
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


// ==========================================================
// 19. انتظار تحميل المنتجات
// ==========================================================

document.addEventListener(
    "productsLoaded",
    displayProductDetails
);


// ==========================================================
// 20. إذا كانت المنتجات محملة مسبقًا
// ==========================================================

if (
    Array.isArray(window.products) &&
    window.products.length > 0
) {

    displayProductDetails();
}