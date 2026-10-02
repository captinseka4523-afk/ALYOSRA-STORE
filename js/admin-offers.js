// ==========================================================
// AL YOSRA STORE — ADMIN OFFERS
// ==========================================================


// ==========================================
// DOM
// ==========================================

const offerForm =
    document.getElementById("offerForm");

const offerQuantity =
    document.getElementById("offerQuantity");

const productsList =
    document.getElementById("productsList");

const offersList =
    document.getElementById("offersList");

const offerEditModal =
    document.getElementById("offerEditModal");

const offerEditForm =
    document.getElementById("offerEditForm");

const editOfferId =
    document.getElementById("editOfferId");

const editOfferName =
    document.getElementById("editOfferName");

const editOfferDescription =
    document.getElementById("editOfferDescription");

const editOfferPrice =
    document.getElementById("editOfferPrice");

const editOfferQuantity =
    document.getElementById("editOfferQuantity");

const offerImageFile =
    document.getElementById("offerImageFile");

const offerImagePreview =
    document.getElementById("offerImagePreview");

const offerImagePreviewImage =
    document.getElementById("offerImagePreviewImage");

const offerImageStatus =
    document.getElementById("offerImageStatus");

const editOfferImageFile =
    document.getElementById("editOfferImageFile");

const editOfferImagePreview =
    document.getElementById("editOfferImagePreview");

const editOfferImagePreviewImage =
    document.getElementById("editOfferImagePreviewImage");

const editOfferImageStatus =
    document.getElementById("editOfferImageStatus");

const editOfferProductsList =
    document.getElementById("editOfferProductsList");

const offerEditMessage =
    document.getElementById("offerEditMessage");

const closeOfferEditModalButton =
    document.getElementById("closeOfferEditModal");

const cancelOfferEdit =
    document.getElementById("cancelOfferEdit");


// ==========================================
// DOM — نافذة اختيار الـVariants
// ==========================================

const offerVariantModal =
    document.getElementById("offerVariantModal");

const offerVariantModalTitle =
    document.getElementById("offerVariantModalTitle");

const offerVariantModalContent =
    document.getElementById("offerVariantModalContent");

const offerVariantModalMessage =
    document.getElementById("offerVariantModalMessage");

const closeOfferVariantModalButton =
    document.getElementById("closeOfferVariantModal");

const cancelOfferVariantModal =
    document.getElementById("cancelOfferVariantModal");

const saveOfferVariantSelection =
    document.getElementById("saveOfferVariantSelection");


// ==========================================
// الحالة العامة
// ==========================================

let products = [];

let offers = [];

const productVariantsMap =
    new Map();

const variantMap =
    new Map();

let adminOfferToastTimer;


// ==========================================
// حالة اختيار الـVariants
// ==========================================

/*
 * إنشاء عرض جديد:
 *
 * productId => Map(
 *      variantId => quantity
 * )
 */
const createVariantSelections =
    new Map();


/*
 * تعديل عرض موجود:
 *
 * productId => Map(
 *      variantId => quantity
 * )
 *
 * variantId = "legacy-null"
 * يستخدم فقط للتوافق مع عرض قديم
 * كان يحتوي product_id بدون variant_id.
 */
const editVariantSelections =
    new Map();


/*
 * بيانات نافذة الـVariant الحالية.
 */
let currentVariantModalProductId =
    null;

let currentVariantModalMode =
    null;

let currentVariantModalWorkingSelections =
    new Map();


// ==========================================
// أدوات مساعدة
// ==========================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function getProductVariants(
    productId
) {

    return (
        productVariantsMap.get(
            String(productId)
        ) || []
    );

}


function getVariantById(
    variantId
) {

    if (
        variantId === null ||
        variantId === undefined ||
        variantId === ""
    ) {
        return null;
    }


    return (
        variantMap.get(
            String(variantId)
        ) || null
    );

}


function getVariantLabel(
    variantId
) {

    const variant =
        getVariantById(
            variantId
        );


    if (!variant) {
        return "";
    }


    return (
        variant.label ||
        variant.sku ||
        `الخيار #${variant.id}`
    );

}


function getOfferItemDisplayName(
    item
) {

    const productName =
        item.products?.name ||
        "منتج";


    if (
        item.variant_id !== null &&
        item.variant_id !== undefined
    ) {

        const variantLabel =
            getVariantLabel(
                item.variant_id
            );


        if (variantLabel) {

            return (
                `${productName} — ${variantLabel}`
            );

        }


        return (
            `${productName} — الخيار #${item.variant_id}`
        );

    }


    return productName;

}


function getVariantMaxQuantity(
    product,
    variantId
) {

    const variant =
        getVariantById(
            variantId
        );


    if (variant) {

        return Math.max(
            1,
            Number(
                variant.quantity
            ) || 1
        );

    }


    return Math.max(
        1,
        Number(
            product?.quantity
        ) || 1
    );

}


function setQuantityLimit(
    quantityInput,
    maxQuantity
) {

    if (!quantityInput) {
        return;
    }


    const safeMax =
        Math.max(
            1,
            Number(maxQuantity) || 1
        );


    quantityInput.max =
        String(
            safeMax
        );


    const currentValue =
        Number(
            quantityInput.value
        );


    if (
        Number.isFinite(
            currentValue
        ) &&
        currentValue > safeMax
    ) {

        quantityInput.value =
            String(
                safeMax
            );

    }

}


function getProductById(
    productId
) {

    return (
        products.find(
            product =>
                String(
                    product.id
                ) ===
                String(
                    productId
                )
        ) || null
    );

}


function getVariantByProduct(
    productId,
    variantId
) {

    const variants =
        getProductVariants(
            productId
        );


    return (
        variants.find(
            variant =>
                String(
                    variant.id
                ) ===
                String(
                    variantId
                )
        ) || null
    );

}


function normalizeQuantity(
    value,
    fallback = 1
) {

    const number =
        Number(value);


    if (
        !Number.isInteger(
            number
        ) ||
        number <= 0
    ) {

        return fallback;

    }


    return number;

}


function cloneSelectionMap(
    sourceMap
) {

    const cloned =
        new Map();


    if (!sourceMap) {
        return cloned;
    }


    sourceMap.forEach(
        (
            quantity,
            variantId
        ) => {

            cloned.set(
                String(variantId),
                normalizeQuantity(
                    quantity
                )
            );

        }
    );


    return cloned;

}


function getCreateVariantSelectionMap(
    productId
) {

    const key =
        String(
            productId
        );


    if (
        !createVariantSelections.has(
            key
        )
    ) {

        createVariantSelections.set(
            key,
            new Map()
        );

    }


    return createVariantSelections.get(
        key
    );

}


function getEditVariantSelectionMap(
    productId
) {

    const key =
        String(
            productId
        );


    if (
        !editVariantSelections.has(
            key
        )
    ) {

        editVariantSelections.set(
            key,
            new Map()
        );

    }


    return editVariantSelections.get(
        key
    );

}


function getSelectionCount(
    selectionMap
) {

    if (!selectionMap) {
        return 0;
    }


    let count = 0;


    selectionMap.forEach(
        (
            quantity,
            variantId
        ) => {

            if (
                variantId !==
                "legacy-null"
            ) {

                count++;

            }

        }
    );


    return count;

}


function clearVariantSelections() {

    createVariantSelections.clear();

    editVariantSelections.clear();

    currentVariantModalProductId =
        null;

    currentVariantModalMode =
        null;

    currentVariantModalWorkingSelections =
        new Map();

}


// ==========================================
// بناء صف Variant داخل النافذة
// ==========================================

function createVariantModalRow(
    product,
    variant,
    selected = false,
    quantity = 1,
    allowInactiveSelection = false
) {

    const maxQuantity =
        getVariantMaxQuantity(
            product,
            variant.id
        );


    const label =
        variant.label ||
        variant.sku ||
        `الخيار #${variant.id}`;


    const inactive =
        !variant.active;


    const checkboxDisabled =
        inactive &&
        !allowInactiveSelection;


    const quantityDisabled =
        !selected;


    return `
        <div
            class="offer-variant-row ${
                selected
                    ? "selected"
                    : ""
            } ${
                inactive
                    ? "inactive"
                    : ""
            }"
            data-variant-id="${escapeHtml(
                variant.id
            )}"
        >

            <label
                class="offer-variant-checkbox"
                aria-label="${escapeHtml(
                    label
                )}"
            >

                <input
                    type="checkbox"
                    class="offer-variant-modal-checkbox"
                    data-variant-id="${escapeHtml(
                        variant.id
                    )}"
                    ${
                        selected
                            ? "checked"
                            : ""
                    }
                    ${
                        checkboxDisabled
                            ? "disabled"
                            : ""
                    }
                >

                <span
                    class="offer-variant-checkbox-mark"
                    aria-hidden="true"
                ></span>

            </label>


            <div
                class="offer-variant-info"
            >

                <div
                    class="offer-variant-name"
                >
                    ${escapeHtml(
                        label
                    )}
                </div>

                ${
                    variant.sku
                        ? `
                            <div
                                class="offer-variant-sku"
                            >
                                SKU:
                                ${escapeHtml(
                                    variant.sku
                                )}
                            </div>
                          `
                        : ""
                }

                <div
                    class="offer-variant-stock"
                >
                    المتوفر:
                    ${escapeHtml(
                        variant.quantity
                    )}
                </div>

                ${
                    inactive
                        ? `
                            <div
                                class="offer-variant-inactive-label"
                            >
                                غير فعال
                            </div>
                          `
                        : ""
                }

            </div>


            <div
                class="offer-variant-quantity"
            >

                <label
                    for="offerVariantQuantity-${escapeHtml(
                        variant.id
                    )}"
                >
                    الكمية
                </label>

                <input
                    id="offerVariantQuantity-${escapeHtml(
                        variant.id
                    )}"
                    type="number"
                    class="offer-variant-modal-quantity"
                    data-variant-id="${escapeHtml(
                        variant.id
                    )}"
                    min="1"
                    max="${maxQuantity}"
                    value="${Math.min(
                        maxQuantity,
                        Math.max(
                            1,
                            Number(
                                quantity
                            ) || 1
                        )
                    )}"
                    ${
                        quantityDisabled
                            ? "disabled"
                            : ""
                    }
                >

            </div>

        </div>
    `;

}


