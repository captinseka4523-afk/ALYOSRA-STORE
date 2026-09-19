// ==========================================
// AL YOSRA STORE - Admin Products
// ==========================================

let adminProducts = [];
let adminCategories = [];
let adminProductCosts = {};


// ==========================================
// Admin Toast
// ==========================================

let adminProductToastTimer;

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
            document.createElement("div");

        toast.id =
            "adminProductToast";

        document.body.appendChild(
            toast
        );

    }

    toast.textContent =
        message;

    toast.className =
        `admin-product-toast ${type} show`;

    clearTimeout(
        adminProductToastTimer
    );

    adminProductToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


// ==========================================
// Load Products
// ==========================================

async function loadAdminProducts() {

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

    if (loading) {
        loading.hidden = false;
    }

    if (empty) {
        empty.hidden = true;
    }

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("products")
            .select("*")
            .order("id", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        adminProducts =
            data || [];

        await loadAdminProductCosts();

        renderAdminProducts();

        updateProductsCount();

    } catch (error) {

        console.error(
            "Error loading products:",
            error
        );

        if (loading) {

            loading.textContent =
                "حدث خطأ أثناء تحميل المنتجات.";

        }

        showAdminProductToast(
            "حدث خطأ أثناء تحميل المنتجات.",
            "error"
        );

    }

}


// ==========================================
// Load Product Costs
// ==========================================

async function loadAdminProductCosts() {

    const {
        data,
        error
    } = await supabaseClient
        .from("product_costs")
        .select(
            "product_id, purchase_cost"
        );

    if (error) {
        throw error;
    }

    adminProductCosts = {};

    (data || []).forEach(
        cost => {

            adminProductCosts[
                String(cost.product_id)
            ] =
                cost.purchase_cost;

        }
    );

}


// ==========================================
// Load Categories
// ==========================================

async function loadAdminCategories() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("categories")
            .select("id, name")
            .order("id", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        adminCategories =
            data || [];

        renderCategoryOptions();

        updateCategoriesCount();

    } catch (error) {

        console.error(
            "Error loading categories:",
            error
        );

        showAdminProductToast(
            "حدث خطأ أثناء تحميل التصنيفات.",
            "error"
        );

    }

}


// ==========================================
// Render Categories
// ==========================================

function renderCategoryOptions() {

    const select =
        document.getElementById(
            "productCategory"
        );

    if (!select) return;

    select.innerHTML = `
        <option value="">
            اختر التصنيف
        </option>
    `;

    adminCategories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category.id;

            option.textContent =
                category.name;

            select.appendChild(
                option
            );

        }
    );

}


// ==========================================
// Render Products
// ==========================================

function renderAdminProducts(
    searchTerm = ""
) {

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
        loading.hidden = true;
    }

    table.innerHTML = "";

    const search =
        searchTerm
            .trim()
            .toLowerCase();

    const filteredProducts =
        adminProducts.filter(
            product => {

                const name =
                    String(
                        product.name || ""
                    ).toLowerCase();

                const code =
                    String(
                        product.product_code || ""
                    ).toLowerCase();

                return (
                    name.includes(search) ||
                    code.includes(search)
                );

            }
        );

    if (
        filteredProducts.length === 0
    ) {

        if (empty) {
            empty.hidden = false;
        }

        return;

    }

    if (empty) {
        empty.hidden = true;
    }

    filteredProducts.forEach(
        product => {

            const row =
                document.createElement(
                    "tr"
                );

            const image =
                product.main_image ||
                "";

            const quantity =
                Number(
                    product.quantity || 0
                );

            const category =
                adminCategories.find(
                    category =>
                        String(category.id) ===
                        String(product.category_id)
                );

            const categoryName =
                category
                    ? category.name
                    : "بدون تصنيف";

            row.innerHTML = `

                <td>

                    ${
                        image
                        ?
                        `
                        <img
                            class="admin-product-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(
                                product.name || ""
                            )}"
                        >
                        `
                        :
                        `
                        <div
                            class="admin-product-image"
                            style="
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                background:#f3f4f6;
                            "
                        >
                            —
                        </div>
                        `
                    }

                </td>

                <td>

                    <strong>
                        ${escapeHtml(
                            product.name || ""
                        )}
                    </strong>

                </td>

                <td>

                    ${formatPrice(
                        product.price
                    )}

                </td>

                <td>

                    <span
                        class="${
                            quantity <= 0
                                ? "stock-empty"
                                : "stock-available"
                        }"
                    >
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
                        product.product_code || ""
                    )}

                </td>

                <td>

                    <div class="admin-actions">

                        <button
                            type="button"
                            class="admin-edit-button"
                            data-action="edit"
                            data-id="${product.id}"
                        >
                            تعديل
                        </button>

                        <button
                            type="button"
                            class="admin-delete-button"
                            data-action="delete"
                            data-id="${product.id}"
                        >
                            حذف
                        </button>

                    </div>

                </td>

            `;

            table.appendChild(
                row
            );

        }
    );

}


