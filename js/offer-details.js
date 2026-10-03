// ==========================================
// AL YOSRA STORE
// OFFER DETAILS
// ==========================================


// ==========================================
// عناصر الصفحة
// ==========================================

const offerDetails =
    document.getElementById(
        "offerDetails"
    );


const offerToast =
    document.getElementById(
        "offerToast"
    );


const offerToastText =
    document.getElementById(
        "offerToastText"
    );


// ==========================================
// قراءة رقم العرض من الرابط
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );


const offerId =
    params.get("id");


// ==========================================
// متغيرات الذاكرة المؤقتة (Caching) لمنع الطلبات الزائدة
// ==========================================

let cachedOfferData = null;


// ==========================================
// لقطة بيانات العرض المحلية للسلة
// ==========================================

const OFFER_CART_SNAPSHOTS_KEY =
    "alYosraOfferCartSnapshots_v1";


function saveOfferCartSnapshot(
    offer,
    quantity
) {

    try {

        const raw =
            localStorage.getItem(
                OFFER_CART_SNAPSHOTS_KEY
            );


        const snapshots =
            raw
                ? JSON.parse(raw)
                : {};


        snapshots[
            `offer_${offer.id}`
        ] = {

            offerId:
                String(offer.id),

            name:
                offer.name || "",

            image:
                offer.image || "",

            price:
                Number(offer.price) || 0,

            quantity:
                Number(offer.quantity) || 0,

            savedAt:
                Date.now()

        };


        localStorage.setItem(
            OFFER_CART_SNAPSHOTS_KEY,
            JSON.stringify(snapshots)
        );


    } catch (error) {

        console.warn(
            "تعذر حفظ بيانات العرض المحلية:",
            error
        );

    }

}


// ==========================================
// رسالة النجاح
// ==========================================

let toastTimer;