// ==========================================
// صف المنتج الأساسي القديم
// ==========================================

function createLegacyBaseModalRow(
    product,
    selected = false,
    quantity = 1
) {

    const maxQuantity =
        Math.max(
            1,
            Number(
                product.quantity
            ) || 1
        );


    return `
        <div
            class="offer-variant-row ${
                selected
                    ? "selected"
                    : ""
            } legacy-base-row"
            data-variant-id="legacy-null"
        >

            <label
                class="offer-variant-checkbox"
                aria-label="المنتج الأساسي"
            >

                <input
                    type="checkbox"
                    class="offer-variant-modal-checkbox"
                    data-variant-id="legacy-null"
                    ${
                        selected
                            ? "checked"
                            : ""
                    }
                >

                <span
                    class="offer-variant-checkbox-mark"
                    aria-hidden="true"
                ></span>

            </label>


            <div
                class="offer-variant-info"
            >

                <div
                    class="offer-variant-name"
                >
                    المنتج الأساسي
                </div>

                <div
                    class="offer-variant-sku"
                >
                    سجل قديم بدون خيار محدد
                </div>

            </div>


            <div
                class="offer-variant-quantity"
            >

                <label
                    for="offerVariantQuantity-legacy"
                >
                    الكمية
                </label>

                <input
                    id="offerVariantQuantity-legacy"
                    type="number"
                    class="offer-variant-modal-quantity"
                    data-variant-id="legacy-null"
                    min="1"
                    max="${maxQuantity}"
                    value="${Math.min(
                        maxQuantity,
                        Math.max(
                            1,
                            Number(
                                quantity
                            ) || 1
                        )
                    )}"
                    ${
                        selected
                            ? ""
                            : "disabled"
                    }
                >

            </div>

        </div>
    `;

}


// ==========================================
// عنصر منتج بدون Variants
// ==========================================

function createSimpleProductMarkup(
    product,
    selected = false,
    quantity = 1
) {

    const maxQuantity =
        Math.max(
            1,
            Number(
                product.quantity
            ) || 1
        );


    return `
        <div
            class="offer-product-item ${
                selected
                    ? "is-selected"
                    : ""
            }"
            data-product-id="${escapeHtml(
                product.id
            )}"
        >

            <div
                class="offer-product-info"
            >

                <div
                    class="offer-product-name"
                >
                    ${escapeHtml(
                        product.name
                    )}
                </div>

                ${
                    product.product_code
                        ? `
                            <div
                                class="offer-product-code"
                            >
                                ${escapeHtml(
                                    product.product_code
                                )}
                            </div>
                          `
                        : ""
                }

            </div>


            <div
                class="offer-product-selection"
            >

                <label
                    class="offer-product-checkbox-wrap"
                    aria-label="اختيار المنتج"
                >

                    <input
                        type="checkbox"
                        class="offer-product-checkbox"
                        value="${escapeHtml(
                            product.id
                        )}"
                        ${
                            selected
                                ? "checked"
                                : ""
                        }
                    >

                    <span
                        class="offer-product-checkbox-mark"
                        aria-hidden="true"
                    ></span>

                </label>


                <div
                    class="offer-product-quantity"
                >

                    <label
                        for="offerSimpleQuantity-${escapeHtml(
                            product.id
                        )}"
                    >
                        الكمية
                    </label>

                    <input
                        id="offerSimpleQuantity-${escapeHtml(
                            product.id
                        )}"
                        type="number"
                        class="offer-simple-product-quantity"
                        data-product-id="${escapeHtml(
                            product.id
                        )}"
                        min="1"
                        max="${maxQuantity}"
                        value="${Math.min(
                            maxQuantity,
                            Math.max(
                                1,
                                Number(
                                    quantity
                                ) || 1
                            )
                        )}"
                        ${
                            selected
                                ? ""
                                : "disabled"
                        }
                    >

                </div>

            </div>

        </div>
    `;

}


// ==========================================
// عنصر منتج يحتوي Variants
// ==========================================

function createVariantProductMarkup(
    product,
    selectionMap,
    editMode = false
) {

    const variants =
        getProductVariants(
            product.id
        );


    const activeVariants =
        variants.filter(
            variant =>
                variant.active
        );


    const selectedCount =
        getSelectionCount(
            selectionMap
        );


    const hasLegacySelection =
        Boolean(
            selectionMap?.has(
                "legacy-null"
            )
        );


    const hasAnySelection =
        selectedCount > 0 ||
        hasLegacySelection;


    const buttonText =
        hasAnySelection
            ? "تعديل الخيارات"
            : "اختر الخيارات";


    let inactiveSelectedCount =
        0;


    if (selectionMap) {

        selectionMap.forEach(
            (
                quantity,
                variantId
            ) => {

                if (
                    variantId ===
                    "legacy-null"
                ) {

                    return;

                }


                const variant =
                    getVariantById(
                        variantId
                    );


                if (
                    variant &&
                    !variant.active
                ) {

                    inactiveSelectedCount++;

                }

            }
        );

    }


    let summaryText =
        "لم يتم اختيار خيارات";


    if (hasAnySelection) {

        if (
            hasLegacySelection &&
            selectedCount === 0
        ) {

            summaryText =
                "المنتج الأساسي محدد";

        } else if (
            hasLegacySelection &&
            selectedCount === 1
        ) {

            summaryText =
                "خيار واحد + المنتج الأساسي";

        } else if (
            selectedCount === 1
        ) {

            summaryText =
                "خيار واحد محدد";

        } else {

            summaryText =
                `${selectedCount} خيارات محددة`;

        }

    }


    if (
        inactiveSelectedCount > 0
    ) {

        summaryText +=
            ` — ${inactiveSelectedCount} غير فعال`;

    }


    return `
        <div
            class="offer-product-item has-variants ${
                hasAnySelection
                    ? "is-selected"
                    : ""
            }"
            data-product-id="${escapeHtml(
                product.id
            )}"
        >

            <div
                class="offer-product-info"
            >

                <div
                    class="offer-product-name"
                >
                    ${escapeHtml(
                        product.name
                    )}
                </div>

                ${
                    product.product_code
                        ? `
                            <div
                                class="offer-product-code"
                            >
                                ${escapeHtml(
                                    product.product_code
                                )}
                            </div>
                          `
                        : ""
                }

            </div>


            <div
                class="offer-product-selection"
            >

                ${
                    activeVariants.length > 0 ||
                    (
                        editMode &&
                        hasAnySelection
                    )
                        ? `
                            <div
                                class="offer-product-summary ${
                                    hasAnySelection
                                        ? "has-selection"
                                        : ""
                                }"
                                data-product-summary="${escapeHtml(
                                    product.id
                                )}"
                            >
                                ${escapeHtml(
                                    summaryText
                                )}
                            </div>


                            <button
                                type="button"
                                class="offer-choose-variants-btn ${
                                    hasAnySelection
                                        ? "has-selection"
                                        : ""
                                }"
                                data-action="choose-variants"
                                data-product-id="${escapeHtml(
                                    product.id
                                )}"
                                data-mode="${
                                    editMode
                                        ? "edit"
                                        : "create"
                                }"
                            >
                                ${buttonText}
                            </button>
                          `
                        : `
                            <div
                                class="offer-no-active-variants"
                            >
                                لا توجد خيارات فعالة متاحة حاليًا.
                            </div>
                          `
                }

            </div>

        </div>
    `;

}


// ==========================================
// ربط أحداث اختيار المنتجات البسيطة
// ==========================================

function bindSimpleProductSelectionEvents(
    container
) {

    if (!container) {
        return;
    }


    container
        .querySelectorAll(
            ".offer-product-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () => {

                        const row =
                            checkbox.closest(
                                ".offer-product-item"
                            );


                        const quantityInput =
                            row?.querySelector(
                                ".offer-simple-product-quantity"
                            );


                        if (quantityInput) {

                            quantityInput.disabled =
                                !checkbox.checked;

                        }


                        row?.classList.toggle(
                            "is-selected",
                            checkbox.checked
                        );

                    }
                );

            }
        );


    container
        .querySelectorAll(
            ".offer-simple-product-quantity"
        )
        .forEach(
            quantityInput => {

                quantityInput.addEventListener(
                    "input",
                    () => {

                        const max =
                            Number(
                                quantityInput.max
                            ) || 1;


                        const value =
                            Number(
                                quantityInput.value
                            );


                        if (
                            Number.isFinite(value) &&
                            value > max
                        ) {

                            quantityInput.value =
                                String(max);

                        }

                    }
                );

            }
        );

}