// ==========================================
// Product Image Editor State
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


// ==========================================
// Product Image Editor Elements
// ==========================================

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


// ==========================================
// Reset Product Image Editor State
// ==========================================

function resetProductImageEditorState() {

    /*
     * إلغاء Object URL الخاص بالصورة المحلية
     * السابقة لمنع بقائها في الذاكرة أو ظهورها
     * عند فتح منتج آخر.
     */

    if (
        productImageEditorState.objectUrl
    ) {

        URL.revokeObjectURL(
            productImageEditorState.objectUrl
        );

    }

    productImageEditorState.file =
        null;

    productImageEditorState.image =
        null;

    productImageEditorState.objectUrl =
        null;

    productImageEditorState.scale =
        1;

    productImageEditorState.offsetX =
        0;

    productImageEditorState.offsetY =
        0;

    productImageEditorState.baseScale =
        1;

    productImageEditorState.dragging =
        false;

    productImageEditorState.startX =
        0;

    productImageEditorState.startY =
        0;

    productImageEditorState.startOffsetX =
        0;

    productImageEditorState.startOffsetY =
        0;

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

        elements.zoom.value =
            "1";

        elements.zoom.min =
            "0.05";

        elements.zoom.max =
            "3";

        elements.zoom.step =
            "0.01";

    }

}


// ==========================================
// Reset Complete Product Image State
// ==========================================

function resetProductImageState() {

    const imageFileInput =
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

    if (imageFileInput) {

        imageFileInput.value =
            "";

    }

    if (
        previewImage &&
        previewImage.dataset.previewUrl
    ) {

        URL.revokeObjectURL(
            previewImage.dataset.previewUrl
        );

        delete previewImage.dataset.previewUrl;

    }

    if (previewImage) {

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

    /*
     * مهم جدًا:
     * تنظيف حالة محرر الصور أيضًا.
     */
    resetProductImageEditorState();

}


// ==========================================
// Add Product Modal
// ==========================================

function openAddProductModal() {

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

    const id =
        document.getElementById(
            "productId"
        );

    if (!modal) return;

    /*
     * تنظيف كامل قبل فتح نافذة منتج جديد.
     * هذا يمنع انتقال صورة المنتج السابق.
     */
    resetProductImageState();

    if (form) {
        form.reset();
    }

    if (id) {
        id.value = "";
    }

    const purchaseCost =
        document.getElementById(
            "productPurchaseCost"
        );

    if (purchaseCost) {
        purchaseCost.value = "";
    }

    if (title) {
        title.textContent =
            "إضافة منتج";
    }

    clearFormMessage();

    modal.hidden = false;

}


// ==========================================
// Edit Product Modal
// ==========================================

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

    if (!previewContainer || !previewImage) {
        return;
    }

    if (
        previewImage.dataset.previewUrl
    ) {

        URL.revokeObjectURL(
            previewImage.dataset.previewUrl
        );

        delete previewImage.dataset.previewUrl;

    }

    if (!imageUrl) {

        previewImage.removeAttribute(
            "src"
        );

        previewContainer.hidden =
            true;

        if (status && statusText) {

            status.textContent =
                statusText;

        }

        return;

    }

    previewImage.src =
        imageUrl;

    previewContainer.hidden =
        false;

    if (status && statusText) {

        status.textContent =
            statusText;

    }

}


