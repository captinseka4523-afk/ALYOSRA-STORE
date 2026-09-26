// ==========================================
// AL YOSRA STORE - Admin Products (Production-Grade)
// ==========================================

let adminProducts = [];
let adminCategories = [];
let adminProductCosts = {};

// ==========================================
// State & Protections
// ==========================================
let currentPage = 1;
const ITEMS_PER_PAGE = 50;
let totalProductsCount = 0;
let currentSearchTerm = "";
let searchTimeout = null;

let isProductSaving = false;
let isProductDeleting = false;
let productImageLoadToken = 0;

let adminProductToastTimer;

const ADMIN_PRODUCT_COLUMNS = "id, name, description, price, quantity, main_image, target, product_code, category_id";

// ==========================================
// Toast Notifications
// ==========================================
function showAdminProductToast(message, type = "success") {
    let toast = document.getElementById("adminProductToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "adminProductToast";
        document.body.appendChild(toast);
    }

    clearTimeout(adminProductToastTimer);

    toast.textContent = String(message ?? "");
    toast.className = `admin-product-toast ${type} show`;

    adminProductToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// ==========================================
// Security & Validation Helpers
// ==========================================
function isSafeImageUrl(url) {
    if (!url) return false;

    try {
        const parsed = new URL(String(url), window.location.href);

        return (
            parsed.protocol === "https:" ||
            parsed.protocol === "http:"
        );
    } catch {
        return false;
    }
}

function revokeObjectUrl(url) {
    if (url) {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn("Revoke failed:", e);
        }
    }
}

/*
 * حماية قيمة البحث قبل إدخالها داخل
 * صيغة PostgREST الخاصة بـ .or()
 *
 * لا نغيّر معنى البحث العادي،
 * وإنما نمنع المحارف الخاصة من كسر الفلتر.
 */
function escapePostgrestSearchValue(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/,/g, "\\,")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
}

// ==========================================
// Load Data (Paginated + Debounced Search)
// ==========================================
async function loadAdminProducts() {
    const table = document.getElementById("adminProductsTable");
    const loading = document.getElementById("productsLoading");
    const empty = document.getElementById("productsEmpty");
    const pagination = document.getElementById("productsPagination");

    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    if (pagination) pagination.hidden = true;
    if (table) table.innerHTML = "";

    try {
        let query = supabaseClient
            .from("products")
            .select(ADMIN_PRODUCT_COLUMNS, { count: "exact" })
            .order("id", { ascending: false });

        if (currentSearchTerm) {
            const safeSearchTerm =
                escapePostgrestSearchValue(currentSearchTerm);

            query = query.or(
                `name.ilike.%${safeSearchTerm}%,product_code.ilike.%${safeSearchTerm}%`
            );
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) throw error;

        adminProducts = Array.isArray(data) ? data : [];
        totalProductsCount = count || 0;

        await loadAdminProductCosts();

        renderAdminProducts();
        updatePaginationUI();
        updateProductsCountDisplay();
    } catch (error) {
        console.error("Load products error:", error);

        if (loading) {
            loading.textContent = "حدث خطأ أثناء تحميل المنتجات.";
        }

        showAdminProductToast(
            "تعذر تحميل المنتجات.",
            "error"
        );
    }
}

async function loadAdminProductCosts() {
    if (adminProducts.length === 0) {
        adminProductCosts = {};
        return;
    }

    const productIds = adminProducts.map(product => product.id);

    const { data, error } = await supabaseClient
        .from("product_costs")
        .select("product_id, purchase_cost")
        .in("product_id", productIds);

    if (error) throw error;

    adminProductCosts = {};

    (data || []).forEach(cost => {
        adminProductCosts[String(cost.product_id)] =
            cost.purchase_cost;
    });
}

async function loadAdminCategories() {
    try {
        const { data, error } = await supabaseClient
            .from("categories")
            .select("id, name")
            .order("id", { ascending: true });

        if (error) throw error;

        adminCategories = Array.isArray(data) ? data : [];

        renderCategoryOptions();
        updateCategoriesCountDisplay();
    } catch (error) {
        console.error("Categories error:", error);

        showAdminProductToast(
            "تعذر تحميل التصنيفات.",
            "error"
        );
    }
}

