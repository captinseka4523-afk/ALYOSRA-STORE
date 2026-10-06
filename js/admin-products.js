// ==========================================
// AL YOSRA STORE - Admin Products
// Production-Grade / Safe Integrated Version
// ==========================================

// ==========================================
// Global State
// ==========================================

let adminProducts = [];
let adminCategories = [];
let adminProductCosts = {};

let currentPage = 1;
const ITEMS_PER_PAGE = 50;

let totalProductsCount = 0;
let currentSearchTerm = "";
let searchTimeout = null;

// يمنع تداخل عمليات حفظ/حذف المنتج.
let isProductSaving = false;
let isProductDeleting = false;

// Token لمنع نتائج تحميل المنتجات القديمة
// من الكتابة فوق نتيجة أحدث.
let adminProductsLoadToken = 0;

// Token خاص بتحميل الصور.
let productImageLoadToken = 0;

// Token خاص بتحميل Variants.
let productVariantsLoadToken = 0;

let adminProductToastTimer;

const ADMIN_PRODUCT_COLUMNS =
    "id, name, description, price, quantity, main_image, target, product_code, category_id";

// ==========================================
// Product Variants State
// ==========================================

/*
 * clientKey:
 * معرف مؤقت للواجهة.
 *
 * السجلات الموجودة تستخدم ID قاعدة البيانات
 * للحفاظ على هويتها.
 *
 * السجلات الجديدة تستخدم crypto.randomUUID().
 */
let productVariantsState = {
    enabled: false,
    groups: [],
    variants: []
};

let productVariantsLoaded = true;
let productVariantsDirty = false;

// ==========================================
// Toast Notifications
// ==========================================

function showAdminProductToast(
    message,
    type = "success"
) {
    let toast =
        document.getElementById(
            "adminProductToast"
        );

    if (!toast) {
        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "adminProductToast";

        document.body.appendChild(
            toast
        );
    }

    clearTimeout(
        adminProductToastTimer
    );

    toast.textContent =
        String(
            message ?? ""
        );

    toast.className =
        `admin-product-toast ${type} show`;

    adminProductToastTimer =
        setTimeout(() => {
            toast.classList.remove(
                "show"
            );
        }, 3500);
}

// ==========================================
// Security & Validation Helpers
// ==========================================

function isSafeImageUrl(url) {
    if (!url) return false;

    try {
        const parsed =
            new URL(
                String(url),
                window.location.href
            );

        return (
            parsed.protocol ===
                "https:" ||
            parsed.protocol ===
                "http:"
        );
    } catch {
        return false;
    }
}

function revokeObjectUrl(url) {
    if (!url) return;

    try {
        URL.revokeObjectURL(url);
    } catch (error) {
        console.warn(
            "Revoke failed:",
            error
        );
    }
}

/*
 * حماية قيمة البحث قبل إدخالها داخل
 * صيغة PostgREST الخاصة بـ .or()
 */
function escapePostgrestSearchValue(
    value
) {
    return String(value ?? "")
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /,/g,
            "\\,"
        )
        .replace(
            /\(/g,
            "\\("
        )
        .replace(
            /\)/g,
            "\\)"
        )
        .replace(
            /%/g,
            "\\%"
        )
        .replace(
            /_/g,
            "\\_"
        );
}

// ==========================================
// Variant Helpers
// ==========================================

function createClientKey(prefix) {
    return `${prefix}:new:${crypto.randomUUID()}`;
}

function getExistingClientKey(
    prefix,
    id
) {
    return `${prefix}:${id}`;
}

function resetProductVariantsState() {
    productVariantsLoadToken++;

    productVariantsState = {
        enabled: false,
        groups: [],
        variants: []
    };

    productVariantsLoaded = true;
    productVariantsDirty = false;

    renderProductVariantsUI();
    updateProductVariantsSaveAvailability();
}

function markProductVariantsDirty() {
    productVariantsDirty = true;
}

function setProductVariantsStatus(
    message = "",
    type = ""
) {
    const element =
        document.getElementById(
            "productVariantsStatus"
        );

    if (!element) return;

    element.textContent =
        String(
            message ?? ""
        );

    element.className =
        type
            ? `admin-form-message ${type}`
            : "admin-form-message";
}

function updateProductVariantsSaveAvailability() {
    const saveButton =
        document.getElementById(
            "saveProductButton"
        );

    if (!saveButton) return;

    /*
     * أثناء تحميل Variants أو بعد فشل تحميلها
     * لا نسمح بالحفظ حتى لا يحدث حفظ للمنتج
     * مع احتمال فقدان حالة الـVariants.
     */
    if (!productVariantsLoaded) {
        saveButton.disabled = true;
        return;
    }

    /*
     * لا نغيّر حالة الزر هنا إذا كان الحفظ
     * قيد التنفيذ؛ saveProduct() يدير ذلك.
     */
    if (!isProductSaving) {
        saveButton.disabled = false;
    }
}

function showProductVariantsEditor(
    visible
) {
    const editor =
        document.getElementById(
            "productVariantsEditor"
        );

    if (editor) {
        editor.hidden = !visible;
    }
}

function updateProductVariantsToggleUI() {
    const toggle =
        document.getElementById(
            "productVariantsEnabled"
        );

    if (toggle) {
        toggle.checked =
            Boolean(
                productVariantsState.enabled
            );
    }

    showProductVariantsEditor(
        Boolean(
            productVariantsState.enabled
        )
    );
}

function normalizeVariantNumber(
    value,
    fallback = null
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function getVariantCombinationKey(
    optionValueKeys
) {
    return [...optionValueKeys]
        .map(key =>
            String(key)
        )
        .sort()
        .join("|");
}

function getVariantCombinationFromIds(
    optionValueIds
) {
    if (!Array.isArray(optionValueIds)) {
        return [];
    }

    const valueKeyById =
        new Map();

    productVariantsState.groups.forEach(
        group => {
            group.values.forEach(
                value => {
                    if (
                        value.id !== null &&
                        value.id !== undefined
                    ) {
                        valueKeyById.set(
                            String(
                                value.id
                            ),
                            value.clientKey
                        );
                    }
                }
            );
        }
    );

    return optionValueIds
        .map(id =>
            valueKeyById.get(
                String(id)
            )
        )
        .filter(Boolean);
}

// ==========================================
// Load Product Variants
// ==========================================

async function loadProductVariants(
    productId
) {
    const token =
        ++productVariantsLoadToken;

    productVariantsLoaded = false;
    productVariantsDirty = false;

    setProductVariantsStatus(
        "جاري تحميل خيارات المنتج..."
    );

    updateProductVariantsSaveAvailability();

    try {
        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "admin_get_product_variants",
                {
                    p_product_id:
                        Number(
                            productId
                        )
                }
            );

        if (error) {
            throw error;
        }

        /*
         * تم فتح/إغلاق/تغيير منتج آخر
         * أثناء انتظار RPC.
         */
        if (
            token !==
            productVariantsLoadToken
        ) {
            return;
        }

        const result =
            data &&
            typeof data === "object"
                ? data
                : {};

        const rawGroups =
            Array.isArray(
                result.groups
            )
                ? result.groups
                : [];

        const rawVariants =
            Array.isArray(
                result.variants
            )
                ? result.variants
                : [];

        const groups =
            rawGroups.map(
                group => ({
                    id:
                        group.id ??
                        null,

                    clientKey:
                        getExistingClientKey(
                            "g",
                            group.id
                        ),

                    name:
                        String(
                            group.name ??
                                ""
                        ),

                    sortOrder:
                        Number.isInteger(
                            Number(
                                group.sort_order
                            )
                        )
                            ? Number(
                                  group.sort_order
                              )
                            : 0,

                    values:
                        Array.isArray(
                            group.values
                        )
                            ? group.values.map(
                                  value => ({
                                      id:
                                          value.id ??
                                          null,

                                      clientKey:
                                          getExistingClientKey(
                                              "v",
                                              value.id
                                          ),

                                      value:
                                          String(
                                              value.value ??
                                                  ""
                                          ),

                                      sortOrder:
                                          Number.isInteger(
                                              Number(
                                                  value.sort_order
                                              )
                                          )
                                              ? Number(
                                                    value.sort_order
                                                )
                                              : 0
                                  })
                              )
                            : []
                })
            );

        productVariantsState.groups =
            groups;

        productVariantsState.variants =
            rawVariants.map(
                variant => ({
                    id:
                        variant.id ??
                        null,

                    clientKey:
                        getExistingClientKey(
                            "var",
                            variant.id
                        ),

                    sku:
                        String(
                            variant.sku ??
                                ""
                        ),

                    price:
                        normalizeVariantNumber(
                            variant.price,
                            null
                        ),

                    quantity:
                        Number.isInteger(
                            Number(
                                variant.quantity
                            )
                        )
                            ? Number(
                                  variant.quantity
                              )
                            : 0,

                    purchaseCost:
                        normalizeVariantNumber(
                            variant.purchase_cost,
                            null
                        ),

                    active:
                        variant.active !==
                        false,

                    optionValueKeys:
                        getVariantCombinationFromIds(
                            variant.option_value_ids
                        )
                })
            );

        productVariantsState.enabled =
            groups.length > 0;

        productVariantsLoaded =
            true;

        productVariantsDirty =
            false;

        updateProductVariantsToggleUI();
        renderProductVariantsUI();

        if (groups.length > 0) {
            setProductVariantsStatus(
                rawVariants.length > 0
                    ? `تم تحميل ${rawVariants.length} تركيبة.`
                    : "تم تحميل مجموعات الخيارات، ولا توجد تركيبات مكتملة بعد.",
                rawVariants.length > 0
                    ? "success"
                    : ""
            );
        } else {
            setProductVariantsStatus(
                ""
            );
        }

        updateProductVariantsSaveAvailability();
    } catch (error) {
        console.error(
            "Load product variants error:",
            error
        );

        if (
            token !==
            productVariantsLoadToken
        ) {
            return;
        }

        productVariantsLoaded =
            false;

        productVariantsDirty =
            false;

        productVariantsState = {
            enabled: false,
            groups: [],
            variants: []
        };

        updateProductVariantsToggleUI();

        setProductVariantsStatus(
            "تعذر تحميل خيارات المنتج. لن يتم السماح بحفظ المنتج حتى ينجح التحميل.",
            "error"
        );

        updateProductVariantsSaveAvailability();

        throw error;
    }
}

// ==========================================
// Variant Combination Generation
// ==========================================