function openEditProductModal(
    id
) {

    const product =
        adminProducts.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!product) {
        return;
    }

    /*
     * تنظيف حالة محرر الصور أولًا.
     * مهم عند الانتقال مباشرة من منتج إلى منتج آخر.
     */
    resetProductImageState();

    document.getElementById(
        "productId"
    ).value =
        product.id;

    document.getElementById(
        "productName"
    ).value =
        product.name || "";

    document.getElementById(
        "productCode"
    ).value =
        product.product_code || "";

    document.getElementById(
        "productPrice"
    ).value =
        product.price ?? "";

    document.getElementById(
        "productQuantity"
    ).value =
        product.quantity ?? 0;

    document.getElementById(
        "productCategory"
    ).value =
        product.category_id || "";

    document.getElementById(
        "productTarget"
    ).value =
        product.target || "";

    document.getElementById(
        "productDescription"
    ).value =
        product.description || "";

    const imageFileInput =
        document.getElementById(
            "productImageFile"
        );

    if (imageFileInput) {
        imageFileInput.value = "";
    }

    setProductImagePreview(
        product.main_image || null,
        product.main_image
            ? "الصورة الحالية للمنتج. اختر صورة جديدة لاستبدالها."
            : "لا توجد صورة حالية لهذا المنتج."
    );

    const purchaseCost =
        document.getElementById(
            "productPurchaseCost"
        );

    if (purchaseCost) {

        const currentCost =
            adminProductCosts[
                String(product.id)
            ];

        purchaseCost.value =
            currentCost ?? "";

    }

    document.getElementById(
        "productModalTitle"
    ).textContent =
        "تعديل المنتج";

    clearFormMessage();

    document.getElementById(
        "productModal"
    ).hidden = false;

}


// ==========================================
// Close Modal
// ==========================================

function closeProductModalWindow() {

    const modal =
        document.getElementById(
            "productModal"
        );

    if (modal) {

        modal.hidden =
            true;

    }

    /*
     * تنظيف كامل لمحرر الصور عند الإغلاق.
     */
    resetProductImageState();

    clearFormMessage();

}


// ==========================================
// Product Image Editor
// ==========================================

function resetProductImageEditor() {

    const elements =
        getProductImageEditorElements();

    productImageEditorState.scale =
        productImageEditorState.baseScale || 1;

    productImageEditorState.offsetX =
        0;

    productImageEditorState.offsetY =
        0;

    if (elements.zoom) {

        elements.zoom.value =
            productImageEditorState.scale;

    }

    updateProductImageEditor();

}


function updateProductImageEditor() {

    const elements =
        getProductImageEditorElements();

    if (
        !elements.image ||
        !productImageEditorState.image
    ) {
        return;
    }

    const scale =
        productImageEditorState.scale;

    elements.image.style.transform =
        `
        translate(
            calc(-50% + ${productImageEditorState.offsetX}px),
            calc(-50% + ${productImageEditorState.offsetY}px)
        )
        scale(${scale})
        `;

}