// ==========================================
// بناء محتوى المنتجات
// ==========================================

function renderProductsSelection(
    container,
    selectedItemsByProduct = new Map(),
    editMode = false
) {

    if (!container) {
        return;
    }


    if (products.length === 0) {

        container.textContent =
            "لا توجد منتجات.";

        return;

    }


    container.innerHTML =
        "";


    products.forEach(
        product => {

            const productId =
                String(
                    product.id
                );


            const selectedItems =
                selectedItemsByProduct.get(
                    productId
                ) || [];


            const variants =
                getProductVariants(
                    product.id
                );


            if (
                variants.length > 0
            ) {

                const selectionMap =
                    editMode
                        ? getEditVariantSelectionMap(
                            product.id
                        )
                        : getCreateVariantSelectionMap(
                            product.id
                        );


                container.insertAdjacentHTML(
                    "beforeend",
                    createVariantProductMarkup(
                        product,
                        selectionMap,
                        editMode
                    )
                );


                return;

            }


            const selectedItem =
                selectedItems[0] ||
                null;


            container.insertAdjacentHTML(
                "beforeend",
                createSimpleProductMarkup(
                    product,
                    Boolean(
                        selectedItem
                    ),
                    selectedItem?.quantity ||
                        1
                )
            );

        }
    );


    bindSimpleProductSelectionEvents(
        container
    );

}


// ==========================================
// معاينة الصورة وتجهيزها
// ==========================================

async function prepareOfferImage(
    file
) {

    if (!file) {
        return null;
    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        throw new Error(
            "الملف المحدد ليس صورة."
        );

    }


    const image =
        await createImageBitmap(
            file
        );


    const canvasSize =
        1600;

    const maxContentSize =
        1560;


    let contentWidth =
        image.width;

    let contentHeight =
        image.height;


    if (
        contentWidth >
            maxContentSize ||
        contentHeight >
            maxContentSize
    ) {

        const scale =
            Math.min(
                maxContentSize /
                    contentWidth,
                maxContentSize /
                    contentHeight
            );


        contentWidth =
            Math.round(
                contentWidth *
                scale
            );


        contentHeight =
            Math.round(
                contentHeight *
                scale
            );

    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        canvasSize;

    canvas.height =
        canvasSize;


    const context =
        canvas.getContext(
            "2d"
        );


    if (!context) {

        image.close();

        throw new Error(
            "تعذر تجهيز الصورة."
        );

    }


    context.fillStyle =
        "#ffffff";


    context.fillRect(
        0,
        0,
        canvasSize,
        canvasSize
    );


    const x =
        (
            canvasSize -
            contentWidth
        ) / 2;


    const y =
        (
            canvasSize -
            contentHeight
        ) / 2;


    context.drawImage(
        image,
        x,
        y,
        contentWidth,
        contentHeight
    );


    image.close();


    const blob =
        await new Promise(
            (
                resolve,
                reject
            ) => {

                canvas.toBlob(
                    result => {

                        if (result) {

                            resolve(
                                result
                            );

                        } else {

                            reject(
                                new Error(
                                    "تعذر ضغط الصورة."
                                )
                            );

                        }

                    },
                    "image/webp",
                    0.82
                );

            }
        );


    return blob;

}


async function uploadOfferImage(
    file
) {

    if (!file) {
        return null;
    }


    const optimizedImage =
        await prepareOfferImage(
            file
        );


    if (!optimizedImage) {

        throw new Error(
            "تعذر تجهيز الصورة."
        );

    }


    const maxFileSize =
        3 * 1024 * 1024;


    if (
        optimizedImage.size >
        maxFileSize
    ) {

        throw new Error(
            "حجم الصورة بعد الضغط ما زال أكبر من 3 ميغابايت."
        );

    }


    const filePath =
        `${crypto.randomUUID()}.webp`;


    const {
        error: uploadError
    } =
        await supabaseClient
            .storage
            .from(
                "product-images"
            )
            .upload(
                filePath,
                optimizedImage,
                {
                    contentType:
                        "image/webp",

                    cacheControl:
                        "31536000",

                    upsert:
                        false
                }
            );


    if (uploadError) {
        throw uploadError;
    }


    const {
        data: publicUrlData
    } =
        supabaseClient
            .storage
            .from(
                "product-images"
            )
            .getPublicUrl(
                filePath
            );


    if (
        !publicUrlData?.publicUrl
    ) {

        await supabaseClient
            .storage
            .from(
                "product-images"
            )
            .remove([
                filePath
            ]);


        throw new Error(
            "تعذر الحصول على رابط الصورة."
        );

    }


    return {
        path:
            filePath,

        url:
            publicUrlData.publicUrl
    };

}


function getOfferImagePath(
    imageUrl
) {

    if (!imageUrl) {
        return null;
    }


    try {

        const url =
            new URL(
                imageUrl
            );


        const marker =
            "/storage/v1/object/public/product-images/";


        const index =
            url.pathname.indexOf(
                marker
            );


        if (index === -1) {
            return null;
        }


        return decodeURIComponent(
            url.pathname.slice(
                index +
                marker.length
            )
        );

    } catch {

        return null;

    }

}


// ==========================================
// الرسائل
// ==========================================

function showAdminOfferMessage(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "adminOfferToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "adminOfferToast";

        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.className =
        `admin-offer-toast ${type} show`;


    clearTimeout(
        adminOfferToastTimer
    );


    adminOfferToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2800
        );

}


// ==========================================
// رسالة نافذة التعديل
// ==========================================

function showEditMessage(
    message,
    type = ""
) {

    if (!offerEditMessage) {
        return;
    }


    offerEditMessage.textContent =
        message;


    offerEditMessage.className =
        `offer-edit-message ${type}`;

}


// ==========================================
// رسائل نافذة الـVariants
// ==========================================

function showVariantModalMessage(
    message,
    type = ""
) {

    if (!offerVariantModalMessage) {
        return;
    }


    offerVariantModalMessage.textContent =
        message;


    offerVariantModalMessage.className =
        `offer-variant-modal-message ${type}`;

}


// ==========================================
// معاينة صورة إنشاء العرض
// ==========================================

if (offerImageFile) {

    offerImageFile.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];


            if (!file) {

                if (offerImagePreview) {
                    offerImagePreview.hidden =
                        true;
                }

                if (offerImagePreviewImage) {
                    offerImagePreviewImage.src =
                        "";
                }

                if (offerImageStatus) {

                    offerImageStatus.textContent =
                        "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ العرض.";

                }

                return;

            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showAdminOfferMessage(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );


                this.value =
                    "";


                if (offerImagePreview) {
                    offerImagePreview.hidden =
                        true;
                }


                if (offerImagePreviewImage) {
                    offerImagePreviewImage.src =
                        "";
                }


                return;

            }


            try {

                if (offerImageStatus) {

                    offerImageStatus.textContent =
                        "جاري تجهيز معاينة الصورة...";

                }


                const optimizedImage =
                    await prepareOfferImage(
                        file
                    );


                if (!optimizedImage) {

                    throw new Error(
                        "تعذر تجهيز الصورة."
                    );

                }


                const previewUrl =
                    URL.createObjectURL(
                        optimizedImage
                    );


                if (
                    offerImagePreviewImage
                ) {

                    if (
                        offerImagePreviewImage
                            .dataset
                            .previewUrl
                    ) {

                        URL.revokeObjectURL(
                            offerImagePreviewImage
                                .dataset
                                .previewUrl
                        );

                    }


                    offerImagePreviewImage.src =
                        previewUrl;


                    offerImagePreviewImage
                        .dataset
                        .previewUrl =
                        previewUrl;

                }


                if (offerImagePreview) {
                    offerImagePreview.hidden =
                        false;
                }


                if (offerImageStatus) {

                    offerImageStatus.textContent =
                        `تم تجهيز الصورة: ${file.name}`;

                }

            } catch (error) {

                console.error(
                    "Offer image preview error:",
                    error
                );


                this.value =
                    "";


                if (offerImagePreview) {
                    offerImagePreview.hidden =
                        true;
                }


                if (
                    offerImagePreviewImage
                ) {

                    offerImagePreviewImage.src =
                        "";


                    if (
                        offerImagePreviewImage
                            .dataset
                            .previewUrl
                    ) {

                        URL.revokeObjectURL(
                            offerImagePreviewImage
                                .dataset
                                .previewUrl
                        );


                        delete offerImagePreviewImage
                            .dataset
                            .previewUrl;

                    }

                }


                if (offerImageStatus) {

                    offerImageStatus.textContent =
                        "تعذر تجهيز الصورة للمعاينة.";

                }


                showAdminOfferMessage(
                    error.message ||
                    "تعذر تجهيز الصورة.",
                    "error"
                );

            }

        }
    );

}


// ==========================================
// معاينة صورة التعديل
// ==========================================