function generateProductVariantCombinations() {
    if (
        !productVariantsState.enabled
    ) {
        productVariantsState.variants =
            [];

        renderProductVariantsTable();

        return;
    }

    const groups =
        productVariantsState.groups;

    if (groups.length === 0) {
        productVariantsState.variants =
            [];

        renderProductVariantsTable();

        setProductVariantsStatus(
            "أضف مجموعة خيارات واحدة على الأقل.",
            "error"
        );

        return;
    }

    const groupsWithValues =
        groups.map(
            group => ({
                ...group,

                values:
                    Array.isArray(
                        group.values
                    )
                        ? group.values.filter(
                              value =>
                                  String(
                                      value.value ??
                                          ""
                                  ).trim()
                          )
                        : []
            })
        );

    const emptyGroup =
        groupsWithValues.find(
            group =>
                group.values.length ===
                0
        );

    if (emptyGroup) {
        productVariantsState.variants =
            [];

        renderProductVariantsTable();

        setProductVariantsStatus(
            `مجموعة "${emptyGroup.name || "بدون اسم"}" لا تحتوي على أي قيمة.`,
            "error"
        );

        return;
    }

    /*
     * حفظ حالة Variants الحالية حسب
     * تركيبتها حتى لا نخسر:
     * SKU / السعر / الكمية / التكلفة / active
     */
    const existingByCombination =
        new Map();

    productVariantsState.variants.forEach(
        variant => {
            const key =
                getVariantCombinationKey(
                    variant.optionValueKeys
                );

            if (key) {
                existingByCombination.set(
                    key,
                    variant
                );
            }
        }
    );

    /*
     * Cartesian Product
     */
    let combinations = [
        []
    ];

    groupsWithValues.forEach(
        group => {
            const next = [];

            combinations.forEach(
                combination => {
                    group.values.forEach(
                        value => {
                            next.push([
                                ...combination,
                                value.clientKey
                            ]);
                        }
                    );
                }
            );

            combinations =
                next;
        }
    );

    const basePurchaseCost =
        Number(
            document.getElementById(
                "productPurchaseCost"
            )?.value
        );

    const safeBaseCost =
        Number.isFinite(
            basePurchaseCost
        ) &&
        basePurchaseCost > 0
            ? basePurchaseCost
            : null;

    productVariantsState.variants =
        combinations.map(
            optionValueKeys => {
                const combinationKey =
                    getVariantCombinationKey(
                        optionValueKeys
                    );

                const existing =
                    existingByCombination.get(
                        combinationKey
                    );

                if (existing) {
                    return {
                        ...existing,

                        optionValueKeys:
                            [
                                ...optionValueKeys
                            ]
                    };
                }

                return {
                    id: null,

                    clientKey:
                        createClientKey(
                            "var"
                        ),

                    sku:
                        `VAR-${crypto.randomUUID()
                            .replaceAll(
                                "-",
                                ""
                            )
                            .slice(
                                0,
                                12
                            )
                            .toUpperCase()}`,

                    price: null,

                    quantity: 0,

                    purchaseCost:
                        safeBaseCost,

                    active: true,

                    optionValueKeys:
                        [
                            ...optionValueKeys
                        ]
                };
            }
        );

    renderProductVariantsTable();

    setProductVariantsStatus(
        `تم إنشاء ${productVariantsState.variants.length} تركيبة.`,
        "success"
    );
}

// ==========================================
// Variant UI Rendering
// ==========================================

function renderProductVariantsUI() {
    updateProductVariantsToggleUI();
    renderProductOptionGroups();
    renderProductVariantsTable();
}

function renderProductOptionGroups() {
    const container =
        document.getElementById(
            "productOptionGroups"
        );

    const empty =
        document.getElementById(
            "productOptionGroupsEmpty"
        );

    if (!container) return;

    container.innerHTML =
        "";

    if (
        productVariantsState.groups
            .length === 0
    ) {
        if (empty) {
            empty.hidden =
                false;
        }

        return;
    }

    if (empty) {
        empty.hidden =
            true;
    }

    const fragment =
        document.createDocumentFragment();

    productVariantsState.groups.forEach(
        (
            group
        ) => {
            const groupElement =
                document.createElement(
                    "div"
                );

            groupElement.className =
                "admin-product-option-group";

            groupElement.dataset.groupKey =
                group.clientKey;

            const header =
                document.createElement(
                    "div"
                );

            header.className =
                "admin-product-option-group-header";

            const field =
                document.createElement(
                    "label"
                );

            field.className =
                "admin-product-option-group-field";

            const label =
                document.createElement(
                    "span"
                );

            label.textContent =
                "اسم المجموعة";

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "text";

            input.className =
                "admin-form-input";

            input.placeholder =
                "مثال: اللون";

            input.value =
                group.name;

            input.dataset.groupName =
                group.clientKey;

            input.addEventListener(
                "change",
                () => {
                    group.name =
                        input.value.trim();

                    markProductVariantsDirty();

                    renderProductVariantsTable();
                }
            );

            field.append(
                label,
                input
            );

            header.appendChild(
                field
            );

            const removeGroupButton =
                document.createElement(
                    "button"
                );

            removeGroupButton.type =
                "button";

            removeGroupButton.className =
                "admin-product-option-action danger";

            removeGroupButton.textContent =
                "حذف المجموعة";

            removeGroupButton.addEventListener(
                "click",
                () => {
                    const hasGroupData =
                        Boolean(
                            String(
                                group.name ??
                                    ""
                            ).trim()
                        ) ||
                        (
                            Array.isArray(
                                group.values
                            ) &&
                            group.values.length >
                                0
                        ) ||
                        productVariantsState.variants.some(
                            variant =>
                                Array.isArray(
                                    variant.optionValueKeys
                                ) &&
                                variant.optionValueKeys.some(
                                    key =>
                                        group.values.some(
                                            value =>
                                                value.clientKey ===
                                                key
                                        )
                                )
                        );

                    if (
                        hasGroupData &&
                        !confirm(
                            "حذف هذه المجموعة سيغيّر تركيبات الـVariants المرتبطة بها. هل تريد المتابعة؟"
                        )
                    ) {
                        return;
                    }

                    productVariantsState.groups =
                        productVariantsState.groups.filter(
                            item =>
                                item.clientKey !==
                                group.clientKey
                        );

                    markProductVariantsDirty();

                    generateProductVariantCombinations();
                    renderProductOptionGroups();
                }
            );

            header.appendChild(
                removeGroupButton
            );

            groupElement.appendChild(
                header
            );

            const valuesContainer =
                document.createElement(
                    "div"
                );

            valuesContainer.className =
                "admin-product-option-values";

            const values =
                Array.isArray(
                    group.values
                )
                    ? group.values
                    : [];

            values.forEach(
                value => {
                    const valueRow =
                        document.createElement(
                            "div"
                        );

                    valueRow.className =
                        "admin-product-option-value";

                    valueRow.dataset.valueKey =
                        value.clientKey;

                    const valueInput =
                        document.createElement(
                            "input"
                        );

                    valueInput.type =
                        "text";

                    valueInput.className =
                        "admin-form-input";

                    valueInput.placeholder =
                        "مثال: أسود";

                    valueInput.value =
                        value.value;

                    valueInput.addEventListener(
                        "change",
                        () => {
                            value.value =
                                valueInput.value.trim();

                            markProductVariantsDirty();

                            generateProductVariantCombinations();
                        }
                    );

                    const actions =
                        document.createElement(
                            "div"
                        );

                    actions.className =
                        "admin-product-option-value-actions";

                    const removeValueButton =
                        document.createElement(
                            "button"
                        );

                    removeValueButton.type =
                        "button";

                    removeValueButton.className =
                        "admin-product-option-action danger";

                    removeValueButton.textContent =
                        "حذف";

                    removeValueButton.addEventListener(
                        "click",
                        () => {
                            if (
                                !confirm(
                                    "حذف هذه القيمة سيزيل التركيبات التي تعتمد عليها عند الحفظ. هل تريد المتابعة؟"
                                )
                            ) {
                                return;
                            }

                            group.values =
                                group.values.filter(
                                    item =>
                                        item.clientKey !==
                                        value.clientKey
                                );

                            markProductVariantsDirty();

                            generateProductVariantCombinations();
                            renderProductOptionGroups();
                        }
                    );

                    actions.appendChild(
                        removeValueButton
                    );

                    valueRow.append(
                        valueInput,
                        actions
                    );

                    valuesContainer.appendChild(
                        valueRow
                    );
                }
            );

            groupElement.appendChild(
                valuesContainer
            );

            const footer =
                document.createElement(
                    "div"
                );

            footer.className =
                "admin-product-option-group-footer";

            const addValueButton =
                document.createElement(
                    "button"
                );

            addValueButton.type =
                "button";

            addValueButton.className =
                "admin-secondary-button";

            addValueButton.textContent =
                "+ إضافة قيمة";

            addValueButton.addEventListener(
                "click",
                () => {
                    group.values.push({
                        id: null,

                        clientKey:
                            createClientKey(
                                "v"
                            ),

                        value: "",

                        sortOrder:
                            group.values
                                .length
                    });

                    markProductVariantsDirty();

                    renderProductOptionGroups();

                    /*
                     * لا نعيد توليد التركيبات
                     * قبل إدخال قيمة حقيقية.
                     */
                    renderProductVariantsTable();
                }
            );

            footer.appendChild(
                addValueButton
            );

            groupElement.appendChild(
                footer
            );

            fragment.appendChild(
                groupElement
            );
        }
    );

    container.appendChild(
        fragment
    );
}

function getVariantOptionLabels(
    variant
) {
    const labels = [];

    productVariantsState.groups.forEach(
        group => {
            const valueKey =
                variant.optionValueKeys.find(
                    key =>
                        group.values.some(
                            value =>
                                value.clientKey ===
                                key
                        )
                );

            if (!valueKey) return;

            const value =
                group.values.find(
                    item =>
                        item.clientKey ===
                        valueKey
                );

            if (!value) return;

            labels.push({
                groupName:
                    group.name ||
                    "خيار",

                value:
                    value.value ||
                    "—"
            });
        }
    );

    return labels;
}

function renderProductVariantsTable() {
    const table =
        document.getElementById(
            "productVariantsTable"
        );

    const empty =
        document.getElementById(
            "productVariantsEmpty"
        );

    if (!table) return;

    table.innerHTML =
        "";

    const variants =
        Array.isArray(
            productVariantsState.variants
        )
            ? productVariantsState.variants
            : [];

    if (
        !productVariantsState.enabled ||
        variants.length === 0
    ) {
        if (empty) {
            empty.hidden =
                false;
        }

        return;
    }

    if (empty) {
        empty.hidden =
            true;
    }

    const fragment =
        document.createDocumentFragment();

    variants.forEach(
        variant => {
            const row =
                document.createElement(
                    "tr"
                );

            row.dataset.variantKey =
                variant.clientKey;

            // ------------------------------
            // Options
            // ------------------------------

            const optionsCell =
                document.createElement(
                    "td"
                );

            const optionsWrapper =
                document.createElement(
                    "div"
                );

            optionsWrapper.className =
                "admin-product-variant-options";

            const labels =
                getVariantOptionLabels(
                    variant
                );

            labels.forEach(
                item => {
                    const chip =
                        document.createElement(
                            "span"
                        );

                    chip.className =
                        "admin-product-variant-option";

                    chip.textContent =
                        `${item.groupName}: ${item.value}`;

                    optionsWrapper.appendChild(
                        chip
                    );
                }
            );

            optionsCell.appendChild(
                optionsWrapper
            );

            // ------------------------------
            // SKU
            // ------------------------------

            const skuCell =
                document.createElement(
                    "td"
                );

            const skuInput =
                document.createElement(
                    "input"
                );

            skuInput.type =
                "text";

            skuInput.className =
                "admin-product-variant-input sku";

            skuInput.value =
                variant.sku || "";

            skuInput.autocomplete =
                "off";

            skuInput.spellcheck =
                false;

            skuInput.addEventListener(
                "input",
                () => {
                    variant.sku =
                        skuInput.value.trim();

                    markProductVariantsDirty();
                }
            );

            skuCell.appendChild(
                skuInput
            );

            // ------------------------------
            // Price
            // ------------------------------

            const priceCell =
                document.createElement(
                    "td"
                );

            const priceInput =
                document.createElement(
                    "input"
                );

            priceInput.type =
                "number";

            priceInput.className =
                "admin-product-variant-input";

            priceInput.min =
                "0";

            priceInput.step =
                "0.01";

            priceInput.placeholder =
                "سعر المنتج الأساسي";

            priceInput.value =
                variant.price ===
                    null ||
                variant.price ===
                    undefined
                    ? ""
                    : String(
                          variant.price
                      );

            priceInput.addEventListener(
                "input",
                () => {
                    const value =
                        priceInput.value.trim();

                    variant.price =
                        value === ""
                            ? null
                            : Number(
                                  value
                              );

                    markProductVariantsDirty();
                }
            );

            priceCell.appendChild(
                priceInput
            );

            // ------------------------------
            // Quantity
            // ------------------------------

            const quantityCell =
                document.createElement(
                    "td"
                );

            const quantityInput =
                document.createElement(
                    "input"
                );

            quantityInput.type =
                "number";

            quantityInput.className =
                "admin-product-variant-input";

            quantityInput.min =
                "0";

            quantityInput.step =
                "1";

            quantityInput.value =
                String(
                    Number.isInteger(
                        Number(
                            variant.quantity
                        )
                    )
                        ? variant.quantity
                        : 0
                );

            quantityInput.addEventListener(
                "input",
                () => {
                    variant.quantity =
                        Number(
                            quantityInput.value
                        );

                    markProductVariantsDirty();
                }
            );

            quantityCell.appendChild(
                quantityInput
            );

            // ------------------------------
            // Purchase Cost
            // ------------------------------

            const costCell =
                document.createElement(
                    "td"
                );

            const costInput =
                document.createElement(
                    "input"
                );

            costInput.type =
                "number";

            costInput.className =
                "admin-product-variant-input";

            costInput.min =
                "0.01";

            costInput.step =
                "0.01";

            costInput.value =
                variant.purchaseCost ===
                    null ||
                variant.purchaseCost ===
                    undefined
                    ? ""
                    : String(
                          variant.purchaseCost
                      );

            costInput.addEventListener(
                "input",
                () => {
                    variant.purchaseCost =
                        Number(
                            costInput.value
                        );

                    markProductVariantsDirty();
                }
            );

            costCell.appendChild(
                costInput
            );

            // ------------------------------
            // Active
            // ------------------------------

            const activeCell =
                document.createElement(
                    "td"
                );

            activeCell.className =
                "admin-product-variant-active";

            const activeInput =
                document.createElement(
                    "input"
                );

            activeInput.type =
                "checkbox";

            activeInput.checked =
                variant.active !== false;

            activeInput.addEventListener(
                "change",
                () => {
                    variant.active =
                        activeInput.checked;

                    markProductVariantsDirty();
                }
            );

            activeCell.appendChild(
                activeInput
            );

            row.append(
                optionsCell,
                skuCell,
                priceCell,
                quantityCell,
                costCell,
                activeCell
            );

            fragment.appendChild(
                row
            );
        }
    );

    table.appendChild(
        fragment
    );
}