function showOfferToast(message) {

    if (!offerToast) {
        return;
    }


    if (offerToastText) {

        offerToastText.textContent =
            message;

    }


    offerToast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                offerToast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


// ==========================================
// أدوات مساعدة
// ==========================================

function escapeHTML(value) {

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


function normalizeId(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    return String(value);

}


// ==========================================
// تحميل Variants الخاصة بعناصر العرض
// ==========================================

async function loadOfferVariants(
    offerItems
) {

    const variantIds = [
        ...new Set(
            offerItems
                .map(
                    item =>
                        normalizeId(
                            item.variant_id
                        )
                )
                .filter(Boolean)
        )
    ];


    if (!variantIds.length) {

        return new Map();

    }


    const {
        data,
        error
    } = await supabaseClient

        .from("product_variants")

        .select(`
            id,
            product_id,
            sku,
            price,
            quantity,
            active,
            product_variant_options (
                option_value_id,
                product_option_values (
                    id,
                    value,
                    option_group_id,
                    product_option_groups (
                        id,
                        name,
                        sort_order
                    )
                )
            )
        `)

        .in(
            "id",
            variantIds
        );


    if (error) {

        throw error;

    }


    const variantMap =
        new Map();


    (data || []).forEach(
        variant => {

            const optionRows =
                Array.isArray(
                    variant.product_variant_options
                )
                    ? variant.product_variant_options
                    : [];


            const options = [];


            optionRows.forEach(
                row => {

                    const optionValue =
                        row.product_option_values;


                    if (!optionValue) {
                        return;
                    }


                    const group =
                        optionValue.product_option_groups;


                    options.push({

                        groupId:
                            optionValue.option_group_id,

                        groupName:
                            group?.name ||
                            "الخيار",

                        groupSortOrder:
                            Number(
                                group?.sort_order
                            ) || 0,

                        valueId:
                            optionValue.id,

                        value:
                            optionValue.value || ""

                    });

                }
            );


            options.sort(
                (a, b) => {

                    if (
                        a.groupSortOrder !==
                        b.groupSortOrder
                    ) {

                        return (
                            a.groupSortOrder -
                            b.groupSortOrder
                        );

                    }


                    return String(
                        a.groupName
                    ).localeCompare(
                        String(
                            b.groupName
                        ),
                        "ar"
                    );

                }
            );


            variantMap.set(
                normalizeId(
                    variant.id
                ),
                {
                    ...variant,
                    options
                }
            );

        }
    );


    return variantMap;

}


function getVariantOptionsSummary(
    variant
) {

    if (
        !variant ||
        !Array.isArray(variant.options) ||
        !variant.options.length
    ) {

        return "";

    }


    return variant.options
        .map(
            option =>
                `${option.groupName}: ${option.value}`
        )
        .join(" • ");

}


function createVariantOptionsHTML(
    variant
) {

    if (
        !variant ||
        !Array.isArray(variant.options) ||
        !variant.options.length
    ) {

        return `

            <div class="offer-variant-no-options">

                <span>
                    خيار المنتج
                </span>

            </div>

        `;

    }


    return `

        <div
            class="offer-variant-options"
            aria-label="خيارات المنتج"
        >

            ${variant.options
                .map(
                    option => `

                        <span
                            class="offer-variant-option"
                        >

                            <span
                                class="offer-variant-option-name"
                            >
                                ${escapeHTML(
                                    option.groupName
                                )}
                            </span>

                            <span
                                class="offer-variant-option-separator"
                            >
                                :
                            </span>

                            <strong
                                class="offer-variant-option-value"
                            >
                                ${escapeHTML(
                                    option.value
                                )}
                            </strong>

                        </span>

                    `
                )
                .join("")}

        </div>

    `;

}


function createOfferVariantRow(
    item,
    variant
) {

    const quantity =
        Number(
            item.quantity
        ) || 0;


    const isLegacy =
        !item.variant_id;


    const inactiveClass =
        variant &&
        variant.active === false
            ? " offer-variant-detail-inactive"
            : "";


    const skuHTML =
        variant?.sku

            ? `

                <span
                    class="offer-variant-detail-sku"
                >
                    SKU:
                    ${escapeHTML(
                        variant.sku
                    )}
                </span>

              `

            : "";


    const inactiveHTML =
        variant &&
        variant.active === false

            ? `

                <span
                    class="offer-variant-detail-status"
                >
                    غير فعال
                </span>

              `

            : "";


    if (isLegacy) {

        return `

            <div
                class="offer-variant-detail-row offer-variant-detail-legacy"
            >

                <div
                    class="offer-variant-detail-main"
                >

                    <div
                        class="offer-variant-detail-heading"
                    >

                        <span
                            class="offer-variant-detail-dot"
                        ></span>

                        <strong>
                            المنتج الأساسي
                        </strong>

                        <span
                            class="offer-variant-detail-status offer-variant-detail-legacy-status"
                        >
                            سجل قديم
                        </span>

                    </div>

                    <span
                        class="offer-variant-detail-legacy-text"
                    >
                        هذا العنصر محفوظ في العرض دون تحديد خيار محدد.
                    </span>

                </div>


                <div
                    class="offer-variant-detail-quantity"
                >

                    <span>
                        الكمية
                    </span>

                    <strong>
                        ${quantity}
                    </strong>

                </div>

            </div>

        `;

    }


    return `

        <div
            class="offer-variant-detail-row${inactiveClass}"
        >

            <div
                class="offer-variant-detail-main"
            >

                <div
                    class="offer-variant-detail-heading"
                >

                    <span
                        class="offer-variant-detail-dot"
                    ></span>

                    <strong>
                        ${getVariantOptionsSummary(variant)
                            ? "الخيار المحدد"
                            : "تفاصيل المنتج"}
                    </strong>

                    ${skuHTML}

                    ${inactiveHTML}

                </div>


                ${createVariantOptionsHTML(
                    variant
                )}

            </div>


            <div
                class="offer-variant-detail-quantity"
            >

                <span>
                    الكمية
                </span>

                <strong>
                    ${quantity}
                </strong>

            </div>

        </div>

    `;

}


function groupOfferItemsByProduct(
    items
) {

    const groups =
        new Map();


    items.forEach(
        item => {

            const product =
                item.products;


            const productId =
                normalizeId(
                    product?.id
                );


            if (!productId) {
                return;
            }


            if (!groups.has(productId)) {

                groups.set(
                    productId,
                    {
                        product,
                        items: []
                    }
                );

            }


            groups
                .get(productId)
                .items
                .push(item);

        }
    );


    return [
        ...groups.values()
    ];

}


function createOfferProductCard(
    group,
    index,
    variantMap
) {

    const product =
        group.product;

    const items =
        group.items;

    const variantItems =
        items.filter(
            item =>
                Boolean(
                    item.variant_id
                )
        );

    const hasVariants =
        variantItems.length > 0;

    const productDescription =
        product?.description;

    const variantRowsHTML =
        items
            .map(
                item => {

                    const variant =
                        item.variant_id
                            ? variantMap.get(
                                normalizeId(
                                    item.variant_id
                                )
                            )
                            : null;

                    return createOfferVariantRow(
                        item,
                        variant
                    );

                }
            )
            .join("");

    const variantCount =
        items.length;

    const quantityLabel =
        variantCount === 1
            ? "تفصيل واحد"
            : `${variantCount} تفاصيل`;

    return `

        <article
            class="offer-detail-product"
        >

            <div
                class="offer-product-number"
            >
                ${String(
                    index + 1
                ).padStart(2, "0")}
            </div>

            <div
                class="offer-product-detail-info"
            >

                ${
                    product?.main_image

                        ? `
                            <div
                                class="offer-product-image-wrap"
                            >
                                <img
                                    src="${escapeHTML(
                                        product.main_image
                                    )}"
                                    alt="${escapeHTML(
                                        product?.name ||
                                        "منتج"
                                    )}"
                                    class="offer-product-detail-image"
                                    loading="lazy"
                                    decoding="async"
                                >
                            </div>
                          `

                        : `
                            <div
                                class="offer-product-image-wrap offer-product-image-empty"
                            >
                                <span>
                                    اليُسرى
                                </span>
                            </div>
                          `
                }

                <div
                    class="offer-product-text"
                >

                    <span
                        class="offer-product-label"
                    >
                        منتج ضمن العرض
                    </span>

                    <strong>
                        ${escapeHTML(
                            product?.name ||
                            "منتج"
                        )}
                    </strong>

                    ${
                        productDescription

                            ? `
                                <p>
                                    ${escapeHTML(
                                        productDescription
                                    )}
                                </p>
                              `

                            : ""
                    }

                </div>

            </div>

            <div
                class="offer-product-quantity"
            >

                <span>
                    ${hasVariants
                        ? quantityLabel
                        : "الكمية"}
                </span>

                <strong>
                    ${
                        hasVariants
                            ? variantCount
                            : (
                                Number(
                                    items[0]?.quantity
                                ) || 0
                            )
                    }
                </strong>

            </div>

            ${
                hasVariants 
                    ? `
                        <div
                            class="offer-product-variants"
                        >
                            <div
                                class="offer-product-variants-header"
                            >
                                <div>
                                    <span
                                        class="offer-product-variants-overline"
                                    >
                                        الخيارات المحددة
                                    </span>
                                    <strong>
                                        تفاصيل هذا المنتج
                                    </strong>
                                </div>
                                <span
                                    class="offer-product-variants-count"
                                >
                                    ${variantCount}${
                                        variantCount === 1
                                            ? "خيار"
                                            : "خيارات"
                                    }
                                </span>
                            </div>
                            <div
                                class="offer-product-variants-scroll"
                            >
                                ${variantRowsHTML}
                            </div>
                        </div>
                      `
                    : ""
            }

        </article>

    `;

}