// ==========================================
// Pagination UI
// ==========================================
function setupPaginationControls() {
    const nextBtn = document.getElementById("nextPageBtn");
    const prevBtn = document.getElementById("prevPageBtn");

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            const totalPages =
                Math.ceil(
                    totalProductsCount / ITEMS_PER_PAGE
                ) || 1;

            if (currentPage < totalPages) {
                currentPage++;
                loadAdminProducts();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                loadAdminProducts();
            }
        });
    }
}

function updatePaginationUI() {
    const pagination =
        document.getElementById("productsPagination");

    const nextBtn =
        document.getElementById("nextPageBtn");

    const prevBtn =
        document.getElementById("prevPageBtn");

    const pageNum =
        document.getElementById("currentPageNum");

    const totalPagesSpan =
        document.getElementById("totalPagesNum");

    if (!pagination) return;

    if (totalProductsCount === 0) {
        pagination.hidden = true;
        return;
    }

    pagination.hidden = false;

    const totalPages =
        Math.ceil(
            totalProductsCount / ITEMS_PER_PAGE
        ) || 1;

    if (pageNum) {
        pageNum.textContent = currentPage;
    }

    if (totalPagesSpan) {
        totalPagesSpan.textContent = totalPages;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled =
            currentPage === totalPages;
    }
}

// ==========================================
// Render UI
// ==========================================
function renderCategoryOptions() {
    const select =
        document.getElementById("productCategory");

    if (!select) return;

    select.innerHTML =
        '<option value="">اختر التصنيف</option>';

    const fragment =
        document.createDocumentFragment();

    adminCategories.forEach(category => {
        if (!category) return;

        const option =
            document.createElement("option");

        option.value = String(category.id);
        option.textContent = String(category.name);

        fragment.appendChild(option);
    });

    select.appendChild(fragment);
}

function renderAdminProducts() {
    const table =
        document.getElementById("adminProductsTable");

    const loading =
        document.getElementById("productsLoading");

    const empty =
        document.getElementById("productsEmpty");

    if (!table) return;

    if (loading) {
        loading.hidden = true;
    }

    table.innerHTML = "";

    if (adminProducts.length === 0) {
        if (empty) {
            empty.hidden = false;
        }

        return;
    }

    if (empty) {
        empty.hidden = true;
    }

    const fragment =
        document.createDocumentFragment();

    adminProducts.forEach(product => {
        if (!product) return;

        const row =
            document.createElement("tr");

        const quantity =
            Number(product.quantity || 0);

        const imageUrl =
            String(product.main_image || "").trim();

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

        let imageHTML =
            `<div class="admin-product-image" style="display:flex; align-items:center; justify-content:center; background:#f3f4f6;">—</div>`;

        if (
            imageUrl &&
            isSafeImageUrl(imageUrl)
        ) {
            imageHTML =
                `<img class="admin-product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name || "")}" loading="lazy" decoding="async">`;
        }

        row.innerHTML = `
            <td>${imageHTML}</td>

            <td>
                <strong>
                    ${escapeHtml(product.name || "")}
                </strong>
            </td>

            <td>
                ${formatPrice(product.price)}
            </td>

            <td>
                <span class="${
                    quantity <= 0
                        ? "stock-empty"
                        : "stock-available"
                }">
                    ${quantity}
                </span>
            </td>

            <td>
                ${escapeHtml(categoryName)}
            </td>

            <td>
                ${escapeHtml(product.product_code || "")}
            </td>

            <td>
                <div class="admin-actions">
                    <button
                        type="button"
                        class="admin-edit-button"
                        data-action="edit"
                        data-id="${product.id}">
                        تعديل
                    </button>

                    <button
                        type="button"
                        class="admin-delete-button"
                        data-action="delete"
                        data-id="${product.id}">
                        حذف
                    </button>
                </div>
            </td>
        `;

        fragment.appendChild(row);
    });

    table.appendChild(fragment);
}