// ==========================================
// Variant Validation & Payload
// ==========================================

function validateProductVariants() {
    if (
        !productVariantsState.enabled
    ) {
        return {
            valid: true,
            groups: [],
            variants: []
        };
    }

    const groups =
        productVariantsState.groups;

    if (groups.length === 0) {
        return {
            valid: false,
            message:
                "تم تفعيل خيارات المنتج، لكن لم تتم إضافة أي مجموعة خيارات."
        };
    }

    const normalizedGroups =
        groups.map(
            (
                group,
                groupIndex
            ) => ({
                ...group,

                name:
                    String(
                        group.name ??
                            ""
                    ).trim(),

                sortOrder:
                    groupIndex
            })
        );

    const groupNames =
        new Set();

    for (
        const group of
        normalizedGroups
    ) {
        if (!group.name) {
            return {
                valid: false,
                message:
                    "يرجى إدخال اسم لكل مجموعة خيارات."
            };
        }

        const normalizedName =
            group.name.toLocaleLowerCase();

        if (
            groupNames.has(
                normalizedName
            )
        ) {
            return {
                valid: false,
                message:
                    "لا يمكن تكرار اسم مجموعة الخيارات."
            };
        }

        groupNames.add(
            normalizedName
        );

        if (
            !Array.isArray(
                group.values
            ) ||
            group.values.length === 0
        ) {
            return {
                valid: false,
                message:
                    `مجموعة "${group.name}" يجب أن تحتوي على قيمة واحدة على الأقل.`
            };
        }

        const valueNames =
            new Set();

        for (
            const value of
            group.values
        ) {
            const valueText =
                String(
                    value.value ??
                        ""
                ).trim();

            if (!valueText) {
                return {
                    valid: false,
                    message:
                        `يوجد خيار فارغ داخل مجموعة "${group.name}".`
                };
            }

            const normalizedValue =
                valueText.toLocaleLowerCase();

            if (
                valueNames.has(
                    normalizedValue
                )
            ) {
                return {
                    valid: false,
                    message:
                        `لا يمكن تكرار القيمة "${valueText}" داخل مجموعة "${group.name}".`
                };
            }

            valueNames.add(
                normalizedValue
            );
        }
    }

    const variants =
        productVariantsState.variants;

    if (
        variants.length === 0
    ) {
        return {
            valid: false,
            message:
                "لم يتم إنشاء أي تركيبة. اضغط «تحديث التركيبات»."
        };
    }

    const groupKeySet =
        new Set(
            normalizedGroups.map(
                group =>
                    group.clientKey
            )
        );

    const combinationKeys =
        new Set();

    for (
        const variant of
        variants
    ) {
        const sku =
            String(
                variant.sku ??
                    ""
            ).trim();

        if (!sku) {
            return {
                valid: false,
                message:
                    "كل Variant يجب أن يحتوي على SKU."
            };
        }

        const quantity =
            Number(
                variant.quantity
            );

        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity < 0
        ) {
            return {
                valid: false,
                message:
                    `الكمية غير صالحة للـVariant "${sku}".`
            };
        }

        const purchaseCost =
            Number(
                variant.purchaseCost
            );

        if (
            !Number.isFinite(
                purchaseCost
            ) ||
            purchaseCost <= 0
        ) {
            return {
                valid: false,
                message:
                    `تكلفة الشراء يجب أن تكون أكبر من صفر للـVariant "${sku}".`
            };
        }

        if (
            variant.price !==
                null &&
            variant.price !==
                undefined &&
            variant.price !==
                ""
        ) {
            const variantPrice =
                Number(
                    variant.price
                );

            if (
                !Number.isFinite(
                    variantPrice
                ) ||
                variantPrice < 0
            ) {
                return {
                    valid: false,
                    message:
                        `السعر غير صالح للـVariant "${sku}".`
                };
            }
        }

        const optionValueKeys =
            Array.isArray(
                variant.optionValueKeys
            )
                ? variant.optionValueKeys
                : [];

        if (
            optionValueKeys.length !==
            normalizedGroups.length
        ) {
            return {
                valid: false,
                message:
                    `تركيبة الـVariant "${sku}" غير مكتملة.`
            };
        }

        const usedGroupKeys =
            new Set();

        for (
            const valueKey of
            optionValueKeys
        ) {
            let foundGroup =
                null;

            normalizedGroups.some(
                group => {
                    const found =
                        group.values.some(
                            value =>
                                value.clientKey ===
                                valueKey
                        );

                    if (found) {
                        foundGroup =
                            group;

                        return true;
                    }

                    return false;
                }
            );

            if (!foundGroup) {
                return {
                    valid: false,
                    message:
                        `تركيبة الـVariant "${sku}" تحتوي على قيمة غير موجودة.`
                };
            }

            if (
                usedGroupKeys.has(
                    foundGroup.clientKey
                )
            ) {
                return {
                    valid: false,
                    message:
                        `تركيبة الـVariant "${sku}" تحتوي على أكثر من قيمة من نفس المجموعة.`
                };
            }

            usedGroupKeys.add(
                foundGroup.clientKey
            );
        }

        if (
            usedGroupKeys.size !==
            groupKeySet.size
        ) {
            return {
                valid: false,
                message:
                    `تركيبة الـVariant "${sku}" لا تحتوي على خيار من كل مجموعة.`
            };
        }

        const combinationKey =
            getVariantCombinationKey(
                optionValueKeys
            );

        if (
            combinationKeys.has(
                combinationKey
            )
        ) {
            return {
                valid: false,
                message:
                    "تم تكرار نفس تركيبة الخيارات أكثر من مرة."
            };
        }

        combinationKeys.add(
            combinationKey
        );
    }

    /*
     * SKU uniqueness داخل الحالة الحالية.
     */
    const skuSet =
        new Set();

    for (
        const variant of
        variants
    ) {
        const sku =
            String(
                variant.sku ??
                    ""
            ).trim();
            const normalizedSku =
            sku.toLocaleLowerCase();

        if (
            skuSet.has(
                normalizedSku
            )
        ) {
            return {
                valid: false,
                message:
                    `SKU "${sku}" مكرر داخل Variants.`
            };
        }

        skuSet.add(
            normalizedSku
        );
    }

    return {
        valid: true,
        groups: normalizedGroups,
        variants
    };
}

function buildProductVariantsPayload() {
    const validation =
        validateProductVariants();

    if (!validation.valid) {
        throw new Error(
            validation.message
        );
    }

    const groups =
        validation.groups.map(
            group => ({
                client_key:
                    group.clientKey,

                id:
                    group.id ??
                    null,

                name:
                    group.name,

                sort_order:
                    group.sortOrder,

                values:
                    group.values.map(
                        (
                            value,
                            index
                        ) => ({
                            client_key:
                                value.clientKey,

                            id:
                                value.id ??
                                null,

                            value:
                                String(
                                    value.value ??
                                        ""
                                ).trim(),

                            sort_order:
                                index
                        })
                    )
            })
        );

    const variants =
        validation.variants.map(
            variant => ({
                client_key:
                    variant.clientKey,

                id:
                    variant.id ??
                    null,

                sku:
                    String(
                        variant.sku ??
                            ""
                    ).trim(),

                price:
                    variant.price ===
                        null ||
                    variant.price ===
                        undefined ||
                    variant.price ===
                        ""
                        ? null
                        : Number(
                              variant.price
                          ),

                quantity:
                    Number(
                        variant.quantity
                    ),

                purchase_cost:
                    Number(
                        variant.purchaseCost
                    ),

                active:
                    variant.active !==
                    false,

                option_value_keys:
                    Array.isArray(
                        variant.optionValueKeys
                    )
                        ? [
                              ...variant.optionValueKeys
                          ]
                        : []
            })
        );

    return {
        groups,
        variants
    };
}

async function saveProductVariants(
    productId
) {
    const payload =
        buildProductVariantsPayload();

    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "admin_save_product_variants",
            {
                p_product_id:
                    Number(
                        productId
                    ),

                p_groups:
                    payload.groups,

                p_variants:
                    payload.variants
            }
        );

    if (error) {
        throw error;
    }

    return data;
}

// ==========================================
// Load Products
// ==========================================