// ==========================================
// دالة مساعدة لتحديث حالة زر السلة محلياً
// ==========================================

function checkAndUpdateCartButtonState() {

    if (!cachedOfferData) return;

    const cart =
        JSON.parse(
            localStorage.getItem(
                "cart"
            )
        ) || {};

    const cartKey = "offer_" + cachedOfferData.id;
    const currentQuantity = Number(cart[cartKey]) || 0;
    const maxOfferQuantity = Number(cachedOfferData.quantity) || 0;

    const button = document.querySelector(".offer-cart-button");
    if (!button) return;

    if (maxOfferQuantity <= 0 || currentQuantity >= maxOfferQuantity) {
        button.disabled = true;
        button.style.opacity = "0.6";
        button.style.cursor = "not-allowed";
        button.innerHTML = `
            <span class="offer-cart-button-icon">⚠️</span>
            <span>نفدت الكمية المتاحة</span>
        `;
    }

}


// ==========================================
// تحميل تفاصيل العرض
// ==========================================

async function loadOfferDetails() {

    if (!offerId) {

        offerDetails.innerHTML = `

            <div class="offer-details-state">

                <div class="offer-state-icon">
                    !
                </div>

                <h1>
                    العرض غير موجود
                </h1>

                <p>
                    لم يتم العثور على العرض المطلوب.
                </p>

                <a
                    href="offers.html"
                    class="offer-state-button"
                >
                    العودة إلى العروض
                </a>

            </div>

        `;

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("offers")

            .select(`
                id,
                name,
                description,
                price,
                image,
                quantity,
                active,
                offer_items (
                    quantity,
                    variant_id,
                    products (
                        id,
                        name,
                        description,
                        price,
                        main_image
                    )
                )
            `)

            .eq(
                "id",
                offerId
            )

            .eq(
                "active",
                true
            )

            .single();


        if (error) {
            throw error;
        }


        if (!data) {

            offerDetails.innerHTML = `

                <div class="offer-details-state">

                    <div class="offer-state-icon">
                        !
                    </div>

                    <h1>
                        العرض غير موجود
                    </h1>

                    <p>
                        قد يكون العرض انتهى أو لم يعد متاحًا.
                    </p>

                    <a
                        href="offers.html"
                        class="offer-state-button"
                    >
                        استكشاف العروض
                    </a>

                </div>

            `;

            return;

        }

        // تخزين البيانات في الذاكرة المؤقتة لمنع أي طلبات متكررة لاحقة
        cachedOfferData = data;


        const offerItems =
            Array.isArray(
                data.offer_items
            )
                ? data.offer_items
                : [];


        const variantMap =
            await loadOfferVariants(
                offerItems
            );


        const productGroups =
            groupOfferItemsByProduct(
                offerItems
            );


        const productsHTML =
            productGroups

                .map(
                    (group, index) =>
                        createOfferProductCard(
                            group,
                            index,
                            variantMap
                        )
                )

                .join("");


        offerDetails.innerHTML = `

            <article class="offer-details-shell">

                <section
                    class="offer-details-hero"
                >

                    <div
                        class="offer-details-visual"
                    >

                        <div
                            class="offer-visual-frame"
                        >

                            <div
                                class="offer-visual-glow"
                            ></div>


                            ${
                                data.image

                                    ? `

                                        <img
                                            src="${escapeHTML(
                                                data.image
                                            )}"
                                            alt="${escapeHTML(
                                                data.name
                                            )}"
                                            class="offer-detail-image"
                                            fetchpriority="high"
                                            decoding="async"
                                        >

                                      `

                                    : `

                                        <div
                                            class="offer-no-image"
                                        >
                                            <span>
                                                متجر اليُسرى
                                            </span>
                                        </div>

                                      `
                            }


                            <div
                                class="offer-image-badge"
                            >
                                عرض خاص
                            </div>

                        </div>

                    </div>


                    <div
                        class="offer-details-info"
                    >

                        <div
                            class="offer-details-eyebrow"
                        >

                            <span
                                class="offer-eyebrow-line"
                            ></span>

                            <span>
                                عرض متجر اليُسرى
                            </span>

                        </div>


                        <span
                            class="offer-details-label"
                        >
                            عرض مميز
                        </span>


                        <h1>
                            ${escapeHTML(
                                data.name
                            )}
                        </h1>


                        <div
                            class="offer-detail-divider"
                        ></div>


                        <div
                            class="offer-price-area"
                        >

                            <span
                                class="offer-price-label"
                            >
                                سعر العرض
                            </span>


                            <div
                                class="offer-detail-price"
                            >

                                <span
                                    class="offer-price-currency"
                                >
                                    $
                                </span>

                                <span>
                                    ${Number(
                                        data.price
                                    ).toFixed(2)}
                                </span>

                            </div>

                        </div>


                        <button
                            class="offer-cart-button"
                            type="button"
                            data-offer-id="${escapeHTML(
                                data.id
                            )}"
                        >

                            <span
                                class="offer-cart-button-icon"
                            >
                                🛒
                            </span>

                            <span>
                                أضف العرض إلى السلة
                            </span>

                        </button>

                    </div>

                </section>


                ${
                    data.description

                        ? `

                            <section
                                class="offer-description-section"
                            >

                                <div
                                    class="offer-description-heading"
                                >

                                    <div>

                                        <span
                                            class="offer-description-overline"
                                        >
                                            تفاصيل العرض
                                        </span>

                                        <h2>
                                            عن هذا العرض
                                        </h2>

                                    </div>


                                    <span
                                        class="offer-description-mark"
                                    >
                                        DESCRIPTION
                                    </span>

                                </div>


                                <div
                                    class="offer-description-box"
                                >

                                    <div
                                        class="offer-description-scroll"
                                    >

                                        <p>
                                            ${escapeHTML(
                                                data.description
                                            )}
                                        </p>

                                    </div>

                                </div>

                            </section>

                          `

                        : ""
                }


                <div
                    class="offer-details-section-divider"
                >

                    <span></span>

                    <div
                        class="offer-divider-diamond"
                    >
                        ◆
                    </div>

                    <span></span>

                </div>


                <section
                    class="offer-detail-products"
                >

                    <div
                        class="offer-products-heading"
                    >

                        <div>

                            <span
                                class="offer-products-overline"
                            >
                                مكونات العرض
                            </span>

                            <h2>
                                ما الذي يتضمنه هذا العرض؟
                            </h2>

                            <p>
                                منتجات مختارة بعناية ضمن عرض واحد.
                            </p>

                        </div>


                        <div
                            class="offer-products-count"
                        >

                            <strong>
                                ${productGroups.length}
                            </strong>

                            <span>
                                ${
                                    productGroups.length === 1
                                        ? "منتج"
                                        : "منتجات"
                                }
                            </span>

                        </div>

                    </div>


                    <div
                        class="offer-products-list"
                    >

                        ${
                            productsHTML

                                ||

                            `

                                <div
                                    class="offer-products-empty"
                                >
                                    لا توجد منتجات ضمن هذا العرض حاليًا.
                                </div>

                            `
                        }

                    </div>

                </section>


            </article>

        `;

        // فحص وتحديث حالة الزر محلياً بعد اكتمال الرسم
        checkAndUpdateCartButtonState();


    } catch (error) {

        console.error(
            "خطأ في تحميل تفاصيل العرض:",
            error
        );


        offerDetails.innerHTML = `

            <div class="offer-details-state">

                <div class="offer-state-icon">
                    !
                </div>

                <h1>
                    تعذر تحميل العرض
                </h1>

                <p>
                    حدث خطأ أثناء تحميل تفاصيل العرض. يرجى المحاولة مرة أخرى.
                </p>

                <button
                    type="button"
                    class="offer-state-button"
                    onclick="loadOfferDetails()"
                >
                    المحاولة مرة أخرى
                </button>

            </div>

        `;

    }

}