// ==========================================
// Image Editor State & Elements
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
        elements.image.removeAttribute("src");
        elements.image.style.transform = "";
    }

    if (elements.editor) {
        elements.editor.hidden = true;
    }

    if (elements.zoom) {
        elements.zoom.min = "0.05";
        elements.zoom.max = "3";
        elements.zoom.step = "0.01";
        elements.zoom.value = "1";
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
        fileInput.value = "";
    }

    if (previewImage) {
        revokeObjectUrl(
            previewImage.dataset.previewUrl
        );

        delete previewImage.dataset.previewUrl;

        previewImage.removeAttribute("src");
    }

    if (previewContainer) {
        previewContainer.hidden = true;
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

    if (!previewContainer || !previewImage) {
        return;
    }

    revokeObjectUrl(
        previewImage.dataset.previewUrl
    );

    delete previewImage.dataset.previewUrl;

    const validUrl =
        imageUrl &&
        isSafeImageUrl(imageUrl);

    if (!validUrl) {
        previewImage.removeAttribute("src");
        previewContainer.hidden = true;

        if (status) {
            status.textContent = statusText;
        }

        return;
    }

    previewImage.src = imageUrl;
    previewContainer.hidden = false;

    if (status) {
        status.textContent = statusText;
    }
}

// ==========================================
// Modals
// ==========================================
function openAddProductModal() {
    if (isProductSaving) return;

    const modal =
        document.getElementById("productModal");

    const form =
        document.getElementById("productForm");

    const title =
        document.getElementById(
            "productModalTitle"
        );

    resetProductImageState();

    if (form) {
        form.reset();
    }

    document.getElementById("productId").value = "";

    document.getElementById(
        "productPurchaseCost"
    ).value = "";

    if (title) {
        title.textContent = "إضافة منتج";
    }

    clearFormMessage();

    if (modal) {
        modal.hidden = false;
    }
}

function openEditProductModal(id) {
    if (isProductSaving) return;

    const product =
        adminProducts.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!product) {
        showAdminProductToast(
            "المنتج غير موجود.",
            "error"
        );

        return;
    }

    resetProductImageState();

    document.getElementById(
        "productId"
    ).value = product.id;

    document.getElementById(
        "productName"
    ).value = product.name || "";

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

    document.getElementById(
        "productPurchaseCost"
    ).value =
        adminProductCosts[
            String(product.id)
        ] ?? "";

    if (product.main_image) {
        setProductImagePreview(
            String(product.main_image),
            "الصورة الحالية للمنتج."
        );
    }

    document.getElementById(
        "productModalTitle"
    ).textContent = "تعديل المنتج";

    clearFormMessage();

    document.getElementById(
        "productModal"
    ).hidden = false;
}

function closeProductModalWindow() {
    if (isProductSaving) return;

    const modal =
        document.getElementById("productModal");

    if (modal) {
        modal.hidden = true;
    }

    resetProductImageState();
    clearFormMessage();
}