async function loadAdminProducts() {
    const loadToken =
        ++adminProductsLoadToken;

    const table =
        document.getElementById(
            "adminProductsTable"
        );

    const loading =
        document.getElementById(
            "productsLoading"
        );

    const empty =
        document.getElementById(
            "productsEmpty"
        );

    const pagination =
        document.getElementById(
            "productsPagination"
        );

    if (loading) {
        loading.hidden =
            false;

        loading.textContent =
            "جاري تحميل المنتجات...";
    }

    if (empty) {
        empty.hidden =
            true;
    }

    if (pagination) {
        pagination.hidden =
            true;
    }

    if (table) {
        table.innerHTML =
            "";
    }

    try {
        let query =
            supabaseClient
                .from("products")
                .select(
                    ADMIN_PRODUCT_COLUMNS,
                    {
                        count: "exact"
                    }
                )
                .order(
                    "id",
                    {
                        ascending:
                            false
                    }
                );

        if (currentSearchTerm) {
            const safeSearchTerm =
                escapePostgrestSearchValue(
                    currentSearchTerm
                );

            query =
                query.or(
                    `name.ilike.%${safeSearchTerm}%,product_code.ilike.%${safeSearchTerm}%`
                );
        }

        const from =
            (
                currentPage -
                1
            ) *
            ITEMS_PER_PAGE;

        const to =
            from +
            ITEMS_PER_PAGE -
            1;

        query =
            query.range(
                from,
                to
            );

        const {
            data,
            count,
            error
        } =
            await query;

        if (error) {
            throw error;
        }

        /*
         * إذا انتهى التحميل الحالي وأصبح هناك
         * طلب أحدث، لا نسمح للنتيجة القديمة
         * بتغيير الواجهة.
         */
        if (
            loadToken !==
            adminProductsLoadToken
        ) {
            return;
        }

        const safeCount =
            Number.isFinite(
                Number(count)
            )
                ? Number(count)
                : 0;

        /*
         * حماية الصفحة الحالية من أن تصبح خارج
         * النطاق بعد حذف منتجات أو تغيير البحث.
         */
        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    safeCount /
                        ITEMS_PER_PAGE
                )
            );

        if (
            currentPage >
            totalPages
        ) {
            currentPage =
                totalPages;

            /*
             * لا نرسم نتيجة الصفحة القديمة.
             * نعيد الطلب للصفحة الصحيحة.
             */
            return await loadAdminProducts();
        }

        adminProducts =
            Array.isArray(data)
                ? data
                : [];

        totalProductsCount =
            safeCount;

        await loadAdminProductCosts();

        if (
            loadToken !==
            adminProductsLoadToken
        ) {
            return;
        }

        renderAdminProducts();
        updatePaginationUI();
        updateProductsCountDisplay();
    } catch (error) {
        console.error(
            "Load products error:",
            error
        );

        /*
         * تجاهل أخطاء/نتائج request قديم.
         */
        if (
            loadToken !==
            adminProductsLoadToken
        ) {
            return;
        }

        if (loading) {
            loading.textContent =
                "حدث خطأ أثناء تحميل المنتجات.";
        }

        showAdminProductToast(
            "تعذر تحميل المنتجات.",
            "error"
        );
    }
}

async function loadAdminProductCosts() {
    if (
        adminProducts.length ===
        0
    ) {
        adminProductCosts =
            {};

        return;
    }

    const productIds =
        adminProducts.map(
            product =>
                product.id
        );

    const {
        data,
        error
    } =
        await supabaseClient
            .from("product_costs")
            .select(
                "product_id, purchase_cost"
            )
            .in(
                "product_id",
                productIds
            );

    if (error) {
        throw error;
    }

    adminProductCosts =
        {};

    (data || []).forEach(
        cost => {
            adminProductCosts[
                String(
                    cost.product_id
                )
            ] =
                cost.purchase_cost;
        }
    );
}

async function loadAdminCategories() {
    try {
        const {
            data,
            error
        } =
            await supabaseClient
                .from("categories")
                .select(
                    "id, name"
                )
                .order(
                    "id",
                    {
                        ascending:
                            true
                    }
                );

        if (error) {
            throw error;
        }

        adminCategories =
            Array.isArray(data)
                ? data
                : [];

        renderCategoryOptions();
        updateCategoriesCountDisplay();
    } catch (error) {
        console.error(
            "Categories error:",
            error
        );

        showAdminProductToast(
            "تعذر تحميل التصنيفات.",
            "error"
        );
    }
}

// ==========================================
// Pagination
// ==========================================

function setupPaginationControls() {
    const nextBtn =
        document.getElementById(
            "nextPageBtn"
        );

    const prevBtn =
        document.getElementById(
            "prevPageBtn"
        );

    if (nextBtn) {
        nextBtn.addEventListener(
            "click",
            () => {
                if (
                    isProductSaving ||
                    isProductDeleting
                ) {
                    return;
                }

                const totalPages =
                    Math.ceil(
                        totalProductsCount /
                            ITEMS_PER_PAGE
                    ) || 1;

                if (
                    currentPage <
                    totalPages
                ) {
                    currentPage++;

                    loadAdminProducts();
                }
            }
        );
    }

    if (prevBtn) {
        prevBtn.addEventListener(
            "click",
            () => {
                if (
                    isProductSaving ||
                    isProductDeleting
                ) {
                    return;
                }

                if (
                    currentPage >
                    1
                ) {
                    currentPage--;

                    loadAdminProducts();
                }
            }
        );
    }
}

function updatePaginationUI() {
    const pagination =
        document.getElementById(
            "productsPagination"
        );

    const nextBtn =
        document.getElementById(
            "nextPageBtn"
        );

    const prevBtn =
        document.getElementById(
            "prevPageBtn"
        );

    const pageNum =
        document.getElementById(
            "currentPageNum"
        );

    const totalPagesSpan =
        document.getElementById(
            "totalPagesNum"
        );

    if (!pagination) return;

    if (
        totalProductsCount ===
        0
    ) {
        pagination.hidden =
            true;

        return;
    }

    pagination.hidden =
        false;

    const totalPages =
        Math.ceil(
            totalProductsCount /
                ITEMS_PER_PAGE
        ) || 1;

    if (pageNum) {
        pageNum.textContent =
            currentPage;
    }

    if (totalPagesSpan) {
        totalPagesSpan.textContent =
            totalPages;
    }

    if (prevBtn) {
        prevBtn.disabled =
            currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled =
            currentPage ===
            totalPages;
    }
}

// ==========================================
// Render UI
// ==========================================

function renderCategoryOptions() {
    const select =
        document.getElementById(
            "productCategory"
        );

    if (!select) return;

    select.innerHTML =
        '<option value="">اختر التصنيف</option>';

    const fragment =
        document.createDocumentFragment();

    adminCategories.forEach(
        category => {
            if (!category) return;

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(
                    category.id
                );

            option.textContent =
                String(
                    category.name
                );

            fragment.appendChild(
                option
            );
        }
    );

    select.appendChild(
        fragment
    );
}

function renderAdminProducts() {
    const table =
        document.getElementById(
            "adminProductsTable"
        );

    const loading =
        document.getElementById(
            "productsLoading"
        );

    const empty =
        document.getElementById(
            "productsEmpty"
        );

    if (!table) return;

    if (loading) {
        loading.hidden =
            true;
    }

    table.innerHTML =
        "";

    if (
        adminProducts.length ===
        0
    ) {
        if (empty) {
            empty.hidden =
                false;
        }

        return;
    }

    if (empty) {
        empty.hidden =
            true;
    }

    const fragment =
        document.createDocumentFragment();

    adminProducts.forEach(
        product => {
            if (!product) return;

            const row =
                document.createElement(
                    "tr"
                );

            const quantity =
                Number(
                    product.quantity ||
                        0
                );

            const imageUrl =
                String(
                    product.main_image ||
                        ""
                ).trim();

            const category =
                adminCategories.find(
                    category =>
                        String(
                            category.id
                        ) ===
                        String(
                            product.category_id
                        )
                );

            const categoryName =
                category
                    ? category.name
                    : "بدون تصنيف";

            let imageHTML =
                `<div class="admin-product-image" style="display:flex; align-items:center; justify-content:center; background:#f3f4f6;">—</div>`;

            if (
                imageUrl &&
                isSafeImageUrl(
                    imageUrl
                )
            ) {
                imageHTML =
                    `<img class="admin-product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name || "")}" loading="lazy" decoding="async">`;
            }

            row.innerHTML = `
                <td>${imageHTML}</td>

                <td>
                    <strong>
                        ${escapeHtml(
                            product.name ||
                                ""
                        )}
                    </strong>
                </td>

                <td>
                    ${formatPrice(
                        product.price
                    )}
                </td>

                <td>
                    <span class="${
                        quantity <=
                        0
                            ? "stock-empty"
                            : "stock-available"
                    }">
                        ${quantity}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        categoryName
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        product.product_code ||
                            ""
                    )}
                </td>

                <td>
                    <div class="admin-actions">
                        <button
                            type="button"
                            class="admin-edit-button"
                            data-action="edit"
                            data-id="${escapeHtml(product.id)}">
                            تعديل
                        </button>

                        <button
                            type="button"
                            class="admin-delete-button"
                            data-action="delete"
                            data-id="${escapeHtml(product.id)}">
                            حذف
                        </button>
                    </div>
                </td>
            `;

            fragment.appendChild(
                row
            );
        }
    );

    table.appendChild(
        fragment
    );
}

// ==========================================
// Image Editor State
// ==========================================

let productImageEditorState = {
    file: null,
    image: null,
    objectUrl: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    baseScale: 1,
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0
};

function getProductImageEditorElements() {
    return {
        editor:
            document.getElementById(
                "productImageEditor"
            ),

        stage:
            document.querySelector(
                ".admin-product-image-editor-stage"
            ),

        image:
            document.getElementById(
                "productImageEditorImage"
            ),

        zoom:
            document.getElementById(
                "productImageZoom"
            ),

        reset:
            document.getElementById(
                "resetProductImageEditor"
            )
    };
}

function resetProductImageEditorState() {
    productImageLoadToken++;

    revokeObjectUrl(
        productImageEditorState.objectUrl
    );

    productImageEditorState = {
        file: null,
        image: null,
        objectUrl: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        baseScale: 1,
        dragging: false,
        startX: 0,
        startY: 0,
        startOffsetX: 0,
        startOffsetY: 0
    };

    const elements =
        getProductImageEditorElements();

    if (elements.image) {
        elements.image.removeAttribute(
            "src"
        );

        elements.image.style.transform =
            "";
    }

    if (elements.editor) {
        elements.editor.hidden =
            true;
    }

    if (elements.zoom) {
        elements.zoom.min =
            "0.05";

        elements.zoom.max =
            "3";

        elements.zoom.step =
            "0.01";

        elements.zoom.value =
            "1";
    }
}

function resetProductImageState() {
    const fileInput =
        document.getElementById(
            "productImageFile"
        );

    const previewContainer =
        document.getElementById(
            "productImagePreview"
        );

    const previewImage =
        document.getElementById(
            "productImagePreviewImage"
        );

    const status =
        document.getElementById(
            "productImageStatus"
        );

    if (fileInput) {
        fileInput.value =
            "";
    }

    if (previewImage) {
        revokeObjectUrl(
            previewImage.dataset
                .previewUrl
        );

        delete previewImage.dataset
            .previewUrl;

        previewImage.removeAttribute(
            "src"
        );
    }

    if (previewContainer) {
        previewContainer.hidden =
            true;
    }

    if (status) {
        status.textContent =
            "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ المنتج.";
    }

    resetProductImageEditorState();
}

function setProductImagePreview(
    imageUrl,
    statusText = ""
) {
    const previewContainer =
        document.getElementById(
            "productImagePreview"
        );

    const previewImage =
        document.getElementById(
            "productImagePreviewImage"
        );

    const status =
        document.getElementById(
            "productImageStatus"
        );

    if (
        !previewContainer ||
        !previewImage
    ) {
        return;
    }

    revokeObjectUrl(
        previewImage.dataset
            .previewUrl
    );

    delete previewImage.dataset
        .previewUrl;

    const validUrl =
        imageUrl &&
        isSafeImageUrl(
            imageUrl
        );

    if (!validUrl) {
        previewImage.removeAttribute(
            "src"
        );

        previewContainer.hidden =
            true;

        if (status) {
            status.textContent =
                statusText;
        }

        return;
    }

    previewImage.src =
        imageUrl;

    previewContainer.hidden =
        false;

    if (status) {
        status.textContent =
            statusText;
    }
}