if (editOfferImageFile) {

    editOfferImageFile.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];


            if (!file) {
                return;
            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showEditMessage(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );


                this.value =
                    "";


                return;

            }


            try {

                if (
                    editOfferImageStatus
                ) {

                    editOfferImageStatus.textContent =
                        "جاري تجهيز معاينة الصورة...";

                }


                const optimizedImage =
                    await prepareOfferImage(
                        file
                    );


                if (!optimizedImage) {

                    throw new Error(
                        "تعذر تجهيز الصورة."
                    );

                }


                const previewUrl =
                    URL.createObjectURL(
                        optimizedImage
                    );


                if (
                    editOfferImagePreviewImage
                ) {

                    if (
                        editOfferImagePreviewImage
                            .dataset
                            .previewUrl
                    ) {

                        URL.revokeObjectURL(
                            editOfferImagePreviewImage
                                .dataset
                                .previewUrl
                        );

                    }


                    editOfferImagePreviewImage.src =
                        previewUrl;


                    editOfferImagePreviewImage
                        .dataset
                        .previewUrl =
                        previewUrl;

                }


                if (editOfferImagePreview) {

                    editOfferImagePreview.hidden =
                        false;

                }


                if (
                    editOfferImageStatus
                ) {

                    editOfferImageStatus.textContent =
                        `تم تجهيز الصورة: ${file.name}`;

                }

            } catch (error) {

                console.error(
                    "Edit offer image preview error:",
                    error
                );


                this.value =
                    "";


                if (
                    editOfferImageStatus
                ) {

                    editOfferImageStatus.textContent =
                        "تعذر تجهيز الصورة للمعاينة.";

                }


                showEditMessage(
                    error.message ||
                    "تعذر تجهيز الصورة.",
                    "error"
                );

            }

        }
    );

}


// ==========================================
// تحميل Variants
// ==========================================

async function loadProductVariants(
    productIds
) {

    productVariantsMap.clear();

    variantMap.clear();


    if (
        !Array.isArray(productIds) ||
        productIds.length === 0
    ) {

        return;

    }


    const {
        data: variantRows,
        error: variantsError
    } =
        await supabaseClient
            .from(
                "product_variants"
            )
            .select(
                "id, product_id, sku, price, quantity, active"
            )
            .in(
                "product_id",
                productIds
            )
            .order(
                "id",
                {
                    ascending: true
                }
            );


    if (variantsError) {
        throw variantsError;
    }


    const variants =
        variantRows || [];


    if (variants.length === 0) {
        return;
    }


    const variantIds =
        variants.map(
            variant =>
                variant.id
        );


    const {
        data: variantOptionRows,
        error: variantOptionsError
    } =
        await supabaseClient
            .from(
                "product_variant_options"
            )
            .select(
                "variant_id, option_value_id"
            )
            .in(
                "variant_id",
                variantIds
            );


    if (variantOptionsError) {
        throw variantOptionsError;
    }


    const optionLinks =
        variantOptionRows || [];


    const optionValueIds =
        [
            ...new Set(
                optionLinks
                    .map(
                        row =>
                            row.option_value_id
                    )
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined
                    )
            )
        ];


    let optionValues =
        [];


    if (
        optionValueIds.length > 0
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "product_option_values"
                )
                .select(
                    "id, option_group_id, value, sort_order"
                )
                .in(
                    "id",
                    optionValueIds
                );


        if (error) {
            throw error;
        }


        optionValues =
            data || [];

    }


    const productsWithVariants =
        [
            ...new Set(
                variants.map(
                    variant =>
                        variant.product_id
                )
            )
        ];


    let optionGroups =
        [];


    if (
        productsWithVariants.length > 0
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "product_option_groups"
                )
                .select(
                    "id, product_id, name, sort_order"
                )
                .in(
                    "product_id",
                    productsWithVariants
                )
                .order(
                    "sort_order",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        optionGroups =
            data || [];

    }


    const optionValueMap =
        new Map();


    optionValues.forEach(
        value => {

            optionValueMap.set(
                String(
                    value.id
                ),
                value
            );

        }
    );


    const optionGroupMap =
        new Map();


    optionGroups.forEach(
        group => {

            optionGroupMap.set(
                String(
                    group.id
                ),
                group
            );

        }
    );


    const variantOptionsMap =
        new Map();


    optionLinks.forEach(
        row => {

            const key =
                String(
                    row.variant_id
                );


            if (
                !variantOptionsMap.has(
                    key
                )
            ) {

                variantOptionsMap.set(
                    key,
                    []
                );

            }


            variantOptionsMap
                .get(key)
                .push(
                    row
                );

        }
    );


    variants.forEach(
        variant => {

            const linkedOptions =
                variantOptionsMap.get(
                    String(
                        variant.id
                    )
                ) || [];


            const optionParts =
                linkedOptions
                    .map(
                        link => {

                            const optionValue =
                                optionValueMap.get(
                                    String(
                                        link.option_value_id
                                    )
                                );


                            if (!optionValue) {
                                return null;
                            }


                            const group =
                                optionGroupMap.get(
                                    String(
                                        optionValue
                                            .option_group_id
                                    )
                                );


                            return {

                                value:
                                    optionValue.value,

                                groupSort:
                                    Number(
                                        group?.sort_order
                                    ) || 0,

                                valueSort:
                                    Number(
                                        optionValue
                                            .sort_order
                                    ) || 0

                            };

                        }
                    )
                    .filter(Boolean)
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            if (
                                a.groupSort !==
                                b.groupSort
                            ) {

                                return (
                                    a.groupSort -
                                    b.groupSort
                                );

                            }


                            return (
                                a.valueSort -
                                b.valueSort
                            );

                        }
                    );


            let label =
                optionParts
                    .map(
                        part =>
                            part.value
                    )
                    .join(" / ");


            if (!label) {

                label =
                    variant.sku ||
                    `الخيار #${variant.id}`;

            }


            const normalizedVariant = {
                ...variant,
                label
            };


            variantMap.set(
                String(
                    variant.id
                ),
                normalizedVariant
            );


            const productKey =
                String(
                    variant.product_id
                );


            if (
                !productVariantsMap.has(
                    productKey
                )
            ) {

                productVariantsMap.set(
                    productKey,
                    []
                );

            }


            productVariantsMap
                .get(
                    productKey
                )
                .push(
                    normalizedVariant
                );

        }
    );

}


// ==========================================
// تحميل المنتجات
// ==========================================

async function loadProducts() {

    if (!productsList) {
        return;
    }


    productsList.textContent =
        "جاري تحميل المنتجات...";


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "products"
                )
                .select(
                    "id, name, product_code, price, quantity"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        products =
            data || [];


        await loadProductVariants(
            products.map(
                product =>
                    product.id
            )
        );


        renderCreateProducts();

    } catch (error) {

        console.error(
            "خطأ في تحميل المنتجات والخيارات:",
            error
        );


        productsList.textContent =
            "حدث خطأ أثناء تحميل المنتجات.";

    }

}


// ==========================================
// منتجات إنشاء العرض
// ==========================================

function renderCreateProducts() {

    if (!productsList) {
        return;
    }


    const emptySelectedMap =
        new Map();


    renderProductsSelection(
        productsList,
        emptySelectedMap,
        false
    );

}


// ==========================================
// تحميل العروض
// ==========================================