// ==========================================
// Image Editor Engine (Smart Crop & Drag)
// ==========================================
function resetProductImageEditor() {
    productImageEditorState.scale =
        productImageEditorState.baseScale || 1;

    productImageEditorState.offsetX = 0;
    productImageEditorState.offsetY = 0;

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
    } = productImageEditorState;

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

    const stopDragging = event => {
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
                    Number(this.value);

                if (!Number.isFinite(value)) {
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

async function loadProductImageIntoEditor(file) {
    if (
        !file ||
        !file.type.startsWith("image/")
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
        URL.createObjectURL(file);

    productImageEditorState.file = file;
    productImageEditorState.objectUrl =
        objectUrl;

    const image = new Image();

    await new Promise(
        (resolve, reject) => {
            image.onload = resolve;

            image.onerror = () =>
                reject(
                    new Error(
                        "تعذر قراءة الصورة."
                    )
                );

            image.src = objectUrl;
        }
    );

    if (
        currentToken !==
        productImageLoadToken
    ) {
        image.removeAttribute("src");
        revokeObjectUrl(objectUrl);
        return;
    }

    /*
     * حماية الذاكرة من الصور الضخمة جدًا.
     */
    if (
        image.naturalWidth <= 0 ||
        image.naturalHeight <= 0 ||
        image.naturalWidth > 6000 ||
        image.naturalHeight > 6000
    ) {
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
        throw new Error(
            "تعذر تجهيز محرر الصورة."
        );
    }

    productImageEditorState.image =
        image;

    elements.image.src =
        objectUrl;

    elements.editor.hidden = false;

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
            String(minZoom);

        elements.zoom.max =
            String(maxZoom);

        elements.zoom.step =
            String(
                Math.max(
                    0.001,
                    baseScale / 100
                )
            );

        elements.zoom.value =
            String(baseScale);
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

    if (!stage || !state.image) {
        throw new Error(
            "لم يتم اختيار صورة."
        );
    }

    const sourceWidth =
        state.image.naturalWidth;

    const sourceHeight =
        state.image.naturalHeight;

    const originalFileSize =
        Number(state.file?.size) || 0;

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

    const MIN_QUALITY = 0.45;
    const MAX_QUALITY = 0.85;

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

    /*
     * نحافظ على نفس الـcrop والموضع
     * والتكبير المستخدم في المحرر.
     */
    const renderedWidth =
        sourceWidth * state.scale;

    const renderedHeight =
        sourceHeight * state.scale;

    const renderedLeft =
        (stageWidth - renderedWidth) / 2 +
        state.offsetX;

    const renderedTop =
        (stageHeight - renderedHeight) / 2 +
        state.offsetY;

    /*
     * إنشاء WebP بالحجم والجودة المطلوبين.
     */
    const createWebP =
        (outputSize, quality) => {
            return new Promise(
                (resolve, reject) => {
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

                    /*
                     * لا نحتاج إلى رسم خلفية.
                     * WebP الناتج سيحافظ على
                     * نفس crop الموجود حاليًا.
                     */
                    context.clearRect(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    /*
                     * تحويل إحداثيات محرر الصورة
                     * إلى إحداثيات الـcanvas.
                     */
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

                            resolve(blob);
                        },

                        "image/webp",
                        quality
                    );
                }
            );
        };

    /*
     * إنتاج عدد محدود من النتائج فقط
     * للحفاظ على سرعة الرفع.
     *
     * النتيجة المرجعة دائمًا Blob.
     */
    const findBestResult =
        async (
            outputSize,
            maximumSize = TARGET_SIZE
        ) => {
            const qualities = [
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
                const quality of qualities
            ) {
                const blob =
                    await createWebP(
                        outputSize,
                        quality
                    );

                const result = {
                    blob,
                    quality,
                    size: blob.size,
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

                /*
                 * نحافظ على أعلى جودة
                 * تحقق الحجم المطلوب.
                 */
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
     * ---------------------------------------------------------
     * المسار الخاص بالصور الأصلية الصغيرة
     * ---------------------------------------------------------
     *
     * الهدف هنا عدم تكبير الملف الأصلي بلا داعٍ.
     *
     * لكن يجب تطبيق crop المستخدم أولًا،
     * لذلك لا يمكن ببساطة إعادة الملف الأصلي
     * إذا كان المستخدم قد اختار crop مختلفًا.
     */
    if (
        originalFileSize > 0 &&
        originalFileSize <= TARGET_SIZE
    ) {
        /*
         * المحاولة الأولى:
         * أعلى جودة مع الأبعاد الحالية.
         */
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

        /*
         * محاولة ثانية بجودة أقل.
         */
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
            secondResult.size <
            bestSmallResult.size
        ) {
            bestSmallResult = {
                blob: secondResult,
                quality: 0.55,
                size: secondResult.size,
                outputSize:
                    MAX_OUTPUT_SIZE
            };
        }

        /*
         * إذا بقي الناتج أكبر من الأصل،
         * نقلل الأبعاد تدريجيًا.
         *
         * هذا يحافظ على crop بدل التضحية به.
         */
        if (
            MAX_OUTPUT_SIZE >
            MIN_OUTPUT_SIZE
        ) {
            const reducedSizes = [
                Math.round(
                    MAX_OUTPUT_SIZE * 0.80
                ),
                Math.round(
                    MAX_OUTPUT_SIZE * 0.65
                )
            ];

            for (
                const outputSize
                of reducedSizes
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

        /*
         * إذا تعذر الوصول إلى حجم <= الأصل
         * بعد المعالجة، لا نفشل العملية.
         *
         * نعيد أصغر نتيجة معالجة وصلنا إليها.
         */
        return bestSmallResult.blob;
    }

    /*
     * ---------------------------------------------------------
     * الصور الأكبر من 50 KB
     * ---------------------------------------------------------
     */

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

    /*
     * وصلنا إلى 50 KB أو أقل.
     */
    if (
        bestResult.size <=
        TARGET_SIZE
    ) {
        return bestResult.blob;
    }

    /*
     * لم نصل إلى 50 KB.
     *
     * نقلل الأبعاد مرة أو مرتين فقط.
     * لا توجد عشرات عمليات الضغط.
     */
    if (
        MAX_OUTPUT_SIZE >
        MIN_OUTPUT_SIZE
    ) {
        const reducedSizes = [
            Math.round(
                MAX_OUTPUT_SIZE * 0.80
            ),

            Math.round(
                MAX_OUTPUT_SIZE * 0.65
            )
        ];

        for (
            const outputSize
            of reducedSizes
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

            /*
             * وصلنا للهدف.
             */
            if (
                candidate.size <=
                TARGET_SIZE
            ) {
                return candidate.blob;
            }

            /*
             * نحتفظ بأصغر نتيجة عملية.
             */
            if (
                candidate.size <
                bestResult.size
            ) {
                bestResult =
                    candidate;
            }
        }
    }

    /*
     * تجاوز 50 KB ليس خطأ.
     *
     * مثلًا إذا كانت أفضل نتيجة 57 KB،
     * يتم استخدامها بدل فشل حفظ المنتج.
     */
    return bestResult.blob;
}

// ==========================================
// Image File Selection
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
                this.value = "";

                resetProductImageState();

                showAdminProductToast(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );

                return;
            }

            /*
             * loadProductImageIntoEditor()
             * هي المسؤولة عن إدارة
             * productImageLoadToken.
             *
             * لا ننشئ token ثاني هنا،
             * حتى لا يصبح token قديمًا
             * قبل انتهاء تحميل الصورة.
             */
            resetProductImageEditorState();

            try {
                if (status) {
                    status.textContent =
                        "جاري تجهيز محرر الصورة...";
                }

                await loadProductImageIntoEditor(
                    file
                );

                /*
                 * إذا انتهت عملية تحميل الصورة
                 * بنجاح، نعرض حالة المحرر.
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
                        "حرّك الصورة لاختيار الجزء المناسب.";
                }
            } catch (error) {
                console.error(
                    "Image loading error:",
                    error
                );

                this.value = "";

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
// Upload & Clean Storage
// ==========================================
async function uploadProductImage(file) {
    if (!file) return null;

    /*
     * exportEditedProductImage()
     * تعيد Blob دائمًا.
     */
    const optimizedImage =
        await exportEditedProductImage();

    if (
        !optimizedImage ||
        !(optimizedImage instanceof Blob)
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
            .from("product-images")
            .upload(
                filePath,
                optimizedImage,
                {
                    contentType:
                        "image/webp",

                    cacheControl:
                        "31536000",

                    upsert: false
                }
            );

    if (uploadError) {
        throw uploadError;
    }

    const { data } =
        supabaseClient.storage
            .from("product-images")
            .getPublicUrl(
                filePath
            );

    const url =
        String(
            data?.publicUrl ?? ""
        ).trim();

    if (
        !url ||
        !isSafeImageUrl(url)
    ) {
        await supabaseClient.storage
            .from("product-images")
            .remove([filePath])
            .catch(e =>
                console.warn(e)
            );

        throw new Error(
            "تعذر الحصول على رابط الصورة."
        );
    }

    return {
        path: filePath,
        url
    };
}

function getProductImagePath(
    imageUrl
) {
    if (!imageUrl) return null;

    const marker =
        "/storage/v1/object/public/product-images/";

    try {
        const parsedUrl =
            new URL(String(imageUrl));

        const index =
            parsedUrl.pathname.indexOf(
                marker
            );

        if (index === -1) {
            return null;
        }

        const encodedPath =
            parsedUrl.pathname.slice(
                index + marker.length
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
async function saveProduct(event) {
    event.preventDefault();

    if (isProductSaving) return;

    clearFormMessage();

    const idValue =
        document
            .getElementById("productId")
            .value
            .trim();

    const name =
        document
            .getElementById("productName")
            .value
            .trim();

    const productCode =
        document
            .getElementById("productCode")
            .value
            .trim();

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
        Number(
            document.getElementById(
                "productCategory"
            ).value
        );

    const target =
        document
            .getElementById("productTarget")
            .value
            .trim();

    const description =
        document
            .getElementById(
                "productDescription"
            )
            .value
            .trim();

    const imageFile =
        document
            .getElementById(
                "productImageFile"
            )
            ?.files?.[0] || null;

    const saveButton =
        document.getElementById(
            "saveProductButton"
        );

    // ======================================
    // Validations
    // ======================================
    if (!name) {
        return showFormMessage(
            "يرجى إدخال اسم المنتج.",
            "error"
        );
    }

    if (!productCode) {
        return showFormMessage(
            "يرجى إدخال كود المنتج.",
            "error"
        );
    }

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {
        return showFormMessage(
            "سعر المنتج غير صالح.",
            "error"
        );
    }

    if (
        !Number.isInteger(quantity) ||
        quantity < 0
    ) {
        return showFormMessage(
            "الكمية غير صالحة.",
            "error"
        );
    }

    if (
        !Number.isFinite(
            purchaseCost
        ) ||
        purchaseCost <= 0
    ) {
        return showFormMessage(
            "تكلفة الشراء يجب أن تكون أكبر من صفر.",
            "error"
        );
    }

    if (
        !Number.isInteger(categoryId) ||
        categoryId <= 0
    ) {
        return showFormMessage(
            "يرجى اختيار التصنيف.",
            "error"
        );
    }

    isProductSaving = true;

    if (saveButton) {
        saveButton.disabled = true;

        saveButton.dataset.originalText =
            saveButton.textContent;

        saveButton.textContent =
            "جاري الحفظ...";
    }

    let uploadedImagePath = null;

    try {
        const isEdit =
            Boolean(idValue);

        const oldProduct =
            isEdit
                ? adminProducts.find(
                      item =>
                          String(item.id) ===
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
            oldImageUrl || null;

        // ==================================
        // Upload new image first
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
            main_image: mainImage,
            target,
            product_code: productCode,
            category_id: categoryId
        };

        let savedProductId =
            idValue;

        // ==================================
        // Insert
        // ==================================
        if (!isEdit) {
            const {
                data: insertedProduct,
                error: insertError
            } =
                await supabaseClient
                    .from("products")
                    .insert(
                        productData
                    )
                    .select("id")
                    .single();

            if (insertError) {
                throw insertError;
            }

            savedProductId =
                String(
                    insertedProduct.id
                );

            const {
                error: costError
            } =
                await supabaseClient
                    .from("product_costs")
                    .insert({
                        product_id:
                            insertedProduct.id,

                        purchase_cost:
                            purchaseCost
                    });

            if (costError) {
                /*
                 * Rollback product
                 * إذا فشل حفظ التكلفة.
                 */
                await supabaseClient
                    .from("products")
                    .delete()
                    .eq(
                        "id",
                        insertedProduct.id
                    )
                    .catch(e =>
                        console.error(
                            "Rollback failed:",
                            e
                        )
                    );

                throw costError;
            }
        }

        // ==================================
        // Update
        // ==================================
        else {
            const {
                error: updateError
            } =
                await supabaseClient
                    .from("products")
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
                error: costError
            } =
                await supabaseClient
                    .from("product_costs")
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
                 * Restore old product data.
                 */
                await supabaseClient
                    .from("products")
                    .update(
                        oldProductData
                    )
                    .eq(
                        "id",
                        idValue
                    )
                    .catch(e =>
                        console.error(e)
                    );

                /*
                 * Restore old cost.
                 */
                if (
                    oldPurchaseCost !==
                    undefined
                ) {
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
                        )
                        .catch(e =>
                            console.error(
                                e
                            )
                        );
                }

                throw costError;
            }
        }

        // ==================================
        // Remove old image after success
        // ==================================
        if (
            imageFile &&
            uploadedImagePath &&
            oldImageUrl
        ) {
            const oldImagePath =
                getProductImagePath(
                    oldImageUrl
                );

            if (
                oldImagePath &&
                oldImagePath !==
                    uploadedImagePath
            ) {
                await supabaseClient
                    .storage
                    .from(
                        "product-images"
                    )
                    .remove([
                        oldImagePath
                    ])
                    .catch(e =>
                        console.warn(
                            "Old image cleanup failed:",
                            e
                        )
                    );
            }
        }

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
         * نحذف الصورة الجديدة حتى لا تبقى
         * في Storage بدون ارتباط بمنتج.
         */
        if (uploadedImagePath) {
            await supabaseClient
                .storage
                .from("product-images")
                .remove([
                    uploadedImagePath
                ])
                .catch(e =>
                    console.warn(e)
                );
        }

        const code =
            String(
                error?.code || ""
            );

        if (code === "23505") {
            showFormMessage(
                "كود المنتج مستخدم مسبقاً. يرجى اختيار كود آخر.",
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
        isProductSaving = false;

        if (saveButton) {
            saveButton.disabled =
                false;

            saveButton.textContent =
                saveButton.dataset
                    .originalText ||
                "حفظ المنتج";
        }
    }
}

// ==========================================
// Delete Product
// ==========================================
async function deleteProduct(id) {
    if (
        isProductDeleting ||
        isProductSaving
    ) {
        return;
    }

    const product =
        adminProducts.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!product) return;

    if (
        !confirm(
            `هل أنت متأكد من حذف المنتج "${product.name ?? ""}"؟`
        )
    ) {
        return;
    }

    isProductDeleting = true;

    try {
        /*
         * نقرأ الصورة الحالية من قاعدة البيانات
         * قبل الحذف حتى لا نعتمد فقط على
         * النسخة الموجودة في الواجهة.
         */
        const {
            data: latestProduct,
            error: fetchError
        } =
            await supabaseClient
                .from("products")
                .select("main_image")
                .eq("id", id)
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
            error: deleteError
        } =
            await supabaseClient
                .from("products")
                .delete()
                .eq("id", id);

        if (deleteError) {
            throw deleteError;
        }

        /*
         * حذف صورة المنتج من Storage
         * بعد نجاح حذف المنتج.
         */
        const imagePath =
            getProductImagePath(
                imageUrl
            );

        if (imagePath) {
            await supabaseClient
                .storage
                .from("product-images")
                .remove([
                    imagePath
                ])
                .catch(e =>
                    console.warn(
                        "Image cleanup failed:",
                        e
                    )
                );
        }

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
                error?.code || ""
            );

        if (code === "42501") {
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
        isProductDeleting = false;
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
        String(message ?? "");

    element.className =
        `admin-form-message ${type}`;
}

function clearFormMessage() {
    const element =
        document.getElementById(
            "productFormMessage"
        );

    if (!element) return;

    element.textContent = "";

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

    if (!searchInput) return;

    searchInput.addEventListener(
        "input",
        () => {
            const val =
                searchInput.value.trim();

            clearTimeout(
                searchTimeout
            );

            searchTimeout =
                setTimeout(() => {
                    currentSearchTerm =
                        val;

                    currentPage = 1;

                    loadAdminProducts();
                }, 800);
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

    if (!table) return;

    table.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) return;

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;

            if (!id) return;

            if (
                action === "edit"
            ) {
                openEditProductModal(
                    id
                );
            } else if (
                action === "delete"
            ) {
                deleteProduct(id);
            }
        }
    );
}

function setupAdminNavigation() {
    const buttons =
        document.querySelectorAll(
            ".admin-nav-item"
        );

    buttons.forEach(button => {
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
                    this.dataset.section;

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
    });
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
// Initialization
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

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        setupProductSearch();
        setupProductTableActions();
        setupAdminNavigation();
        setupModalEvents();
        setupProductImageEditor();
        setupPaginationControls();

        await loadAdminCategories();
        await loadAdminProducts();
    }
);