// ==========================================
// Modals
// ==========================================

function openAddProductModal() {
    if (isProductSaving) return;

    /*
     * مهم جدًا:
     * إلغاء أي RPC قديم خاص بمنتج كان مفتوحًا
     * قبل فتح نموذج إضافة منتج جديد.
     *
     * يمنع عودة Variants قديمة إلى المنتج الجديد.
     */
    productVariantsLoadToken++;

    const modal =
        document.getElementById(
            "productModal"
        );

    const form =
        document.getElementById(
            "productForm"
        );

    const title =
        document.getElementById(
            "productModalTitle"
        );

    resetProductImageState();

    if (form) {
        form.reset();
    }

    const productId =
        document.getElementById(
            "productId"
        );

    if (productId) {
        productId.value =
            "";
    }

    const purchaseCost =
        document.getElementById(
            "productPurchaseCost"
        );

    if (purchaseCost) {
        purchaseCost.value =
            "";
    }

    if (title) {
        title.textContent =
            "إضافة منتج";
    }

    clearFormMessage();

    /*
     * المنتج الجديد يبدأ بدون Variants.
     * لا توجد حاجة لطلب RPC.
     */
    productVariantsState = {
        enabled: false,
        groups: [],
        variants: []
    };

    productVariantsLoaded =
        true;

    productVariantsDirty =
        false;

    renderProductVariantsUI();

    setProductVariantsStatus(
        ""
    );

    if (modal) {
        modal.hidden =
            false;
    }

    updateProductVariantsSaveAvailability();
}

async function openEditProductModal(
    id
) {
    if (isProductSaving) return;

    const product =
        adminProducts.find(
            item =>
                String(
                    item.id
                ) ===
                String(id)
        );

    if (!product) {
        showAdminProductToast(
            "المنتج غير موجود.",
            "error"
        );

        return;
    }

    /*
     * إلغاء أي عملية تحميل Variants
     * سابقة تخص منتجًا آخر.
     */
    productVariantsLoadToken++;

    productVariantsLoaded =
        false;

    productVariantsDirty =
        false;

    resetProductImageState();

    const productId =
        document.getElementById(
            "productId"
        );

    const productName =
        document.getElementById(
            "productName"
        );

    const productCode =
        document.getElementById(
            "productCode"
        );

    const productPrice =
        document.getElementById(
            "productPrice"
        );

    const productQuantity =
        document.getElementById(
            "productQuantity"
        );

    const productCategory =
        document.getElementById(
            "productCategory"
        );

    const productTarget =
        document.getElementById(
            "productTarget"
        );

    const productDescription =
        document.getElementById(
            "productDescription"
        );

    const productPurchaseCost =
        document.getElementById(
            "productPurchaseCost"
        );

    const productModalTitle =
        document.getElementById(
            "productModalTitle"
        );

    if (productId) {
        productId.value =
            product.id;
    }

    if (productName) {
        productName.value =
            product.name || "";
    }

    if (productCode) {
        productCode.value =
            product.product_code ||
            "";
    }

    if (productPrice) {
        productPrice.value =
            product.price ?? "";
    }

    if (productQuantity) {
        productQuantity.value =
            product.quantity ?? 0;
    }

    if (productCategory) {
        productCategory.value =
            product.category_id ||
            "";
    }

    if (productTarget) {
        productTarget.value =
            product.target || "";
    }

    if (productDescription) {
        productDescription.value =
            product.description ||
            "";
    }

    if (productPurchaseCost) {
        productPurchaseCost.value =
            adminProductCosts[
                String(product.id)
            ] ?? "";
    }

    if (product.main_image) {
        setProductImagePreview(
            String(
                product.main_image
            ),
            "الصورة الحالية للمنتج."
        );
    }

    if (productModalTitle) {
        productModalTitle.textContent =
            "تعديل المنتج";
    }

    clearFormMessage();

    /*
     * حالة مؤقتة إلى أن يصل RPC.
     */
    productVariantsState = {
        enabled: false,
        groups: [],
        variants: []
    };

    updateProductVariantsToggleUI();

    setProductVariantsStatus(
        "جاري تحميل خيارات المنتج..."
    );

    const modal =
        document.getElementById(
            "productModal"
        );

    if (modal) {
        modal.hidden =
            false;
    }

    updateProductVariantsSaveAvailability();

    try {
        await loadProductVariants(
            product.id
        );
    } catch {
        /*
         * الخطأ عُرض داخل قسم Variants.
         * نترك الحفظ معطلاً.
         */
    }
}

function closeProductModalWindow() {
    if (isProductSaving) return;

    /*
     * إلغاء أي RPC تحميل قديم.
     */
    productVariantsLoadToken++;

    const modal =
        document.getElementById(
            "productModal"
        );

    if (modal) {
        modal.hidden =
            true;
    }

    resetProductImageState();
    clearFormMessage();

    productVariantsState = {
        enabled: false,
        groups: [],
        variants: []
    };

    productVariantsLoaded =
        true;

    productVariantsDirty =
        false;

    renderProductVariantsUI();

    setProductVariantsStatus(
        ""
    );
}

// ==========================================
// Image Editor Engine
// ==========================================

function resetProductImageEditor() {
    productImageEditorState.scale =
        productImageEditorState.baseScale ||
        1;

    productImageEditorState.offsetX =
        0;

    productImageEditorState.offsetY =
        0;

    const { zoom } =
        getProductImageEditorElements();

    if (zoom) {
        zoom.value =
            productImageEditorState.scale;
    }

    updateProductImageEditor();
}

function updateProductImageEditor() {
    const { image } =
        getProductImageEditorElements();

    if (
        !image ||
        !productImageEditorState.image
    ) {
        return;
    }

    const {
        scale,
        offsetX,
        offsetY
    } =
        productImageEditorState;

    image.style.transform =
        `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`;
}

function setupProductImageEditor() {
    const elements =
        getProductImageEditorElements();

    if (!elements.stage) return;

    elements.stage.addEventListener(
        "pointerdown",
        event => {
            if (
                !productImageEditorState.image
            ) {
                return;
            }

            event.preventDefault();

            productImageEditorState.dragging =
                true;

            productImageEditorState.startX =
                event.clientX;

            productImageEditorState.startY =
                event.clientY;

            productImageEditorState.startOffsetX =
                productImageEditorState.offsetX;

            productImageEditorState.startOffsetY =
                productImageEditorState.offsetY;

            try {
                elements.stage.setPointerCapture(
                    event.pointerId
                );
            } catch {}
        }
    );

    elements.stage.addEventListener(
        "pointermove",
        event => {
            if (
                !productImageEditorState.dragging
            ) {
                return;
            }

            productImageEditorState.offsetX =
                productImageEditorState.startOffsetX +
                (
                    event.clientX -
                    productImageEditorState.startX
                );

            productImageEditorState.offsetY =
                productImageEditorState.startOffsetY +
                (
                    event.clientY -
                    productImageEditorState.startY
                );

            updateProductImageEditor();
        }
    );

    const stopDragging =
        event => {
            productImageEditorState.dragging =
                false;

            try {
                elements.stage.releasePointerCapture(
                    event.pointerId
                );
            } catch {}
        };

    elements.stage.addEventListener(
        "pointerup",
        stopDragging
    );

    elements.stage.addEventListener(
        "pointercancel",
        stopDragging
    );

    if (elements.zoom) {
        elements.zoom.addEventListener(
            "input",
            function () {
                const value =
                    Number(
                        this.value
                    );

                if (
                    !Number.isFinite(
                        value
                    )
                ) {
                    return;
                }

                productImageEditorState.scale =
                    value;

                updateProductImageEditor();
            }
        );
    }

    if (elements.reset) {
        elements.reset.addEventListener(
            "click",
            resetProductImageEditor
        );
    }
}

async function loadProductImageIntoEditor(
    file
) {
    if (
        !file ||
        !file.type.startsWith(
            "image/"
        )
    ) {
        throw new Error(
            "الملف المحدد ليس صورة صالحة."
        );
    }

    const currentToken =
        ++productImageLoadToken;

    revokeObjectUrl(
        productImageEditorState.objectUrl
    );

    const objectUrl =
        URL.createObjectURL(
            file
        );

    productImageEditorState.file =
        file;

    productImageEditorState.objectUrl =
        objectUrl;

    const image =
        new Image();

    try {
        await new Promise(
            (
                resolve,
                reject
            ) => {
                image.onload =
                    resolve;

                image.onerror =
                    () =>
                        reject(
                            new Error(
                                "تعذر قراءة الصورة."
                            )
                        );

                image.src =
                    objectUrl;
            }
        );
    } catch (error) {
        image.removeAttribute(
            "src"
        );

        revokeObjectUrl(
            objectUrl
        );

        if (
            productImageEditorState.objectUrl ===
            objectUrl
        ) {
            productImageEditorState.objectUrl =
                null;

            productImageEditorState.file =
                null;
        }

        throw error;
    }

    if (
        currentToken !==
        productImageLoadToken
    ) {
        image.removeAttribute(
            "src"
        );

        revokeObjectUrl(
            objectUrl
        );

        return;
    }

    if (
        image.naturalWidth <=
            0 ||
        image.naturalHeight <=
            0 ||
        image.naturalWidth >
            6000 ||
        image.naturalHeight >
            6000
    ) {
        image.removeAttribute(
            "src"
        );

        revokeObjectUrl(
            objectUrl
        );

        if (
            productImageEditorState.objectUrl ===
            objectUrl
        ) {
            productImageEditorState.objectUrl =
                null;

            productImageEditorState.file =
                null;
        }

        throw new Error(
            "أبعاد الصورة غير صالحة أو ضخمة جدًا للحماية."
        );
    }

    const elements =
        getProductImageEditorElements();

    if (
        !elements.image ||
        !elements.editor ||
        !elements.stage
    ) {
        image.removeAttribute(
            "src"
        );

        revokeObjectUrl(
            objectUrl
        );

        throw new Error(
            "تعذر تجهيز محرر الصورة."
        );
    }

    productImageEditorState.image =
        image;

    elements.image.src =
        objectUrl;

    elements.editor.hidden =
        false;

    const stageWidth =
        elements.stage.clientWidth;

    const stageHeight =
        elements.stage.clientHeight;

    if (
        stageWidth <= 0 ||
        stageHeight <= 0
    ) {
        resetProductImageEditorState();

        throw new Error(
            "تعذر تحديد حجم محرر الصورة."
        );
    }

    const baseScale =
        Math.max(
            stageWidth /
                image.naturalWidth,

            stageHeight /
                image.naturalHeight
        );

    productImageEditorState.baseScale =
        baseScale;

    productImageEditorState.scale =
        baseScale;

    productImageEditorState.offsetX =
        0;

    productImageEditorState.offsetY =
        0;

    if (elements.zoom) {
        const minZoom =
            Math.max(
                0.05,
                baseScale * 0.5
            );

        const maxZoom =
            Math.max(
                minZoom + 0.01,
                baseScale * 3
            );

        elements.zoom.min =
            String(
                minZoom
            );

        elements.zoom.max =
            String(
                maxZoom
            );

        elements.zoom.step =
            String(
                Math.max(
                    0.001,
                    baseScale / 100
                )
            );

        elements.zoom.value =
            String(
                baseScale
            );
    }

    updateProductImageEditor();
}

// ==========================================
// Image Export & Smart Compression
// ==========================================