async function loadOffers() {

    if (!offersList) {
        return;
    }


    offersList.textContent =
        "جاري تحميل العروض...";


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "offers"
                )
                .select(`
                    id,
                    name,
                    description,
                    price,
                    quantity,
                    image,
                    active,
                    created_at,
                    offer_items (
                        product_id,
                        quantity,
                        variant_id,
                        products (
                            id,
                            name,
                            price,
                            quantity
                        )
                    )
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        offers =
            data || [];


        renderOffers();

    } catch (error) {

        console.error(
            "خطأ في تحميل العروض:",
            error
        );


        offersList.textContent =
            "حدث خطأ أثناء تحميل العروض.";

    }

}


// ==========================================
// عرض العروض
// ==========================================

function renderOffers() {

    if (!offersList) {
        return;
    }


    if (offers.length === 0) {

        offersList.innerHTML = `
            <div class="admin-placeholder">
                لا توجد عروض حاليًا.
            </div>
        `;

        return;

    }


    offersList.innerHTML =
        "";


    offers.forEach(
        offer => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "offer-admin-item";


            const productsText =
                (offer.offer_items || [])
                    .map(
                        item =>
                            `${getOfferItemDisplayName(
                                item
                            )} × ${Number(
                                item.quantity
                            ) || 0}`
                    )
                    .join("، ");


            const statusText =
                offer.active
                    ? "فعال"
                    : "غير فعال";


            const toggleText =
                offer.active
                    ? "تعطيل العرض"
                    : "تفعيل العرض";


            card.innerHTML = `

                ${
                    offer.image
                        ? `
                            <img
                                src="${escapeHtml(
                                    offer.image
                                )}"
                                alt="${escapeHtml(
                                    offer.name
                                )}"
                                class="offer-admin-image"
                            >
                          `
                        : ""
                }


                <h3>
                    ${escapeHtml(
                        offer.name
                    )}
                </h3>


                ${
                    offer.description
                        ? `
                            <p>
                                ${escapeHtml(
                                    offer.description
                                )}
                            </p>
                          `
                        : ""
                }


                <div class="offer-admin-products">

                    <strong>
                        محتويات العرض:
                    </strong>

                    <span>
                        ${
                            escapeHtml(
                                productsText ||
                                "لا توجد منتجات"
                            )
                        }
                    </span>

                </div>


                <div class="offer-admin-meta">

                    <strong>
                        $${Number(
                            offer.price
                        ).toFixed(2)}
                    </strong>


                    <span>
                        الكمية:
                        ${Number(
                            offer.quantity
                        ) || 0}
                    </span>


                    <span
                        class="${
                            offer.active
                                ? "offer-active"
                                : "offer-inactive"
                        }"
                    >
                        ${statusText}
                    </span>

                </div>


                <div
                    class="offer-admin-actions"
                >

                    <button
                        type="button"
                        class="offer-admin-action offer-details-action"
                        data-action="details"
                        data-id="${escapeHtml(
                            offer.id
                        )}"
                    >
                        التفاصيل
                    </button>


                    <button
                        type="button"
                        class="offer-admin-action offer-edit-action"
                        data-action="edit"
                        data-id="${escapeHtml(
                            offer.id
                        )}"
                    >
                        تعديل
                    </button>


                    <button
                        type="button"
                        class="offer-admin-action offer-toggle-action"
                        data-action="toggle"
                        data-id="${escapeHtml(
                            offer.id
                        )}"
                    >
                        ${toggleText}
                    </button>


                    <button
                        type="button"
                        class="offer-admin-action offer-delete-action"
                        data-action="delete"
                        data-id="${escapeHtml(
                            offer.id
                        )}"
                    >
                        حذف
                    </button>

                </div>

            `;


            offersList.appendChild(
                card
            );

        }
    );

}


// ==========================================
// تجهيز حالة تعديل العرض
// ==========================================

function initializeEditVariantSelections(
    offer
) {

    editVariantSelections.clear();


    (offer?.offer_items || [])
        .forEach(
            item => {

                const productId =
                    String(
                        item.product_id
                    );


                if (
                    !editVariantSelections.has(
                        productId
                    )
                ) {

                    editVariantSelections.set(
                        productId,
                        new Map()
                    );

                }


                const selectionMap =
                    editVariantSelections.get(
                        productId
                    );


                const variantKey =
                    item.variant_id === null ||
                    item.variant_id === undefined
                        ? "legacy-null"
                        : String(
                            item.variant_id
                        );


                selectionMap.set(
                    variantKey,
                    normalizeQuantity(
                        item.quantity
                    )
                );

            }
        );

}


// ==========================================
// فتح نافذة التعديل
// ==========================================

async function openOfferEditModal(
    offerId
) {

    const offer =
        offers.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    offerId
                )
        );


    if (!offer) {

        showAdminOfferMessage(
            "تعذر العثور على العرض.",
            "error"
        );

        return;

    }


    editOfferId.value =
        offer.id;


    editOfferName.value =
        offer.name || "";


    editOfferDescription.value =
        offer.description || "";


    editOfferPrice.value =
        offer.price ?? "";


    editOfferQuantity.value =
        offer.quantity ?? 0;


    const quantity =
        Number(
            editOfferQuantity.value
        );


    if (
        !Number.isInteger(
            quantity
        ) ||
        quantity < 0
    ) {

        showAdminOfferMessage(
            "بيانات كمية العرض الحالية غير صحيحة.",
            "error"
        );

        return;

    }


    if (editOfferImageFile) {

        editOfferImageFile.value =
            "";

    }


    if (
        editOfferImagePreviewImage
    ) {

        if (
            editOfferImagePreviewImage
                .dataset
                .previewUrl
        ) {

            URL.revokeObjectURL(
                editOfferImagePreviewImage
                    .dataset
                    .previewUrl
            );


            delete editOfferImagePreviewImage
                .dataset
                .previewUrl;

        }


        editOfferImagePreviewImage.src =
            offer.image || "";

    }


    if (editOfferImagePreview) {

        editOfferImagePreview.hidden =
            !offer.image;

    }


    if (editOfferImageStatus) {

        editOfferImageStatus.textContent =
            offer.image
                ? "الصورة الحالية للعرض. اختر صورة جديدة لاستبدالها."
                : "لا توجد صورة حالية. يمكنك اختيار صورة من جهازك.";

    }


    initializeEditVariantSelections(
        offer
    );


    renderEditProducts(
        offer
    );


    if (offerEditMessage) {

        offerEditMessage.textContent =
            "";

        offerEditMessage.className =
            "offer-edit-message";

    }


    offerEditModal.hidden =
        false;

}


// ==========================================
// منتجات نافذة التعديل
// ==========================================

function renderEditProducts(
    offer
) {

    if (!editOfferProductsList) {
        return;
    }


    const selectedMap =
        new Map();


    (offer.offer_items || [])
        .forEach(
            item => {

                const productId =
                    String(
                        item.product_id
                    );


                if (
                    getProductVariants(
                        productId
                    ).length > 0
                ) {

                    return;

                }


                if (
                    !selectedMap.has(
                        productId
                    )
                ) {

                    selectedMap.set(
                        productId,
                        []
                    );

                }


                selectedMap
                    .get(
                        productId
                    )
                    .push({

                        product_id:
                            Number(
                                item.product_id
                            ),

                        variant_id:
                            null,

                        quantity:
                            normalizeQuantity(
                                item.quantity
                            )

                    });

            }
        );


    if (products.length === 0) {

        editOfferProductsList.textContent =
            "لا توجد منتجات.";

        return;

    }


    renderProductsSelection(
        editOfferProductsList,
        selectedMap,
        true
    );

}


// ==========================================
// نافذة اختيار الـVariants
// ==========================================

function openVariantSelectionModal(
    productId,
    mode
) {

    const product =
        getProductById(
            productId
        );


    if (!product) {

        showAdminOfferMessage(
            "تعذر العثور على المنتج.",
            "error"
        );

        return;

    }


    const variants =
        getProductVariants(
            productId
        );


    const activeVariants =
        variants.filter(
            variant =>
                variant.active
        );


    const selectionMap =
        mode === "edit"
            ? getEditVariantSelectionMap(
                productId
            )
            : getCreateVariantSelectionMap(
                productId
            );


    currentVariantModalWorkingSelections =
        cloneSelectionMap(
            selectionMap
        );


    currentVariantModalProductId =
        String(
            productId
        );


    currentVariantModalMode =
        mode;


    if (offerVariantModalTitle) {

        offerVariantModalTitle.textContent =
            product.name || "اختر الخيارات";

    }


    if (offerVariantModalContent) {

        offerVariantModalContent.innerHTML =
            "";


        if (
            mode === "edit" &&
            currentVariantModalWorkingSelections.has(
                "legacy-null"
            )
        ) {

            offerVariantModalContent.insertAdjacentHTML(
                "beforeend",
                createLegacyBaseModalRow(
                    product,
                    true,
                    currentVariantModalWorkingSelections.get(
                        "legacy-null"
                    )
                )
            );

        }


        activeVariants.forEach(
            variant => {

                offerVariantModalContent.insertAdjacentHTML(
                    "beforeend",
                    createVariantModalRow(
                        product,
                        variant,
                        currentVariantModalWorkingSelections.has(
                            String(
                                variant.id
                            )
                        ),
                        currentVariantModalWorkingSelections.get(
                            String(
                                variant.id
                            )
                        ) || 1,
                        false
                    )
                );

            }
        );


        if (mode === "edit") {

            variants
                .filter(
                    variant =>
                        !variant.active &&
                        currentVariantModalWorkingSelections.has(
                            String(
                                variant.id
                            )
                        )
                )
                .forEach(
                    variant => {

                        offerVariantModalContent.insertAdjacentHTML(
                            "beforeend",
                            createVariantModalRow(
                                product,
                                variant,
                                true,
                                currentVariantModalWorkingSelections.get(
                                    String(
                                        variant.id
                                    )
                                ) || 1,
                                true
                            )
                        );

                    }
                );

        }


        if (
            offerVariantModalContent.children.length === 0
        ) {

            offerVariantModalContent.innerHTML = `
                <div class="offer-no-active-variants">
                    لا توجد خيارات فعالة متاحة حاليًا.
                </div>
            `;

        }

    }


    showVariantModalMessage(
        ""
    );


    if (offerVariantModal) {

        offerVariantModal.hidden =
            false;

    }


    bindVariantModalEvents();

}


// ==========================================
// ربط أحداث نافذة الـVariants
// ==========================================

function bindVariantModalEvents() {

    if (!offerVariantModalContent) {
        return;
    }


    offerVariantModalContent
        .querySelectorAll(
            ".offer-variant-modal-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () => {

                        const variantId =
                            checkbox.dataset.variantId;


                        const row =
                            checkbox.closest(
                                ".offer-variant-row"
                            );


                        const quantityInput =
                            row?.querySelector(
                                ".offer-variant-modal-quantity"
                            );


                        const isChecked =
                            checkbox.checked;


                        row?.classList.toggle(
                            "selected",
                            isChecked
                        );


                        if (quantityInput) {

                            quantityInput.disabled =
                                !isChecked;


                            if (isChecked) {

                                const max =
                                    Number(
                                        quantityInput.max
                                    ) || 1;


                                let quantity =
                                    Number(
                                        quantityInput.value
                                    );


                                if (
                                    !Number.isInteger(
                                        quantity
                                    ) ||
                                    quantity <= 0
                                ) {

                                    quantity = 1;

                                }


                                quantity =
                                    Math.min(
                                        quantity,
                                        max
                                    );


                                quantityInput.value =
                                    String(
                                        quantity
                                    );

                            }

                        }


                        if (
                            isChecked
                        ) {

                            currentVariantModalWorkingSelections.set(
                                String(
                                    variantId
                                ),
                                normalizeQuantity(
                                    quantityInput?.value
                                )
                            );

                        } else {

                            currentVariantModalWorkingSelections.delete(
                                String(
                                    variantId
                                )
                            );

                        }

                    }
                );

            }
        );


    offerVariantModalContent
        .querySelectorAll(
            ".offer-variant-modal-quantity"
        )
        .forEach(
            quantityInput => {

                quantityInput.addEventListener(
                    "input",
                    () => {

                        const variantId =
                            quantityInput.dataset.variantId;


                        const checkbox =
                            offerVariantModalContent
                                .querySelector(
                                    `.offer-variant-modal-checkbox[data-variant-id="${CSS.escape(
                                        variantId
                                    )}"]`
                                );


                        if (
                            !checkbox ||
                            !checkbox.checked
                        ) {

                            return;

                        }


                        const max =
                            Number(
                                quantityInput.max
                            ) || 1;


                        let quantity =
                            Number(
                                quantityInput.value
                            );


                        if (
                            Number.isFinite(
                                quantity
                            ) &&
                            quantity > max
                        ) {

                            quantity =
                                max;

                            quantityInput.value =
                                String(
                                    max
                                );

                        }


                        if (
                            Number.isInteger(
                                quantity
                            ) &&
                            quantity > 0
                        ) {

                            currentVariantModalWorkingSelections.set(
                                String(
                                    variantId
                                ),
                                quantity
                            );

                        }

                    }
                );

            }
        );

}