// ==========================================
// إضافة العرض إلى السلة (بأمان تام وتخزين مؤقت)
// ==========================================

document.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(
                ".offer-cart-button"
            );


        if (!button) {
            return;
        }


        const selectedOfferId =
            button.dataset.offerId;


        if (!selectedOfferId) {
            return;
        }


        if (button.disabled) {
            return;
        }


        // قراءة السلة الحالية
        const cart =
            JSON.parse(
                localStorage.getItem(
                    "cart"
                )
            ) || {};


        const cartKey =
            "offer_" +
            selectedOfferId;


        const currentQuantity =
            Number(
                cart[cartKey]
            ) || 0;


        // استخدام البيانات المخزنة محلياً إذا كانت متوفرة ومنع طلب قاعدة البيانات بالكامل عند الوصول للحد الأقصى
        let maxOfferQuantity = 0;
        let offerData = null;

        if (cachedOfferData && String(cachedOfferData.id) === String(selectedOfferId)) {
            offerData = cachedOfferData;
            maxOfferQuantity = Number(offerData.quantity) || 0;
        } else {
            // كاحتياط فقط في حال لم تكن البيانات مخزنة
            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerHTML = `
                <span class="offer-cart-button-icon">…</span>
                <span>جاري التحقق...</span>
            `;

            try {
                const { data, error } = await supabaseClient
                    .from("offers")
                    .select("id, name, image, price, quantity, active")
                    .eq("id", selectedOfferId)
                    .eq("active", true)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("تعذر العثور على بيانات العرض.");

                offerData = data;
                cachedOfferData = data;
                maxOfferQuantity = Number(offerData.quantity) || 0;
            } catch (error) {
                console.error("خطأ أثناء التحقق من مخزون العرض:", error);
                showOfferToast("تعذر التحقق من مخزون العرض حاليًا.");
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }
        }


        // ==================================
        // التحقق المحلي الفوري من المخزون
        // ==================================

        if (maxOfferQuantity <= 0) {
            showOfferToast("هذا العرض غير متوفر حاليًا.");
            button.disabled = true;
            return;
        }


        if (currentQuantity >= maxOfferQuantity) {
            showOfferToast(`لا يمكنك إضافة أكثر من ${maxOfferQuantity} من هذا العرض.`);
            button.disabled = true;
            button.style.opacity = "0.6";
            button.style.cursor = "not-allowed";
            button.innerHTML = `
                <span class="offer-cart-button-icon">⚠️</span>
                <span>نفدت الكمية المتاحة</span>
            `;
            return;
        }


        // ==================================
        // إضافة العرض محلياً
        // ==================================

        cart[cartKey] =
            currentQuantity + 1;


        saveOfferCartSnapshot(
            {
                id:
                    offerData.id,

                name:
                    offerData.name,

                image:
                    offerData.image,

                price:
                    offerData.price,

                quantity:
                    offerData.quantity
            },
            currentQuantity + 1
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


        const remaining =
            maxOfferQuantity -
            (
                currentQuantity +
                1
            );


        if (remaining > 0) {

            showOfferToast(
                `تمت إضافة العرض إلى السلة. يمكنك إضافة ${remaining} عرض إضافي.`
            );

        } else {

            showOfferToast(
                "تمت إضافة العرض إلى السلة."
            );
            // تعطيل الزر فوراً بمجرد الوصول للحد الأقصى في هذه الضغطة
            button.disabled = true;
            button.style.opacity = "0.6";
            button.style.cursor = "not-allowed";
            button.innerHTML = `
                <span class="offer-cart-button-icon">⚠️</span>
                <span>نفدت الكمية المتاحة</span>
            `;

        }

    }
);


// ==========================================
// بدء التحميل
// ==========================================

loadOfferDetails();