async function exportEditedProductImage() {
    const { stage } =
        getProductImageEditorElements();

    const state =
        productImageEditorState;

    if (
        !stage ||
        !state.image
    ) {
        throw new Error(
            "لم يتم اختيار صورة."
        );
    }

    const sourceWidth =
        state.image.naturalWidth;

    const sourceHeight =
        state.image.naturalHeight;

    const originalFileSize =
        Number(
            state.file?.size
        ) || 0;

    if (
        !sourceWidth ||
        !sourceHeight
    ) {
        throw new Error(
            "تعذر قراءة أبعاد الصورة."
        );
    }

    const TARGET_SIZE =
        50 * 1024;

    const MAX_OUTPUT_SIZE =
        Math.min(
            1200,
            sourceWidth,
            sourceHeight
        );

    const MIN_OUTPUT_SIZE =
        Math.min(
            MAX_OUTPUT_SIZE,
            640
        );

    const MIN_QUALITY =
        0.45;

    const MAX_QUALITY =
        0.85;

    const stageWidth =
        stage.clientWidth;

    const stageHeight =
        stage.clientHeight;

    if (
        !stageWidth ||
        !stageHeight
    ) {
        throw new Error(
            "تعذر تحديد مساحة الصورة."
        );
    }

    const renderedWidth =
        sourceWidth *
        state.scale;

    const renderedHeight =
        sourceHeight *
        state.scale;

    const renderedLeft =
        (
            stageWidth -
            renderedWidth
        ) /
            2 +
        state.offsetX;

    const renderedTop =
        (
            stageHeight -
            renderedHeight
        ) /
            2 +
        state.offsetY;

    const createWebP =
        (
            outputSize,
            quality
        ) => {
            return new Promise(
                (
                    resolve,
                    reject
                ) => {
                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    const finalSize =
                        Math.max(
                            1,
                            Math.round(
                                outputSize
                            )
                        );

                    canvas.width =
                        finalSize;

                    canvas.height =
                        finalSize;

                    const context =
                        canvas.getContext(
                            "2d"
                        );

                    if (!context) {
                        reject(
                            new Error(
                                "تعذر تجهيز الصورة."
                            )
                        );

                        return;
                    }

                    context.clearRect(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    const cropScale =
                        finalSize /
                        stageWidth;

                    context.drawImage(
                        state.image,

                        renderedLeft *
                            cropScale,

                        renderedTop *
                            cropScale,

                        renderedWidth *
                            cropScale,

                        renderedHeight *
                            cropScale
                    );

                    canvas.toBlob(
                        blob => {
                            if (!blob) {
                                reject(
                                    new Error(
                                        "تعذر استخراج الصورة."
                                    )
                                );

                                return;
                            }

                            resolve(
                                blob
                            );
                        },
                        "image/webp",
                        quality
                    );
                }
            );
        };

    const findBestResult =
        async (
            outputSize,
            maximumSize =
                TARGET_SIZE
        ) => {
            const qualities =
                [
                    MAX_QUALITY,
                    0.70,
                    0.55,
                    MIN_QUALITY
                ];

            let smallestResult =
                null;

            let bestUnderLimit =
                null;

            for (
                const quality of
                qualities
            ) {
                const blob =
                    await createWebP(
                        outputSize,
                        quality
                    );

                const result = {
                    blob,
                    quality,
                    size:
                        blob.size,
                    outputSize
                };

                if (
                    !smallestResult ||
                    result.size <
                        smallestResult.size
                ) {
                    smallestResult =
                        result;
                }

                if (
                    result.size <=
                    maximumSize
                ) {
                    bestUnderLimit =
                        result;

                    break;
                }
            }

            return (
                bestUnderLimit ||
                smallestResult
            );
        };

    /*
     * إذا كان الملف الأصلي صغيرًا بالفعل،
     * لا نرفع الناتج فوق حجمه بلا داعٍ.
     */
    if (
        originalFileSize >
            0 &&
        originalFileSize <=
            TARGET_SIZE
    ) {
        let bestSmallResult =
            await findBestResult(
                MAX_OUTPUT_SIZE,
                originalFileSize
            );

        if (
            bestSmallResult &&
            bestSmallResult.size <=
                originalFileSize
        ) {
            return bestSmallResult.blob;
        }

        const secondResult =
            await createWebP(
                MAX_OUTPUT_SIZE,
                0.55
            );

        if (
            secondResult.size <=
            originalFileSize
        ) {
            return secondResult;
        }

        if (
            !bestSmallResult ||
            secondResult.size <
                bestSmallResult.size
        ) {
            bestSmallResult = {
                blob:
                    secondResult,

                quality:
                    0.55,

                size:
                    secondResult.size,

                outputSize:
                    MAX_OUTPUT_SIZE
            };
        }

        if (
            MAX_OUTPUT_SIZE >
            MIN_OUTPUT_SIZE
        ) {
            const reducedSizes =
                [
                    Math.round(
                        MAX_OUTPUT_SIZE *
                            0.80
                    ),

                    Math.round(
                        MAX_OUTPUT_SIZE *
                            0.65
                    )
                ];

            for (
                const outputSize of
                reducedSizes
            ) {
                const safeOutputSize =
                    Math.max(
                        MIN_OUTPUT_SIZE,

                        Math.min(
                            MAX_OUTPUT_SIZE,
                            outputSize
                        )
                    );

                if (
                    safeOutputSize >=
                    bestSmallResult.outputSize
                ) {
                    continue;
                }

                const candidate =
                    await findBestResult(
                        safeOutputSize,
                        originalFileSize
                    );

                if (!candidate) {
                    continue;
                }

                if (
                    candidate.size <=
                    originalFileSize
                ) {
                    return candidate.blob;
                }

                if (
                    candidate.size <
                    bestSmallResult.size
                ) {
                    bestSmallResult =
                        candidate;
                }
            }
        }

        return bestSmallResult.blob;
    }

    let bestResult =
        await findBestResult(
            MAX_OUTPUT_SIZE,
            TARGET_SIZE
        );

    if (!bestResult) {
        throw new Error(
            "تعذر تجهيز الصورة."
        );
    }

    if (
        bestResult.size <=
        TARGET_SIZE
    ) {
        return bestResult.blob;
    }

    if (
        MAX_OUTPUT_SIZE >
        MIN_OUTPUT_SIZE
    ) {
        const reducedSizes =
            [
                Math.round(
                    MAX_OUTPUT_SIZE *
                        0.80
                ),

                Math.round(
                    MAX_OUTPUT_SIZE *
                        0.65
                )
            ];

        for (
            const outputSize of
            reducedSizes
        ) {
            const safeOutputSize =
                Math.max(
                    MIN_OUTPUT_SIZE,

                    Math.min(
                        MAX_OUTPUT_SIZE,
                        outputSize
                    )
                );

            if (
                safeOutputSize >=
                bestResult.outputSize
            ) {
                continue;
            }

            const candidate =
                await findBestResult(
                    safeOutputSize,
                    TARGET_SIZE
                );

            if (!candidate) {
                continue;
            }

            if (
                candidate.size <=
                TARGET_SIZE
            ) {
                return candidate.blob;
            }

            if (
                candidate.size <
                bestResult.size
            ) {
                bestResult =
                    candidate;
            }
        }
    }

    return bestResult.blob;
}

// ==========================================
// Image File Selection
// ==========================================

document
    .getElementById(
        "productImageFile"
    )
    ?.addEventListener(
        "change",
        async function () {
            const file =
                this.files?.[0];

            const previewContainer =
                document.getElementById(
                    "productImagePreview"
                );

            const previewImage =
                document.getElementById(
                    "productImagePreviewImage"
                );

            const status =
                document.getElementById(
                    "productImageStatus"
                );

            if (!file) {
                resetProductImageState();

                return;
            }

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {
                this.value =
                    "";

                resetProductImageState();

                showAdminProductToast(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );

                return;
            }

            resetProductImageEditorState();

            try {
                if (status) {
                    status.textContent =
                        "جاري تجهيز محرر الصورة...";
                }

                await loadProductImageIntoEditor(
                    file
                );

                if (
                    previewContainer
                ) {
                    previewContainer.hidden =
                        true;
                }

                if (previewImage) {
                    previewImage.removeAttribute(
                        "src"
                    );
                }

                if (status) {
                    status.textContent =
                        "حرّك الصورة لاختيار الجزء المناسب.";
                }
            } catch (error) {
                console.error(
                    "Image loading error:",
                    error
                );

                this.value =
                    "";

                resetProductImageState();

                showAdminProductToast(
                    error.message ||
                        "تعذر تجهيز الصورة.",
                    "error"
                );
            }
        }
    );

// ==========================================
// Upload Product Image
// ==========================================

async function uploadProductImage(
    file
) {
    if (!file) return null;

    const optimizedImage =
        await exportEditedProductImage();

    if (
        !optimizedImage ||
        !(
            optimizedImage instanceof
            Blob
        )
    ) {
        throw new Error(
            "تعذر تجهيز الصورة للرفع."
        );
    }

    if (
        optimizedImage.size >
        3 * 1024 * 1024
    ) {
        throw new Error(
            "حجم الصورة بعد التجهيز أكبر من 3 ميغابايت."
        );
    }

    const filePath =
        `${crypto.randomUUID()}.webp`;

    const {
        error: uploadError
    } =
        await supabaseClient.storage
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

    const { data } =
        supabaseClient.storage
            .from(
                "product-images"
            )
            .getPublicUrl(
                filePath
            );

    const url =
        String(
            data?.publicUrl ??
                ""
        ).trim();

    if (
        !url ||
        !isSafeImageUrl(url)
    ) {
        await supabaseClient.storage
            .from(
                "product-images"
            )
            .remove([
                filePath
            ])
            .catch(error =>
                console.warn(
                    error
                )
            );

        throw new Error(
            "تعذر الحصول على رابط الصورة."
        );
    }

    return {
        path:
            filePath,

        url
    };
}

function getProductImagePath(
    imageUrl
) {
    if (!imageUrl) {
        return null;
    }

    const marker =
        "/storage/v1/object/public/product-images/";

    try {
        const parsedUrl =
            new URL(
                String(
                    imageUrl
                )
            );

        const index =
            parsedUrl.pathname.indexOf(
                marker
            );

        if (index === -1) {
            return null;
        }

        const encodedPath =
            parsedUrl.pathname.slice(
                index +
                    marker.length
            );

        return encodedPath
            ? decodeURIComponent(
                  encodedPath
              )
            : null;
    } catch {
        return null;
    }
}

// ==========================================
// Save Product
// ==========================================

async function saveProduct(
    event
) {
    event.preventDefault();

    if (isProductSaving) {
        return;
    }

    clearFormMessage();

    const idElement =
        document.getElementById(
            "productId"
        );

    const idValue =
        String(
            idElement?.value ??
                ""
        ).trim();

    const isEdit =
        Boolean(idValue);

    /*
     * في حالة تعديل منتج موجود،
     * يجب أن تكون Variants قد حُمّلت بنجاح.
     */
    if (
        isEdit &&
        !productVariantsLoaded
    ) {
        showFormMessage(
            "لا يمكن حفظ المنتج قبل اكتمال تحميل خياراته. يرجى الانتظار أو إعادة فتح المنتج.",
            "error"
        );

        return;
    }

    const name =
        String(
            document.getElementById(
                "productName"
            )?.value ??
                ""
        ).trim();

    const productCode =
        String(
            document.getElementById(
                "productCode"
            )?.value ??
                ""
        ).trim();

    const price =
        Number(
            document.getElementById(
                "productPrice"
            )?.value
        );

    const quantity =
        Number(
            document.getElementById(
                "productQuantity"
            )?.value
        );

    const purchaseCost =
        Number(
            document.getElementById(
                "productPurchaseCost"
            )?.value
        );

    const categoryId =
        Number(
            document.getElementById(
                "productCategory"
            )?.value
        );

    const target =
        String(
            document.getElementById(
                "productTarget"
            )?.value ??
                ""
        ).trim();

    const description =
        String(
            document.getElementById(
                "productDescription"
            )?.value ??
                ""
        ).trim();

    const imageFile =
        document.getElementById(
            "productImageFile"
        )?.files?.[0] ||
        null;

    const saveButton =
        document.getElementById(
            "saveProductButton"
        );

    // ======================================
    // Validations
    // ======================================

    if (!name) {
        showFormMessage(
            "يرجى إدخال اسم المنتج.",
            "error"
        );

        return;
    }

    if (!productCode) {
        showFormMessage(
            "يرجى إدخال كود المنتج.",
            "error"
        );

        return;
    }

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {
        showFormMessage(
            "سعر المنتج غير صالح.",
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
        showFormMessage(
            "الكمية غير صالحة.",
            "error"
        );

        return;
    }

    if (
        !Number.isFinite(
            purchaseCost
        ) ||
        purchaseCost <= 0
    ) {
        showFormMessage(
            "تكلفة الشراء يجب أن تكون أكبر من صفر.",
            "error"
        );

        return;
    }

    if (
        !Number.isInteger(
            categoryId
        ) ||
        categoryId <= 0
    ) {
        showFormMessage(
            "يرجى اختيار التصنيف.",
            "error"
        );

        return;
    }

    /*
     * إذا كانت Variants مفعلة وتم تعديلها،
     * يجب التحقق منها قبل أي كتابة إلى قاعدة البيانات.
     */
    if (
        productVariantsDirty &&
        productVariantsState.enabled
    ) {
        const variantValidation =
            validateProductVariants();

        if (
            !variantValidation.valid
        ) {
            showFormMessage(
                variantValidation.message,
                "error"
            );

            return;
        }
    }

    isProductSaving =
        true;

    if (saveButton) {
        saveButton.disabled =
            true;

        saveButton.dataset.originalText =
            saveButton.textContent;

        saveButton.textContent =
            "جاري الحفظ...";
    }

    let uploadedImagePath =
        null;

    try {
        const oldProduct =
            isEdit
                ? adminProducts.find(
                      item =>
                          String(
                              item.id
                          ) ===
                          idValue
                  )
                : null;

        const oldProductData =
            oldProduct
                ? {
                      name:
                          oldProduct.name,

                      description:
                          oldProduct.description,

                      price:
                          oldProduct.price,

                      quantity:
                          oldProduct.quantity,

                      main_image:
                          oldProduct.main_image,

                      target:
                          oldProduct.target,

                      product_code:
                          oldProduct.product_code,

                      category_id:
                          oldProduct.category_id
                  }
                : null;

        const oldPurchaseCost =
            isEdit
                ? adminProductCosts[
                      idValue
                  ]
                : undefined;

        const oldImageUrl =
            String(
                oldProduct?.main_image ??
                    ""
            ).trim();

        let mainImage =
            oldImageUrl ||
            null;

        // ==================================
        // Upload New Image First
        // ==================================

        if (imageFile) {
            const uploaded =
                await uploadProductImage(
                    imageFile
                );

            uploadedImagePath =
                uploaded.path;

            mainImage =
                uploaded.url;
        }

        const productData = {
            name,

            description,

            price,

            quantity,

            main_image:
                mainImage,

            target,

            product_code:
                productCode,

            category_id:
                categoryId
        };

        let savedProductId =
            idValue;

        // ==================================
        // Insert
        // ==================================

        if (!isEdit) {
            const {
                data:
                    insertedProduct,
                error:
                    insertError
            } =
                await supabaseClient
                    .from(
                        "products"
                    )
                    .insert(
                        productData
                    )
                    .select(
                        "id"
                    )
                    .single();

            if (insertError) {
                throw insertError;
            }

            if (
                !insertedProduct ||
                insertedProduct.id ===
                    null ||
                insertedProduct.id ===
                    undefined
            ) {
                throw new Error(
                    "تعذر الحصول على رقم المنتج الجديد."
                );
            }

            savedProductId =
                String(
                    insertedProduct.id
                );

            const {
                error:
                    costError
            } =
                await supabaseClient
                    .from(
                        "product_costs"
                    )
                    .insert({
                        product_id:
                            insertedProduct.id,

                        purchase_cost:
                            purchaseCost
                    });

            if (costError) {
                /*
                 * Rollback:
                 * إذا فشل حفظ تكلفة الشراء بعد
                 * إنشاء المنتج، نحذف المنتج.
                 */
                try {
                    const {
                        error:
                            rollbackError
                    } =
                        await supabaseClient
                            .from(
                                "products"
                            )
                            .delete()
                            .eq(
                                "id",
                                insertedProduct.id
                            );

                    if (
                        rollbackError
                    ) {
                        console.error(
                            "Rollback failed:",
                            rollbackError
                        );
                    }
                } catch (
                    rollbackException
                ) {
                    console.error(
                        "Rollback failed:",
                        rollbackException
                    );
                }

                throw costError;
            }
        }

        // ==================================
        // Update
        // ==================================

        else {
            const {
                error:
                    updateError
            } =
                await supabaseClient
                    .from(
                        "products"
                    )
                    .update(
                        productData
                    )
                    .eq(
                        "id",
                        idValue
                    );

            if (updateError) {
                throw updateError;
            }

            const {
                error:
                    costError
            } =
                await supabaseClient
                    .from(
                        "product_costs"
                    )
                    .upsert(
                        {
                            product_id:
                                Number(
                                    idValue
                                ),

                            purchase_cost:
                                purchaseCost
                        },
                        {
                            onConflict:
                                "product_id"
                        }
                    );

            if (costError) {
                /*
                 * إذا فشل تحديث تكلفة الشراء،
                 * نحاول إعادة بيانات المنتج الأساسية
                 * إلى حالتها السابقة.
                 */
                try {
                    const {
                        error:
                            productRestoreError
                    } =
                        await supabaseClient
                            .from(
                                "products"
                            )
                            .update(
                                oldProductData
                            )
                            .eq(
                                "id",
                                idValue
                            );

                    if (
                        productRestoreError
                    ) {
                        console.error(
                            "Product restore failed:",
                            productRestoreError
                        );
                    }
                } catch (
                    restoreException
                ) {
                    console.error(
                        "Product restore failed:",
                        restoreException
                    );
                }

                if (
                    oldPurchaseCost !==
                    undefined
                ) {
                    try {
                        const {
                            error:
                                costRestoreError
                        } =
                            await supabaseClient
                                .from(
                                    "product_costs"
                                )
                                .upsert(
                                    {
                                        product_id:
                                            Number(
                                                idValue
                                            ),

                                        purchase_cost:
                                            oldPurchaseCost
                                    },
                                    {
                                        onConflict:
                                            "product_id"
                                    }
                                );

                        if (
                            costRestoreError
                        ) {
                            console.error(
                                "Cost restore failed:",
                                costRestoreError
                            );
                        }
                    } catch (
                        costRestoreException
                    ) {
                        console.error(
                            "Cost restore failed:",
                            costRestoreException
                        );
                    }
                }

                throw costError;
            }
        }

        // ==================================
        // Save Variants
        // ==================================

        /*
         * لا نرسل RPC إلا إذا حدث تغيير فعلي
         * في نظام Variants.
         */
        if (
            productVariantsDirty
        ) {
            try {
                if (
                    productVariantsState
                        .enabled
                ) {
                    await saveProductVariants(
                        savedProductId
                    );
                } else {
                    /*
                     * enabled=false مع dirty=true
                     * يعني أن المستخدم اختار تعطيل
                     * نظام الخيارات.
                     *
                     * إرسال مصفوفتين فارغتين يجعل
                     * RPC يحذف مجموعات/Variants
                     * الخاصة بهذا المنتج بشكل ذري.
                     */
                    const {
                        error:
                            disableVariantsError
                    } =
                        await supabaseClient.rpc(
                            "admin_save_product_variants",
                            {
                                p_product_id:
                                    Number(
                                        savedProductId
                                    ),

                                p_groups: [],

                                p_variants: []
                            }
                        );

                    if (
                        disableVariantsError
                    ) {
                        throw disableVariantsError;
                    }
                }
            } catch (
                variantError
            ) {
                /*
                 * في المنتج الجديد:
                 * حذف المنتج يؤدي إلى حذف
                 * كل بيانات Variants التابعة
                 * له عبر ON DELETE CASCADE.
                 */
                if (!isEdit) {
                    try {
                        const {
                            error:
                                rollbackError
                        } =
                            await supabaseClient
                                .from(
                                    "products"
                                )
                                .delete()
                                .eq(
                                    "id",
                                    savedProductId
                                );

                        if (
                            rollbackError
                        ) {
                            console.error(
                                "Variant rollback delete failed:",
                                rollbackError
                            );
                        }
                    } catch (
                        rollbackException
                    ) {
                        console.error(
                            "Variant rollback delete failed:",
                            rollbackException
                        );
                    }
                } else {
                    /*
                     * استعادة بيانات المنتج الأساسية
                     * إذا فشل حفظ Variants بعد تحديثها.
                     *
                     * RPC الخاص بالـVariants مصمم ليكون
                     * ذريًا، لذلك لا نعيد بناء Variants
                     * يدويًا هنا.
                     */
                    if (
                        oldProductData
                    ) {
                        try {
                            const {
                                error:
                                    productRestoreError
                            } =
                                await supabaseClient
                                    .from(
                                        "products"
                                    )
                                    .update(
                                        oldProductData
                                    )
                                    .eq(
                                        "id",
                                        idValue
                                    );

                            if (
                                productRestoreError
                            ) {
                                console.error(
                                    "Product restore failed:",
                                    productRestoreError
                                );
                            }
                        } catch (
                            restoreException
                        ) {
                            console.error(
                                "Product restore failed:",
                                restoreException
                            );
                        }
                    }

                    if (
                        oldPurchaseCost !==
                            undefined &&
                        oldPurchaseCost !==
                            null
                    ) {
                        try {
                            const {
                                error:
                                    costRestoreError
                            } =
                                await supabaseClient
                                    .from(
                                        "product_costs"
                                    )
                                    .upsert(
                                        {
                                            product_id:
                                                Number(
                                                    idValue
                                                ),

                                            purchase_cost:
                                                oldPurchaseCost
                                        },
                                        {
                                            onConflict:
                                                "product_id"
                                        }
                                    );

                            if (
                                costRestoreError
                            ) {
                                console.error(
                                    "Cost restore failed:",
                                    costRestoreError
                                );
                            }
                        } catch (
                            costRestoreException
                        ) {
                            console.error(
                                "Cost restore failed:",
                                costRestoreException
                            );
                        }
                    }
                }

                throw variantError;
            }
        }

   // ==================================
        // Remove Old Image After All Success
        // ==================================

        if (
            imageFile &&
            uploadedImagePath &&
            oldImageUrl &&
            uploadedImagePath !== getProductImagePath(oldImageUrl)
        ) {
            const oldImagePath = getProductImagePath(oldImageUrl);
            
            if (oldImagePath) {
                try {
                    await supabaseClient
                        .storage
                        .from("product-images")
                        .remove([oldImagePath]);
                } catch (cleanupError) {
                    console.warn("Old image cleanup failed:", cleanupError);
                }
            }
        }

        productVariantsDirty = false;
        
        // 🟢 السماح للنافذة بالإغلاق عبر فك قفل عملية الحفظ
        isProductSaving = false;

        closeProductModalWindow();

        await loadAdminProducts();

        showAdminProductToast(
            isEdit
                ? "تم تعديل المنتج بنجاح."
                : "تمت إضافة المنتج بنجاح.",
            "success"
        );
    } catch (error) {
        console.error(
            "Save product error:",
            error
        );

        /*
         * إذا تم رفع صورة جديدة ثم فشل
         * أي جزء من عملية الحفظ،
         * نحذف الصورة الجديدة.
         */
        if (
            uploadedImagePath
        ) {
            await supabaseClient
                .storage
                .from(
                    "product-images"
                )
                .remove([
                    uploadedImagePath
                ])
                .catch(
                    cleanupError =>
                        console.warn(
                            "New image cleanup failed:",
                            cleanupError
                        )
                );
        }

        const code =
            String(
                error?.code ||
                    ""
            );

        const errorMessage =
            String(
                error?.message ||
                    ""
            );

        if (
            code === "23505" &&
            /sku/i.test(
                errorMessage
            )
        ) {
            showFormMessage(
                "SKU مستخدم مسبقاً. يرجى اختيار SKU آخر.",
                "error"
            );
        } else if (
            code === "23505"
        ) {
            showFormMessage(
                "كود المنتج أو إحدى قيم البيانات مستخدمة مسبقاً. يرجى مراجعة البيانات.",
                "error"
            );
        } else if (
            code === "42501"
        ) {
            showFormMessage(
                "لا توجد صلاحية كافية لتنفيذ هذه العملية.",
                "error"
            );
        } else {
            showFormMessage(
                error.message ||
                    "تعذر حفظ المنتج.",
                "error"
            );
        }
    } finally {
        isProductSaving =
            false;

        if (saveButton) {
            saveButton.disabled =
                false;

            saveButton.textContent =
                saveButton.dataset
                    .originalText ||
                "حفظ المنتج";

            updateProductVariantsSaveAvailability();
        }
    }
}

// ==========================================
// Delete Product
// ==========================================

async function deleteProduct(
    id
) {
    if (
        isProductDeleting ||
        isProductSaving
    ) {
        return;
    }

    const product =
        adminProducts.find(
            item =>
                String(
                    item.id
                ) ===
                String(id)
        );

    if (!product) {
        return;
    }

    if (
        !confirm(
            `هل أنت متأكد من حذف المنتج "${product.name ?? ""}"؟`
        )
    ) {
        return;
    }

    isProductDeleting =
        true;

    try {
        const {
            data:
                latestProduct,
            error:
                fetchError
        } =
            await supabaseClient
                .from(
                    "products"
                )
                .select(
                    "main_image"
                )
                .eq(
                    "id",
                    id
                )
                .maybeSingle();

        if (fetchError) {
            throw fetchError;
        }

        const imageUrl =
            String(
                latestProduct?.main_image ??
                    product.main_image ??
                    ""
            ).trim();

        const {
            error:
                deleteError
        } =
            await supabaseClient
                .from(
                    "products"
                )
                .delete()
                .eq(
                    "id",
                    id
                );

        if (deleteError) {
            throw deleteError;
        }

        /*
         * ON DELETE CASCADE في قاعدة البيانات
         * يتولى حذف:
         * - product_costs
         * - option groups
         * - option values
         * - variants
         * - variant costs
         * - variant options
         */

        const imagePath =
            getProductImagePath(
                imageUrl
            );

        if (imagePath) {
            await supabaseClient
                .storage
                .from(
                    "product-images"
                )
                .remove([
                    imagePath
                ])
                .catch(
                    error =>
                        console.warn(
                            "Image cleanup failed:",
                            error
                        )
                );
        }

        /*
         * loadAdminProducts() سيصحح الصفحة تلقائيًا
         * إذا أصبحت الصفحة الحالية خارج النطاق.
         */
        await loadAdminProducts();

        showAdminProductToast(
            "تم حذف المنتج بنجاح.",
            "success"
        );
    } catch (error) {
        console.error(
            "Delete error:",
            error
        );

        const code =
            String(
                error?.code ||
                    ""
            );

        if (
            code === "42501"
        ) {
            showAdminProductToast(
                "لا توجد صلاحية كافية لحذف المنتج.",
                "error"
            );
        } else if (
            code === "23503"
        ) {
            showAdminProductToast(
                "لا يمكن حذف المنتج لوجود بيانات مرتبطة به.",
                "error"
            );
        } else {
            showAdminProductToast(
                "تعذر حذف المنتج.",
                "error"
            );
        }
    } finally {
        isProductDeleting =
            false;
    }
}

// ==========================================
// Form Messages
// ==========================================

function showFormMessage(
    message,
    type = "error"
) {
    const element =
        document.getElementById(
            "productFormMessage"
        );

    if (!element) return;

    element.textContent =
        String(
            message ?? ""
        );

    element.className =
        `admin-form-message ${type}`;
}

function clearFormMessage() {
    const element =
        document.getElementById(
            "productFormMessage"
        );

    if (!element) return;

    element.textContent =
        "";

    element.className =
        "admin-form-message";
}

// ==========================================
// Debounced Server-Side Search
// ==========================================

function setupProductSearch() {
    const searchInput =
        document.getElementById(
            "productSearch"
        );

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        () => {
            const val =
                searchInput.value.trim();

            clearTimeout(
                searchTimeout
            );

            searchTimeout =
                setTimeout(
                    () => {
                        currentSearchTerm =
                            val;

                        currentPage =
                            1;

                        loadAdminProducts();
                    },
                    800
                );
        }
    );
}

// ==========================================
// Events & Navigation
// ==========================================

function setupProductTableActions() {
    const table =
        document.getElementById(
            "adminProductsTable"
        );

    if (!table) {
        return;
    }

    table.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset
                    .action;

            const id =
                button.dataset.id;

            if (!id) {
                return;
            }

            if (
                action ===
                "edit"
            ) {
                openEditProductModal(
                    id
                );
            } else if (
                action ===
                "delete"
            ) {
                deleteProduct(
                    id
                );
            }
        }
    );
}