// ==========================================
// التحقق وحفظ اختيار الـVariants
// ==========================================

function saveCurrentVariantSelection() {

    if (
        currentVariantModalProductId ===
            null ||
        !currentVariantModalMode
    ) {

        return;

    }


    const product =
        getProductById(
            currentVariantModalProductId
        );


    if (!product) {

        showVariantModalMessage(
            "تعذر العثور على المنتج.",
            "error"
        );

        return;

    }


    const modalMode =
        currentVariantModalMode;

    const modalProductId =
        currentVariantModalProductId;


    const finalSelections =
        new Map();


    const checkedBoxes =
        offerVariantModalContent
            ? offerVariantModalContent
                .querySelectorAll(
                    ".offer-variant-modal-checkbox:checked"
                )
            : [];


    for (
        const checkbox
        of checkedBoxes
    ) {

        const variantId =
            String(
                checkbox.dataset.variantId
            );


        const row =
            checkbox.closest(
                ".offer-variant-row"
            );


        const quantityInput =
            row?.querySelector(
                ".offer-variant-modal-quantity"
            );


        const quantity =
            Number(
                quantityInput?.value
            );


        if (
            variantId ===
            "legacy-null"
        ) {

            const max =
                Math.max(
                    1,
                    Number(
                        product.quantity
                    ) || 1
                );


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity <= 0 ||
                quantity > max
            ) {

                showVariantModalMessage(
                    "أدخل كمية صحيحة للمنتج الأساسي.",
                    "error"
                );

                return;

            }


            finalSelections.set(
                "legacy-null",
                quantity
            );


            continue;

        }


        const variant =
            getVariantByProduct(
                product.id,
                variantId
            );


        if (!variant) {

            showVariantModalMessage(
                "تعذر التحقق من أحد الخيارات المحددة.",
                "error"
            );

            return;

        }


        /*
         * الـVariants غير الفعالة لا تظهر إلا إذا
         * كانت موجودة أصلًا في العرض القديم.
         *
         * لذلك يسمح وضع التعديل بإبقائها،
         * أو إلغاء تحديدها لإزالتها من العرض.
         */
        if (
            !variant.active &&
            modalMode !== "edit"
        ) {

            showVariantModalMessage(
                `الخيار "${getVariantLabel(
                    variantId
                )}" غير فعال حاليًا.`,
                "error"
            );

            return;

        }


        const maxQuantity =
            getVariantMaxQuantity(
                product,
                variantId
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0 ||
            quantity > maxQuantity
        ) {

            showVariantModalMessage(
                `أدخل كمية صحيحة للخيار "${getVariantLabel(
                    variantId
                )}". الحد الأقصى ${maxQuantity}.`,
                "error"
            );

            return;

        }


        finalSelections.set(
            variantId,
            quantity
        );

    }


    /*
     * حفظ الحالة في الـMap الأساسية فقط.
     * لا يوجد أي طلب إلى Supabase.
     */
    const targetMap =
        modalMode === "edit"
            ? getEditVariantSelectionMap(
                modalProductId
            )
            : getCreateVariantSelectionMap(
                modalProductId
            );


    targetMap.clear();


    finalSelections.forEach(
        (
            quantity,
            variantId
        ) => {

            targetMap.set(
                variantId,
                quantity
            );

        }
    );


    /*
     * نغلق النافذة بعد حفظ الحالة.
     * modalMode و modalProductId محفوظان
     * قبل الإغلاق حتى لا تضيع حالة الوضع.
     */
    closeVariantSelectionModal(
        true
    );


    if (
        modalMode ===
        "edit"
    ) {

        const currentOffer =
            offers.find(
                offer =>
                    String(
                        offer.id
                    ) ===
                    String(
                        editOfferId?.value
                    )
            );


        if (currentOffer) {

            renderEditProducts(
                currentOffer
            );

        }

    } else {

        renderCreateProducts();

    }

}


// ==========================================
// إغلاق نافذة الـVariants
// ==========================================

function closeVariantSelectionModal(
    saved = false
) {

    currentVariantModalWorkingSelections =
        new Map();


    currentVariantModalProductId =
        null;


    currentVariantModalMode =
        null;


    if (offerVariantModal) {

        offerVariantModal.hidden =
            true;

    }


    if (offerVariantModalContent) {

        offerVariantModalContent.innerHTML =
            "";

    }


    showVariantModalMessage(
        ""
    );

}


// ==========================================
// أحداث نافذة الـVariants
// ==========================================

if (saveOfferVariantSelection) {

    saveOfferVariantSelection.addEventListener(
        "click",
        saveCurrentVariantSelection
    );

}


if (cancelOfferVariantModal) {

    cancelOfferVariantModal.addEventListener(
        "click",
        () => {

            closeVariantSelectionModal(
                false
            );

        }
    );

}


if (closeOfferVariantModalButton) {

    closeOfferVariantModalButton.addEventListener(
        "click",
        () => {

            closeVariantSelectionModal(
                false
            );

        }
    );

}


if (offerVariantModal) {

    offerVariantModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                offerVariantModal
            ) {

                closeVariantSelectionModal(
                    false
                );

            }

        }
    );

}


// ==========================================
// زر اختيار Variants من قائمة المنتجات
// ==========================================

function handleProductListVariantButton(
    event
) {

    const button =
        event.target.closest(
            '[data-action="choose-variants"]'
        );


    if (!button) {
        return;
    }


    const productId =
        button.dataset.productId;


    const mode =
        button.dataset.mode;


    if (
        !productId ||
        (
            mode !== "create" &&
            mode !== "edit"
        )
    ) {

        return;

    }


    openVariantSelectionModal(
        productId,
        mode
    );

}


if (productsList) {

    productsList.addEventListener(
        "click",
        handleProductListVariantButton
    );

}


if (editOfferProductsList) {

    editOfferProductsList.addEventListener(
        "click",
        handleProductListVariantButton
    );

}


// ==========================================
// جمع عناصر إنشاء العرض
// ==========================================