function setupProductImageEditor() {

    const elements =
        getProductImageEditorElements();

    if (!elements.stage) {
        return;
    }

    // ======================================
    // Dragging
    // ======================================

    elements.stage.addEventListener(
        "pointerdown",
        event => {

            if (
                !productImageEditorState.image
            ) {
                return;
            }

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

            elements.stage.setPointerCapture(
                event.pointerId
            );

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

            const deltaX =
                event.clientX -
                productImageEditorState.startX;

            const deltaY =
                event.clientY -
                productImageEditorState.startY;

            productImageEditorState.offsetX =
                productImageEditorState.startOffsetX +
                deltaX;

            productImageEditorState.offsetY =
                productImageEditorState.startOffsetY +
                deltaY;

            updateProductImageEditor();

        }
    );

    elements.stage.addEventListener(
        "pointerup",
        event => {

            productImageEditorState.dragging =
                false;

            try {

                elements.stage.releasePointerCapture(
                    event.pointerId
                );

            } catch {}

        }
    );

    elements.stage.addEventListener(
        "pointercancel",
        event => {

            productImageEditorState.dragging =
                false;

            try {

                elements.stage.releasePointerCapture(
                    event.pointerId
                );

            } catch {}

        }
    );

    // ======================================
    // Zoom
    // ======================================

    if (elements.zoom) {

        elements.zoom.addEventListener(
            "input",
            function() {

                productImageEditorState.scale =
                    Number(this.value);

                updateProductImageEditor();

            }
        );

    }

    // ======================================
    // Reset
    // ======================================

    if (elements.reset) {

        elements.reset.addEventListener(
            "click",
            resetProductImageEditor
        );

    }

}


// ==========================================
// Load Image Into Editor
// ==========================================

async function loadProductImageIntoEditor(file) {

    const elements =
        getProductImageEditorElements();

    if (
        !elements.editor ||
        !elements.stage ||
        !elements.image
    ) {
        return;
    }


    // ======================================
    // تنظيف الصورة المحلية السابقة
    // ======================================

    if (
        productImageEditorState.objectUrl
    ) {

        URL.revokeObjectURL(
            productImageEditorState.objectUrl
        );

    }


    productImageEditorState.file =
        null;

    productImageEditorState.image =
        null;

    productImageEditorState.objectUrl =
        null;


    // ======================================
    // إنشاء Object URL للصورة الجديدة
    // ======================================

    const objectUrl =
        URL.createObjectURL(file);


    productImageEditorState.objectUrl =
        objectUrl;


    const image =
        new Image();


    await new Promise(
        (resolve, reject) => {

            image.onload =
                resolve;

            image.onerror =
                reject;

            image.src =
                objectUrl;

        }
    );


    // ======================================
    // حفظ الصورة في حالة المحرر
    // ======================================

    productImageEditorState.file =
        file;

    productImageEditorState.image =
        image;


    elements.image.src =
        objectUrl;


    // ======================================
    // مهم جدًا:
    // إظهار المحرر قبل قياس الـ stage
    // ======================================

    elements.editor.hidden =
        false;


    // ======================================
    // الآن يمكن الحصول على الحجم الحقيقي
    // ======================================

    const stageWidth =
        elements.stage.clientWidth;

    const stageHeight =
        elements.stage.clientHeight;


    if (
        stageWidth <= 0 ||
        stageHeight <= 0
    ) {

        throw new Error(
            "تعذر تحديد حجم محرر الصورة."
        );

    }


    // ======================================
    // حساب الحجم الابتدائي
    // بحيث تملأ الصورة المربع
    // دون تشويه أبعادها
    // ======================================

    const scaleX =
        stageWidth /
        image.naturalWidth;

    const scaleY =
        stageHeight /
        image.naturalHeight;


    const baseScale =
        Math.max(
            scaleX,
            scaleY
        );


    productImageEditorState.baseScale =
        baseScale;

    productImageEditorState.scale =
        baseScale;

    productImageEditorState.offsetX =
        0;

    productImageEditorState.offsetY =
        0;

    productImageEditorState.dragging =
        false;


    // ======================================
    // إعداد شريط التحكم بالحجم
    // ======================================

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

        const step =
            Math.max(
                0.001,
                baseScale / 100
            );


        elements.zoom.min =
            String(minZoom);

        elements.zoom.max =
            String(maxZoom);

        elements.zoom.step =
            String(step);

        elements.zoom.value =
            String(baseScale);

    }


    // ======================================
    // عرض الصورة
    // ======================================

    updateProductImageEditor();

}