function setupAdminNavigation() {
    const buttons =
        document.querySelectorAll(
            ".admin-nav-item"
        );

    buttons.forEach(
        button => {
            button.addEventListener(
                "click",
                function () {
                    if (
                        this.id ===
                            "offersButton" ||
                        this.getAttribute(
                            "href"
                        )
                    ) {
                        return;
                    }

                    const sectionName =
                        this.dataset
                            .section;

                    buttons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    this.classList.add(
                        "active"
                    );

                    document
                        .querySelectorAll(
                            ".admin-section"
                        )
                        .forEach(
                            section =>
                                section.classList.remove(
                                    "active"
                                )
                        );

                    const target =
                        document.getElementById(
                            `${sectionName}Section`
                        );

                    if (target) {
                        target.classList.add(
                            "active"
                        );
                    }
                }
            );
        }
    );
}

function updateProductsCountDisplay() {
    const element =
        document.getElementById(
            "productsCount"
        );

    if (element) {
        element.textContent =
            String(
                totalProductsCount
            );
    }
}

function updateCategoriesCountDisplay() {
    const element =
        document.getElementById(
            "categoriesCount"
        );

    if (element) {
        element.textContent =
            String(
                adminCategories.length
            );
    }
}

// ==========================================
// Variant Events
// ==========================================