function collectCreateOfferItems() {

    const selectedItems =
        [];


    if (!productsList) {
        return selectedItems;
    }


    /*
     * المنتجات العادية بدون Variants.
     */
    productsList
        .querySelectorAll(
            ".offer-product-checkbox:checked"
        )
        .forEach(
            checkbox => {

                const productId =
                    Number(
                        checkbox.value
                    );


                const product =
                    getProductById(
                        productId
                    );


                if (!product) {

                    throw new Error(
                        "تعذر العثور على أحد المنتجات المحددة."
                    );

                }


                const row =
                    checkbox.closest(
                        ".offer-product-item"
                    );


                const quantityInput =
                    row?.querySelector(
                        ".offer-simple-product-quantity"
                    );


                const quantity =
                    Number(
                        quantityInput?.value
                    );


                const maxQuantity =
                    Math.max(
                        1,
                        Number(
                            product.quantity
                        ) || 1
                    );


                if (
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity <= 0 ||
                    quantity > maxQuantity
                ) {

                    throw new Error(
                        `أدخل كمية صحيحة للمنتج "${product.name}".`
                    );

                }


                selectedItems.push({

                    product_id:
                        productId,

                    variant_id:
                        null,

                    quantity

                });

            }
        );


    /*
     * Variants:
     * نقرأ الحالة المحفوظة محليًا.
     */
    createVariantSelections.forEach(
        (
            selectionMap,
            productIdString
        ) => {

            if (
                !selectionMap ||
                selectionMap.size === 0
            ) {

                return;

            }


            const product =
                getProductById(
                    productIdString
                );


            if (!product) {

                throw new Error(
                    "تعذر العثور على أحد المنتجات ذات الخيارات."
                );

            }


            selectionMap.forEach(
                (
                    quantity,
                    variantIdString
                ) => {

                    if (
                        variantIdString ===
                        "legacy-null"
                    ) {

                        return;

                    }


                    const variant =
                        getVariantByProduct(
                            product.id,
                            variantIdString
                        );


                    if (!variant) {

                        throw new Error(
                            `الخيار المحدد للمنتج "${product.name}" غير صالح.`
                        );

                    }


                    if (!variant.active) {

                        throw new Error(
                            `الخيار "${getVariantLabel(
                                variantIdString
                            )}" غير فعال حاليًا.`
                        );

                    }


                    const maxQuantity =
                        getVariantMaxQuantity(
                            product,
                            variantIdString
                        );


                    const normalizedQuantity =
                        Number(
                            quantity
                        );


                    if (
                        !Number.isInteger(
                            normalizedQuantity
                        ) ||
                        normalizedQuantity <= 0 ||
                        normalizedQuantity >
                            maxQuantity
                    ) {

                        throw new Error(
                            `أدخل كمية صحيحة للخيار "${getVariantLabel(
                                variantIdString
                            )}".`
                        );

                    }


                    selectedItems.push({

                        product_id:
                            Number(
                                product.id
                            ),

                        variant_id:
                            Number(
                                variantIdString
                            ),

                        quantity:
                            normalizedQuantity

                    });

                }
            );

        }
    );


    return selectedItems;

}


// ==========================================
// جمع عناصر تعديل العرض
// ==========================================

function collectEditOfferItems() {

    const selectedItems =
        [];


    if (!editOfferProductsList) {
        return selectedItems;
    }


    /*
     * المنتجات بدون Variants.
     */
    editOfferProductsList
        .querySelectorAll(
            ".offer-product-checkbox:checked"
        )
        .forEach(
            checkbox => {

                const productId =
                    Number(
                        checkbox.value
                    );


                const product =
                    getProductById(
                        productId
                    );


                if (!product) {

                    throw new Error(
                        "تعذر العثور على أحد المنتجات المحددة."
                    );

                }


                const row =
                    checkbox.closest(
                        ".offer-product-item"
                    );


                const quantityInput =
                    row?.querySelector(
                        ".offer-simple-product-quantity"
                    );


                const quantity =
                    Number(
                        quantityInput?.value
                    );


                const maxQuantity =
                    Math.max(
                        1,
                        Number(
                            product.quantity
                        ) || 1
                    );


                if (
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity <= 0 ||
                    quantity > maxQuantity
                ) {

                    throw new Error(
                        `أدخل كمية صحيحة للمنتج "${product.name}".`
                    );

                }


                selectedItems.push({

                    product_id:
                        productId,

                    variant_id:
                        null,

                    quantity

                });

            }
        );


    /*
     * المنتجات ذات الـVariants.
     */
    editVariantSelections.forEach(
        (
            selectionMap,
            productIdString
        ) => {

            if (
                !selectionMap ||
                selectionMap.size === 0
            ) {

                return;

            }


            const product =
                getProductById(
                    productIdString
                );


            if (!product) {

                throw new Error(
                    "تعذر العثور على أحد المنتجات ذات الخيارات."
                );

            }


            selectionMap.forEach(
                (
                    quantity,
                    variantIdString
                ) => {

                    if (
                        variantIdString ===
                        "legacy-null"
                    ) {

                        const maxQuantity =
                            Math.max(
                                1,
                                Number(
                                    product.quantity
                                ) || 1
                            );


                        const normalizedQuantity =
                            Number(
                                quantity
                            );


                        if (
                            !Number.isInteger(
                                normalizedQuantity
                            ) ||
                            normalizedQuantity <= 0 ||
                            normalizedQuantity >
                                maxQuantity
                        ) {

                            throw new Error(
                                `أدخل كمية صحيحة للمنتج "${product.name}".`
                            );

                        }


                        selectedItems.push({

                            product_id:
                                Number(
                                    product.id
                                ),

                            variant_id:
                                null,

                            quantity:
                                normalizedQuantity

                        });


                        return;

                    }


                    const variant =
                        getVariantByProduct(
                            product.id,
                            variantIdString
                        );


                    if (!variant) {

                        throw new Error(
                            `الخيار المحدد للمنتج "${product.name}" غير صالح.`
                        );

                    }


                    const maxQuantity =
                        getVariantMaxQuantity(
                            product,
                            variantIdString
                        );


                    const normalizedQuantity =
                        Number(
                            quantity
                        );


                    if (
                        !Number.isInteger(
                            normalizedQuantity
                        ) ||
                        normalizedQuantity <= 0 ||
                        normalizedQuantity >
                            maxQuantity
                    ) {

                        throw new Error(
                            `أدخل كمية صحيحة للخيار "${getVariantLabel(
                                variantIdString
                            )}".`
                        );

                    }


                    selectedItems.push({

                        product_id:
                            Number(
                                product.id
                            ),

                        variant_id:
                            Number(
                                variantIdString
                            ),

                        quantity:
                            normalizedQuantity

                    });

                }
            );

        }
    );


    return selectedItems;

}


// ==========================================
// إغلاق نافذة التعديل
// ==========================================

function closeOfferEditModal() {

    if (!offerEditModal) {
        return;
    }


    offerEditModal.hidden =
        true;


    editVariantSelections.clear();


    if (offerVariantModal) {

        offerVariantModal.hidden =
            true;

    }


    currentVariantModalProductId =
        null;

    currentVariantModalMode =
        null;

    currentVariantModalWorkingSelections =
        new Map();

}


// ==========================================
// حفظ تعديل العرض
// ==========================================

if (offerEditForm) {

    offerEditForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const offerId =
                editOfferId.value;


            const name =
                editOfferName.value.trim();


            const description =
                editOfferDescription.value.trim();


            const price =
                Number(
                    editOfferPrice.value
                );


            const quantity =
                Number(
                    editOfferQuantity.value
                );


            if (!name) {

                showEditMessage(
                    "أدخل اسم العرض.",
                    "error"
                );

                return;

            }


            if (
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                showEditMessage(
                    "أدخل سعرًا صحيحًا.",
                    "error"
                );

                return;

            }


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity < 0
            ) {

                showEditMessage(
                    "يرجى إدخال كمية صحيحة للعرض.",
                    "error"
                );

                return;

            }


            const currentOffer =
                offers.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            offerId
                        )
                );


            if (!currentOffer) {

                showEditMessage(
                    "تعذر العثور على العرض الحالي.",
                    "error"
                );

                return;

            }


            let selectedItems;


            try {

                selectedItems =
                    collectEditOfferItems();

            } catch (error) {

                showEditMessage(
                    error.message ||
                    "يوجد خيار غير صالح.",
                    "error"
                );

                return;

            }


            if (
                selectedItems.length === 0
            ) {

                showEditMessage(
                    "اختر منتجًا أو خيارًا واحدًا على الأقل.",
                    "error"
                );

                return;

            }


            const selectedImageFile =
                editOfferImageFile
                    ?.files?.[0] ||
                null;


            let uploadedOfferImage =
                null;


            const currentImage =
                currentOffer.image ||
                "";


            try {

                showEditMessage(
                    "جاري حفظ التعديلات..."
                );


                if (selectedImageFile) {

                    uploadedOfferImage =
                        await uploadOfferImage(
                            selectedImageFile
                        );

                }


                const finalImage =
                    uploadedOfferImage?.url ||
                    currentImage;


                const {
                    data,
                    error
                } =
                    await supabaseClient.rpc(
                        "admin_update_offer",
                        {
                            p_offer_id:
                                Number(
                                    offerId
                                ),

                            p_name:
                                name,

                            p_description:
                                description,

                            p_price:
                                price,

                            p_quantity:
                                quantity,

                            p_image:
                                finalImage,

                            p_items:
                                selectedItems
                        }
                    );


                if (error) {
                    throw error;
                }


                if (data !== true) {

                    throw new Error(
                        "لم يتم تعديل العرض."
                    );

                }


                const oldImagePath =
                    getOfferImagePath(
                        currentOffer.image
                    );


                if (
                    oldImagePath &&
                    uploadedOfferImage?.path
                ) {

                    const {
                        error:
                            oldOfferImageDeleteError
                    } =
                        await supabaseClient
                            .storage
                            .from(
                                "product-images"
                            )
                            .remove([
                                oldImagePath
                            ]);


                    if (
                        oldOfferImageDeleteError
                    ) {

                        console.error(
                            "Old offer image delete error:",
                            oldOfferImageDeleteError
                        );

                    }

                }


                editVariantSelections.clear();


                closeOfferEditModal();


                showAdminOfferMessage(
                    "تم تعديل العرض بنجاح."
                );


                await loadOffers();

            } catch (error) {

                if (
                    uploadedOfferImage?.path
                ) {

                    await supabaseClient
                        .storage
                        .from(
                            "product-images"
                        )
                        .remove([
                            uploadedOfferImage.path
                        ]);

                }


                console.error(
                    "خطأ في تعديل العرض:",
                    error
                );


                showEditMessage(
                    error.message ||
                    "حدث خطأ أثناء حفظ التعديلات.",
                    "error"
                );

            }

        }
    );

}