async function prepareProductImage(
    file
) {

    if (!file) {
        return null;
    }

    if (!file.type.startsWith("image/")) {

        throw new Error(
            "الملف المحدد ليس صورة."
        );

    }

    const image =
        await createImageBitmap(file);

    try {

        const width =
            image.width;

        const height =
            image.height;

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            width;

        canvas.height =
            height;

        const context =
            canvas.getContext(
                "2d"
            );

        if (!context) {

            throw new Error(
                "تعذر تجهيز الصورة."
            );

        }

        context.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        const blob =
            await new Promise(
                (resolve, reject) => {

                    canvas.toBlob(
                        result => {

                            if (result) {

                                resolve(
                                    result
                                );

                            } else {

                                reject(
                                    new Error(
                                        "تعذر تحويل الصورة إلى WebP."
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

    } finally {

        image.close();

    }

}


// ==========================================
// Export Edited Product Image
// ==========================================

async function exportEditedProductImage() {

    const elements =
        getProductImageEditorElements();

    const state =
        productImageEditorState;

    if (
        !elements.stage ||
        !state.image
    ) {

        throw new Error(
            "لم يتم اختيار صورة."
        );

    }

    const outputSize =
        1200;

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        outputSize;

    canvas.height =
        outputSize;

    const context =
        canvas.getContext(
            "2d"
        );

    if (!context) {

        throw new Error(
            "تعذر تجهيز الصورة."
        );

    }

    /*
     * لا نضع أي لون للخلفية.
     *
     * هذا مهم جدًا للحفاظ على
     * الشفافية الموجودة في الصورة.
     */

    context.clearRect(
        0,
        0,
        outputSize,
        outputSize
    );

    const stageWidth =
        elements.stage.clientWidth;

    const stageHeight =
        elements.stage.clientHeight;

    const renderedWidth =
        state.image.naturalWidth *
        state.scale;

    const renderedHeight =
        state.image.naturalHeight *
        state.scale;

    /*
     * تحويل إحداثيات السحب من
     * حجم الشاشة إلى 1200×1200.
     */

    const ratio =
        outputSize /
        stageWidth;

    const drawWidth =
        renderedWidth *
        ratio;

    const drawHeight =
        renderedHeight *
        ratio;

    const drawX =
        (
            stageWidth / 2 +
            state.offsetX
        ) *
        ratio -
        drawWidth / 2;

    const drawY =
        (
            stageHeight / 2 +
            state.offsetY
        ) *
        ratio -
        drawHeight / 2;

    context.drawImage(
        state.image,
        drawX,
        drawY,
        drawWidth,
        drawHeight
    );

    const blob =
        await new Promise(
            (resolve, reject) => {

                canvas.toBlob(
                    result => {

                        if (result) {

                            resolve(
                                result
                            );

                        } else {

                            reject(
                                new Error(
                                    "تعذر استخراج الصورة."
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


// ==========================================
// Product Image File Change
// ==========================================

document
    .getElementById("productImageFile")
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

                showAdminProductToast(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );

                this.value = "";

                resetProductImageState();

                return;

            }

            try {

                if (status) {

                    status.textContent =
                        "جاري تجهيز محرر الصورة...";

                }

                /*
                 * قبل تحميل الصورة الجديدة، يتم
                 * تنظيف أي صورة محلية سابقة.
                 */
                resetProductImageEditorState();

                await loadProductImageIntoEditor(
                    file
                );

                /*
                 * نخفي المعاينة النهائية مؤقتًا.
                 */

                if (previewContainer) {

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
                        "حرّك الصورة داخل المربع أو غيّر حجمها، ثم احفظ المنتج.";

                }

            } catch (error) {

                console.error(
                    "Product image editor error:",
                    error
                );

                this.value = "";

                resetProductImageState();

                showAdminProductToast(
                    "تعذر فتح الصورة للتحرير.",
                    "error"
                );

            }

        }
    );


// ==========================================
// Upload Product Image
// ==========================================

async function uploadProductImage(file) {

    if (!file) {
        return null;
    }

    const optimizedImage =
        await exportEditedProductImage();

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
        await supabaseClient.storage
            .from("product-images")
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
        supabaseClient.storage
            .from("product-images")
            .getPublicUrl(
                filePath
            );

    if (
        !publicUrlData?.publicUrl
    ) {

        await supabaseClient.storage
            .from("product-images")
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


// ==========================================
// Get Product Image Path
// ==========================================

function getProductImagePath(
    imageUrl
) {

    if (!imageUrl) {
        return null;
    }

    try {

        const url =
            new URL(imageUrl);

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
// Save Product
// ==========================================

async function saveProduct(event) {

    event.preventDefault();

    clearFormMessage();

    const id =
        document.getElementById(
            "productId"
        ).value.trim();

    const name =
        document.getElementById(
            "productName"
        ).value.trim();

    const code =
        document.getElementById(
            "productCode"
        ).value.trim();

    const price =
        Number(
            document.getElementById(
                "productPrice"
            ).value
        );

    const quantity =
        Number(
            document.getElementById(
                "productQuantity"
            ).value
        );

    const purchaseCost =
        Number(
            document.getElementById(
                "productPurchaseCost"
            ).value
        );

    const categoryId =
        document.getElementById(
            "productCategory"
        ).value;

    const target =
        document.getElementById(
            "productTarget"
        ).value.trim();

    const imageFile =
        document.getElementById(
            "productImageFile"
        )?.files?.[0] || null;

    const description =
        document.getElementById(
            "productDescription"
        ).value.trim();

    // ======================================
    // Validation
    // ======================================

    if (!name) {

        showFormMessage(
            "يرجى إدخال اسم المنتج.",
            "error"
        );

        return;

    }

    if (!code) {

        showFormMessage(
            "يرجى إدخال Product Code.",
            "error"
        );

        return;

    }

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

        showFormMessage(
            "يرجى إدخال سعر صحيح.",
            "error"
        );

        return;

    }

    if (
        !Number.isInteger(quantity) ||
        quantity < 0
    ) {

        showFormMessage(
            "يرجى إدخال كمية صحيحة.",
            "error"
        );

        return;

    }

    if (
        !Number.isFinite(purchaseCost) ||
        purchaseCost <= 0
    ) {

        showFormMessage(
            "يرجى إدخال تكلفة شراء صحيحة أكبر من صفر.",
            "error"
        );

        return;

    }

    if (!categoryId) {

        showFormMessage(
            "يرجى اختيار التصنيف.",
            "error"
        );

        return;

    }

    const saveButton =
        document.getElementById(
            "saveProductButton"
        );

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "جاري الحفظ...";

    }

    let uploadedImagePath =
        null;

    try {

        // ==================================
        // Existing Product Data
        // ==================================

        const oldProduct =
            id
                ? adminProducts.find(
                    item =>
                        String(item.id) ===
                        String(id)
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
            id
                ? adminProductCosts[
                    String(id)
                ]
                : null;

        const oldImageUrl =
            oldProduct?.main_image ||
            null;

        // ==================================
        // Upload New Image
        // ==================================

        let imageUrl =
            oldImageUrl;

        if (imageFile) {

            const uploadedImage =
                await uploadProductImage(
                    imageFile
                );

            imageUrl =
                uploadedImage.url;

            uploadedImagePath =
                uploadedImage.path;

        }

        // ==================================
        // Product Data
        // ==================================

        const productData = {

            name,

            description:
                description || null,

            price,

            quantity,

            main_image:
                imageUrl,

            target:
                target || null,

            product_code:
                code,

            category_id:
                Number(categoryId)

        };

        // ==================================
        // Add Product
        // ==================================

        if (!id) {

            const {
                data: newProduct,
                error: productError
            } =
                await supabaseClient
                    .from("products")
                    .insert(
                        productData
                    )
                    .select()
                    .single();

            if (productError) {
                throw productError;
            }

            const {
                error: costError
            } =
                await supabaseClient
                    .from("product_costs")
                    .insert({

                        product_id:
                            newProduct.id,

                        purchase_cost:
                            purchaseCost

                    });

            if (costError) {

                console.error(
                    "Product cost save error:",
                    costError
                );

                await supabaseClient
                    .from("products")
                    .delete()
                    .eq(
                        "id",
                        newProduct.id
                    );

                throw costError;

            }

        }

        // ==================================
        // Update Product
        // ==================================

        else {

            const {
                error: productError
            } =
                await supabaseClient
                    .from("products")
                    .update(
                        productData
                    )
                    .eq(
                        "id",
                        id
                    );

            if (productError) {
                throw productError;
            }

            const {
                error: costError
            } =
                await supabaseClient
                    .from("product_costs")
                    .upsert(
                        {
                            product_id:
                                Number(id),

                            purchase_cost:
                                purchaseCost
                        },
                        {
                            onConflict:
                                "product_id"
                        }
                    );

            if (costError) {

                console.error(
                    "Product cost update error:",
                    costError
                );

                if (oldProductData) {

                    await supabaseClient
                        .from("products")
                        .update(
                            oldProductData
                        )
                        .eq(
                            "id",
                            id
                        );

                }

                if (
                    oldPurchaseCost !==
                        undefined &&
                    oldPurchaseCost !==
                        null
                ) {

                    await supabaseClient
                        .from("product_costs")
                        .upsert(
                            {
                                product_id:
                                    Number(id),

                                purchase_cost:
                                    oldPurchaseCost
                            },
                            {
                                onConflict:
                                    "product_id"
                            }
                        );

                }

                throw costError;

            }

        }

        // ==================================
        // Delete Old Image After Successful Save
        // ==================================

        if (
            imageFile &&
            oldImageUrl &&
            uploadedImagePath
        ) {

            try {

                const oldImagePath =
                    getProductImagePath(
                        oldImageUrl
                    );

                if (oldImagePath) {

                    await supabaseClient.storage
                        .from("product-images")
                        .remove([
                            oldImagePath
                        ]);

                }

            } catch (
                imageDeleteError
            ) {

                console.warn(
                    "Old product image could not be deleted:",
                    imageDeleteError
                );

            }

        }

        closeProductModalWindow();

        await loadAdminProducts();

        showAdminProductToast(
            id
                ? "تم تعديل المنتج وتكلفة الشراء بنجاح."
                : "تمت إضافة المنتج وتكلفة الشراء بنجاح.",
            "success"
        );

    } catch (error) {

        console.error(
            "Save product error:",
            error
        );

        // ==================================
        // Cleanup Newly Uploaded Image
        // ==================================

        if (uploadedImagePath) {

            try {

                await supabaseClient.storage
                    .from("product-images")
                    .remove([
                        uploadedImagePath
                    ]);

            } catch (
                cleanupError
            ) {

                console.warn(
                    "Uploaded image cleanup failed:",
                    cleanupError
                );

            }

        }

        if (
            error.code ===
            "23505"
        ) {

            showFormMessage(
                "Product Code مستخدم مسبقًا. يجب اختيار كود مختلف.",
                "error"
            );

        }

        else if (
            error.code ===
            "42501"
        ) {

            showFormMessage(
                "ليس لديك صلاحية لتنفيذ هذه العملية.",
                "error"
            );

        }

        else {

            showFormMessage(
                error.message ||
                "حدث خطأ أثناء حفظ المنتج وتكلفة الشراء.",
                "error"
            );

        }

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "حفظ المنتج";

        }

    }

}


// ==========================================
// Delete Product
// ==========================================

async function deleteProduct(
    id
) {

    const product =
        adminProducts.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!product) {
        return;
    }

    const confirmed =
        confirm(
            `هل أنت متأكد من حذف المنتج "${product.name}"؟`
        );

    if (!confirmed) {
        return;
    }

    try {

        const {
            data: productToDelete,
            error: productFetchError
        } =
            await supabaseClient
                .from("products")
                .select(
                    "main_image"
                )
                .eq(
                    "id",
                    id
                )
                .single();

        if (productFetchError) {
            throw productFetchError;
        }

        const {
            error
        } =
            await supabaseClient
                .from("products")
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        // حذف صورة المنتج القديمة من Storage
        const oldImagePath =
            getProductImagePath(
                productToDelete?.main_image
            );

        if (oldImagePath) {

            const {
                error: imageDeleteError
            } =
                await supabaseClient.storage
                    .from("product-images")
                    .remove([
                        oldImagePath
                    ]);

            if (imageDeleteError) {

                console.error(
                    "Product image delete error:",
                    imageDeleteError
                );

            }

        }

        await loadAdminProducts();

        showAdminProductToast(
            "تم حذف المنتج بنجاح.",
            "success"
        );

    } catch (error) {

        console.error(
            "Delete product error:",
            error
        );

        if (
            error.code ===
            "42501"
        ) {

            showAdminProductToast(
                "ليس لديك صلاحية لحذف المنتجات.",
                "error"
            );

        }

        else {

            showAdminProductToast(
                "تعذر حذف المنتج.",
                "error"
            );

        }

    }

}


// ==========================================
// Form Messages
// ==========================================

function showFormMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "productFormMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        `admin-form-message ${type}`;

}


function clearFormMessage() {

    const element =
        document.getElementById(
            "productFormMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        "";

    element.className =
        "admin-form-message";

}


// ==========================================
// Search
// ==========================================

function setupProductSearch() {

    const search =
        document.getElementById(
            "productSearch"
        );

    if (!search) {
        return;
    }

    search.addEventListener(
        "input",
        function() {

            renderAdminProducts(
                this.value
            );

        }
    );

}


// ==========================================
// Product Table Actions
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
        function(event) {

            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;

            if (
                action === "edit"
            ) {

                openEditProductModal(
                    id
                );

            }

            if (
                action === "delete"
            ) {

                deleteProduct(
                    id
                );

            }

        }
    );

}


// ==========================================
// Dashboard Navigation
// ==========================================

function setupAdminNavigation() {

    const buttons =
        document.querySelectorAll(
            ".admin-nav-item"
        );

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    const sectionName =
                        this.dataset.section;

                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );

                    this.classList.add(
                        "active"
                    );

                    document
                        .querySelectorAll(
                            ".admin-section"
                        )
                        .forEach(
                            section => {

                                section.classList.remove(
                                    "active"
                                );

                            }
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


// ==========================================
// Dashboard Counts
// ==========================================

function updateProductsCount() {

    const element =
        document.getElementById(
            "productsCount"
        );

    if (element) {

        element.textContent =
            adminProducts.length;

    }

}


function updateCategoriesCount() {

    const element =
        document.getElementById(
            "categoriesCount"
        );

    if (element) {

        element.textContent =
            adminCategories.length;

    }

}


// ==========================================
// Formatting
// ==========================================

function formatPrice(
    price
) {

    const number =
        Number(price);

    if (!Number.isFinite(number)) {

        return "0 $";

    }

    return `${number} $`;

}


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


// ==========================================
// Modal Buttons
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
// Start
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        setupProductSearch();

        setupProductTableActions();

        setupAdminNavigation();

        setupModalEvents();

        setupProductImageEditor();

        await loadAdminCategories();

        await loadAdminProducts();

    }
);