function setupProductVariantsEvents() {
    const toggle =
        document.getElementById(
            "productVariantsEnabled"
        );

    const addGroupButton =
        document.getElementById(
            "addOptionGroupButton"
        );

    const regenerateButton =
        document.getElementById(
            "regenerateProductVariantsButton"
        );

    if (toggle) {
        toggle.addEventListener(
            "change",
            () => {
                const nextValue =
                    toggle.checked;

                /*
                 * تعطيل نظام Variants لمنتج موجود
                 * عملية مؤثرة لأنها ستحذف النظام
                 * عند الحفظ.
                 */
                if (
                    !nextValue &&
                    (
                        productVariantsState
                            .groups
                            .length >
                            0 ||
                        productVariantsState
                            .variants
                            .length >
                            0
                    )
                ) {
                    const confirmed =
                        confirm(
                            "تعطيل خيارات المنتج سيؤدي إلى حذف مجموعات الخيارات والـVariants المرتبطة بهذا المنتج عند الحفظ. هل تريد المتابعة؟"
                        );

                    if (!confirmed) {
                        toggle.checked =
                            true;

                        return;
                    }
                }

                productVariantsState.enabled =
                    nextValue;

                markProductVariantsDirty();

                if (!nextValue) {
                    productVariantsState.groups =
                        [];

                    productVariantsState.variants =
                        [];

                    setProductVariantsStatus(
                        "سيتم حذف نظام الخيارات عند حفظ المنتج."
                    );
                } else {
                    setProductVariantsStatus(
                        "تم تفعيل خيارات المنتج. أضف المجموعات والقيم ثم حدّث التركيبات."
                    );
                }

                updateProductVariantsToggleUI();
                renderProductOptionGroups();
                renderProductVariantsTable();
            }
        );
    }

    if (addGroupButton) {
        addGroupButton.addEventListener(
            "click",
            () => {
                if (
                    !productVariantsState.enabled
                ) {
                    const toggle =
                        document.getElementById(
                            "productVariantsEnabled"
                        );

                    if (toggle) {
                        toggle.checked =
                            true;
                    }

                    productVariantsState.enabled =
                        true;

                    updateProductVariantsToggleUI();
                }

                productVariantsState.groups.push(
                    {
                        id: null,

                        clientKey:
                            createClientKey(
                                "g"
                            ),

                        name: "",

                        sortOrder:
                            productVariantsState
                                .groups
                                .length,

                        values: []
                    }
                );

                markProductVariantsDirty();

                renderProductOptionGroups();
                renderProductVariantsTable();

                /*
                 * التركيز على آخر input
                 * للمجموعة الجديدة.
                 */
                const groupsContainer =
                    document.getElementById(
                        "productOptionGroups"
                    );

                const inputs =
                    groupsContainer?.querySelectorAll(
                        "input"
                    );

                if (
                    inputs &&
                    inputs.length > 0
                ) {
                    inputs[
                        inputs.length -
                            1
                    ].focus();
                }
            }
        );
    }

    if (regenerateButton) {
        regenerateButton.addEventListener(
            "click",
            () => {
                if (
                    !productVariantsState.enabled
                ) {
                    setProductVariantsStatus(
                        "فعّل خيارات المنتج أولاً.",
                        "error"
                    );

                    return;
                }

                markProductVariantsDirty();

                generateProductVariantCombinations();
            }
        );
    }
}

// ==========================================
// Formatting
// ==========================================

function formatPrice(price) {
    const number =
        Number(price);

    return Number.isFinite(
        number
    )
        ? `${number} $`
        : "0 $";
}

function escapeHtml(value) {
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

// ==========================================
// Modal Events
// ==========================================

function setupModalEvents() {
    const addButton =
        document.getElementById(
            "addProductButton"
        );

    const closeButton =
        document.getElementById(
            "closeProductModal"
        );

    const cancelButton =
        document.getElementById(
            "cancelProductButton"
        );

    const form =
        document.getElementById(
            "productForm"
        );

    if (addButton) {
        addButton.addEventListener(
            "click",
            openAddProductModal
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeProductModalWindow
        );
    }

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            closeProductModalWindow
        );
    }

    if (form) {
        form.addEventListener(
            "submit",
            saveProduct
        );
    }
}

// ==========================================
// Initialization
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        setupProductSearch();

        setupProductTableActions();

        setupAdminNavigation();

        setupModalEvents();

        setupProductImageEditor();

        setupPaginationControls();

        setupProductVariantsEvents();

        await loadAdminCategories();

        await loadAdminProducts();
    }
);