// ==========================================
// تفاصيل العرض
// ==========================================

function showOfferDetails(
    offerId
) {

    const offer =
        offers.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    offerId
                )
        );


    if (!offer) {

        showAdminOfferMessage(
            "تعذر العثور على العرض.",
            "error"
        );

        return;

    }


    const productsText =
        (offer.offer_items || [])
            .map(
                item =>
                    `${getOfferItemDisplayName(
                        item
                    )} × ${Number(
                        item.quantity
                    ) || 0}`
            )
            .join("\n");


    const message =
        `العرض: ${offer.name}\n\n` +

        `السعر: $${Number(
            offer.price
        ).toFixed(2)}\n\n` +

        `الكمية المتاحة: ${
            Number(
                offer.quantity
            ) || 0
        }\n\n` +

        `الوصف:\n${
            offer.description ||
            "لا يوجد وصف"
        }\n\n` +

        `المنتجات:\n${
            productsText ||
            "لا توجد منتجات"
        }`;


    showAdminOfferMessage(
        message.replace(
            /\n/g,
            " • "
        )
    );

}


// ==========================================
// تفعيل / تعطيل العرض
// ==========================================

async function toggleOffer(
    offerId
) {

    const offer =
        offers.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    offerId
                )
        );


    if (!offer) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "admin_toggle_offer",
                {
                    p_offer_id:
                        Number(
                            offerId
                        ),

                    p_active:
                        !offer.active
                }
            );


        if (error) {
            throw error;
        }


        if (data !== true) {

            throw new Error(
                "لم يتم تغيير حالة العرض."
            );

        }


        showAdminOfferMessage(
            offer.active
                ? "تم تعطيل العرض."
                : "تم تفعيل العرض."
        );


        await loadOffers();

    } catch (error) {

        console.error(
            "خطأ في تغيير حالة العرض:",
            error
        );


        showAdminOfferMessage(
            "تعذر تغيير حالة العرض.",
            "error"
        );

    }

}


// ==========================================
// حذف العرض
// ==========================================

async function deleteOffer(
    offerId
) {

    const offer =
        offers.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    offerId
                )
        );


    if (!offer) {
        return;
    }


    const confirmed =
        confirm(
            `هل أنت متأكد من حذف العرض "${offer.name}"؟`
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "admin_delete_offer",
                {
                    p_offer_id:
                        Number(
                            offerId
                        )
                }
            );


        if (error) {
            throw error;
        }


        if (data !== true) {

            throw new Error(
                "لم يتم حذف العرض."
            );

        }


        const oldImagePath =
            getOfferImagePath(
                offer.image
            );


        if (oldImagePath) {

            const {
                error:
                    imageDeleteError
            } =
                await supabaseClient
                    .storage
                    .from(
                        "product-images"
                    )
                    .remove([
                        oldImagePath
                    ]);


            if (
                imageDeleteError
            ) {

                console.error(
                    "Offer image delete error:",
                    imageDeleteError
                );

            }

        }


        showAdminOfferMessage(
            "تم حذف العرض."
        );


        await loadOffers();

    } catch (error) {

        console.error(
            "خطأ في حذف العرض:",
            error
        );


        showAdminOfferMessage(
            error.message ||
            "تعذر حذف العرض.",
            "error"
        );

    }

}


// ==========================================
// أزرار العروض
// ==========================================

if (offersList) {

    offersList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;


            const id =
                button.dataset.id;


            if (
                action ===
                "choose-variants"
            ) {

                return;

            }


            if (!id) {
                return;
            }


            if (
                action ===
                "details"
            ) {

                showOfferDetails(
                    id
                );

            }


            if (
                action ===
                "edit"
            ) {

                openOfferEditModal(
                    id
                );

            }


            if (
                action ===
                "toggle"
            ) {

                toggleOffer(
                    id
                );

            }


            if (
                action ===
                "delete"
            ) {

                deleteOffer(
                    id
                );

            }

        }
    );

}


// ==========================================
// أزرار نافذة التعديل
// ==========================================

if (
    closeOfferEditModalButton
) {

    closeOfferEditModalButton.addEventListener(
        "click",
        closeOfferEditModal
    );

}


if (cancelOfferEdit) {

    cancelOfferEdit.addEventListener(
        "click",
        closeOfferEditModal
    );

}


if (offerEditModal) {

    offerEditModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                offerEditModal
            ) {

                closeOfferEditModal();

            }

        }
    );

}


// ==========================================
// إنشاء عرض جديد
// ==========================================

if (offerForm) {

    offerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const name =
                document
                    .getElementById(
                        "offerName"
                    )
                    .value
                    .trim();


            const description =
                document
                    .getElementById(
                        "offerDescription"
                    )
                    .value
                    .trim();


            const price =
                Number(
                    document
                        .getElementById(
                            "offerPrice"
                        )
                        .value
                );


            const quantity =
                Number(
                    offerQuantity.value
                );


            if (!name) {

                showAdminOfferMessage(
                    "أدخل اسم العرض.",
                    "error"
                );

                return;

            }


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity < 0
            ) {

                showAdminOfferMessage(
                    "يرجى إدخال كمية صحيحة للعرض.",
                    "error"
                );

                return;

            }


            if (
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                showAdminOfferMessage(
                    "أدخل سعرًا صحيحًا للعرض.",
                    "error"
                );

                return;

            }


            let selectedProducts;


            try {

                selectedProducts =
                    collectCreateOfferItems();

            } catch (error) {

                showAdminOfferMessage(
                    error.message ||
                    "يوجد عنصر غير صالح في العرض.",
                    "error"
                );

                return;

            }


            if (
                selectedProducts.length === 0
            ) {

                showAdminOfferMessage(
                    "اختر منتجًا أو خيارًا واحدًا على الأقل.",
                    "error"
                );

                return;

            }


            const selectedImageFile =
                offerImageFile
                    ?.files?.[0] ||
                null;


            let uploadedOfferImage =
                null;


            try {

                if (selectedImageFile) {

                    uploadedOfferImage =
                        await uploadOfferImage(
                            selectedImageFile
                        );

                }


                const {
                    data: offer,
                    error: offerError
                } =
                    await supabaseClient
                        .from(
                            "offers"
                        )
                        .insert({
                            name,
                            description,
                            price,
                            quantity,
                            image:
                                uploadedOfferImage?.url ||
                                null
                        })
                        .select()
                        .single();


                if (offerError) {
                    throw offerError;
                }


                const offerItems =
                    selectedProducts.map(
                        item => ({

                            offer_id:
                                offer.id,

                            product_id:
                                item.product_id,

                            variant_id:
                                item.variant_id,

                            quantity:
                                item.quantity

                        })
                    );


                const {
                    error:
                        itemsError
                } =
                    await supabaseClient
                        .from(
                            "offer_items"
                        )
                        .insert(
                            offerItems
                        );


                if (itemsError) {

                    await supabaseClient
                        .from(
                            "offers"
                        )
                        .delete()
                        .eq(
                            "id",
                            offer.id
                        );


                    throw itemsError;

                }


                showAdminOfferMessage(
                    "تم إنشاء العرض بنجاح."
                );


                offerForm.reset();


                createVariantSelections.clear();


                if (offerImagePreview) {

                    offerImagePreview.hidden =
                        true;

                }


                if (
                    offerImagePreviewImage
                ) {

                    if (
                        offerImagePreviewImage
                            .dataset
                            .previewUrl
                    ) {

                        URL.revokeObjectURL(
                            offerImagePreviewImage
                                .dataset
                                .previewUrl
                        );


                        delete offerImagePreviewImage
                            .dataset
                            .previewUrl;

                    }


                    offerImagePreviewImage.src =
                        "";

                }


                if (offerImageStatus) {

                    offerImageStatus.textContent =
                        "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ العرض.";

                }


                renderCreateProducts();


                await loadOffers();

            } catch (error) {

                if (
                    uploadedOfferImage?.path
                ) {

                    await supabaseClient
                        .storage
                        .from(
                            "product-images"
                        )
                        .remove([
                            uploadedOfferImage.path
                        ]);

                }


                console.error(
                    "خطأ في إنشاء العرض:",
                    error
                );


                showAdminOfferMessage(
                    error.message ||
                    "حدث خطأ أثناء إنشاء العرض.",
                    "error"
                );

            }

        }
    );

}


// ==========================================
// Escape لإغلاق النوافذ
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        if (
            offerVariantModal &&
            !offerVariantModal.hidden
        ) {

            closeVariantSelectionModal(
                false
            );

            return;

        }


        if (
            offerEditModal &&
            !offerEditModal.hidden
        ) {

            closeOfferEditModal();

        }

    }
);


// ==========================================
// بدء الصفحة
// ==========================================

(async function initAdminOffers() {

    /*
     * تحميل المنتجات والـvariants مرة واحدة.
     *
     * بعد ذلك الاختيار داخل نافذة الـVariants
     * يتم محليًا دون طلبات Supabase.
     */
    await loadProducts();

    await loadOffers();

})();