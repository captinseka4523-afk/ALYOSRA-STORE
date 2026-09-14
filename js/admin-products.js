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
const imageFileInput =
    document.getElementById("productImageFile");

const imagePreview =
    document.getElementById("productImagePreview");

const imagePreviewImage =
    document.getElementById("productImagePreviewImage");

const imageStatus =
    document.getElementById("productImageStatus");

if (imageFileInput) {
    imageFileInput.value = "";
}

if (imagePreview) {
    imagePreview.hidden = true;
}

if (imagePreviewImage) {
    imagePreviewImage.src = "";
}

if (imageStatus) {
    imageStatus.textContent =
        "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ المنتج.";
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
        modal.hidden = true;
    }


    clearFormMessage();

}


// ==========================================
// Save Product
// ==========================================

async function prepareProductImage(file) {
    if (!file) {
        return null;
    }

    if (!file.type.startsWith("image/")) {
        throw new Error("الملف المحدد ليس صورة.");
    }

    const image = await createImageBitmap(file);

    // الحجم النهائي الموحد للصورة
    const canvasSize = 1600;

    // المساحة الآمنة داخل الإطار
    // نترك هامشًا بسيطًا حتى لا تلتصق الأداة بالحواف.
    const maxContentSize = 1560;

    let contentWidth = image.width;
    let contentHeight = image.height;

    // تصغير الصورة مع الحفاظ على النسبة الأصلية
    if (
        contentWidth > maxContentSize ||
        contentHeight > maxContentSize
    ) {
        const scale = Math.min(
            maxContentSize / contentWidth,
            maxContentSize / contentHeight
        );

        contentWidth =
            Math.round(contentWidth * scale);

        contentHeight =
            Math.round(contentHeight * scale);
    }

    // إنشاء إطار مربع موحد
    const canvas = document.createElement("canvas");

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const context = canvas.getContext("2d");

    if (!context) {
        image.close();
        throw new Error("تعذر تجهيز الصورة.");
    }

    // خلفية بيضاء
    context.fillStyle = "#ffffff";
    context.fillRect(
        0,
        0,
        canvasSize,
        canvasSize
    );

    // وضع الصورة في المنتصف
    const x =
        (canvasSize - contentWidth) / 2;

    const y =
        (canvasSize - contentHeight) / 2;

    context.drawImage(
        image,
        x,
        y,
        contentWidth,
        contentHeight
    );

    image.close();

    // تحويل الصورة إلى WebP وضغطها
    const blob = await new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (result) => {
                    if (result) {
                        resolve(result);
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

document
    .getElementById("productImageFile")
    ?.addEventListener("change", async function () {
        const file = this.files?.[0];

        const previewContainer =
            document.getElementById("productImagePreview");

        const previewImage =
            document.getElementById("productImagePreviewImage");

        const status =
            document.getElementById("productImageStatus");

        if (!file) {
            if (previewContainer) {
                previewContainer.hidden = true;
            }

            if (previewImage) {
                previewImage.src = "";
            }

            if (status) {
                status.textContent =
                    "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ المنتج.";
            }

            return;
        }

        if (!file.type.startsWith("image/")) {
            showAdminProductToast(
                "يرجى اختيار ملف صورة صالح.",
                "error"
            );

            this.value = "";

            if (previewContainer) {
                previewContainer.hidden = true;
            }

            if (previewImage) {
                previewImage.src = "";
            }

            return;
        }

        try {
            if (status) {
                status.textContent =
                    "جاري تجهيز معاينة الصورة...";
            }

            const optimizedImage =
                await prepareProductImage(file);

            if (!optimizedImage) {
                throw new Error(
                    "تعذر تجهيز الصورة."
                );
            }

            const previewUrl =
                URL.createObjectURL(
                    optimizedImage
                );

            if (previewImage) {
                if (previewImage.dataset.previewUrl) {
                    URL.revokeObjectURL(
                        previewImage.dataset.previewUrl
                    );
                }

                previewImage.src = previewUrl;

                previewImage.dataset.previewUrl =
                    previewUrl;
            }

            if (previewContainer) {
                previewContainer.hidden = false;
            }

            if (status) {
                status.textContent =
                    `تم تجهيز الصورة: ${file.name}`;
            }

        } catch (error) {
            console.error(
                "Product image preview error:",
                error
            );

            this.value = "";

            if (previewContainer) {
                previewContainer.hidden = true;
            }

            if (previewImage) {
                previewImage.src = "";

                if (previewImage.dataset.previewUrl) {
                    URL.revokeObjectURL(
                        previewImage.dataset.previewUrl
                    );

                    delete previewImage.dataset.previewUrl;
                }
            }

            if (status) {
                status.textContent =
                    "تعذر تجهيز الصورة للمعاينة.";
            }

            showAdminProductToast(
                error.message ||
                "تعذر تجهيز الصورة.",
                "error"
            );
        }
    });

async function uploadProductImage(file) {
    if (!file) {
        return null;
    }

    const optimizedImage = await prepareProductImage(file);

    if (!optimizedImage) {
        throw new Error("تعذر تجهيز الصورة.");
    }

    const maxFileSize = 3 * 1024 * 1024;

    if (optimizedImage.size > maxFileSize) {
        throw new Error(
            "حجم الصورة بعد الضغط ما زال أكبر من 3 ميغابايت."
        );
    }

    const filePath = `${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(filePath, optimizedImage, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: false
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data: publicUrlData } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
        await supabaseClient.storage
            .from("product-images")
            .remove([filePath]);

        throw new Error("تعذر الحصول على رابط الصورة.");
    }

    return {
        path: filePath,
        url: publicUrlData.publicUrl
    };
}

function getProductImagePath(imageUrl) {
    if (!imageUrl) {
        return null;
    }

    try {
        const url = new URL(imageUrl);

        const marker =
            "/storage/v1/object/public/product-images/";

        const index =
            url.pathname.indexOf(marker);

        if (index === -1) {
            return null;
        }

        return decodeURIComponent(
            url.pathname.slice(
                index + marker.length
            )
        );
    } catch {
        return null;
    }
}

async function saveProduct(event) {
    event.preventDefault();

    clearFormMessage();

    const id =
        document.getElementById("productId").value.trim();

    const name =
        document.getElementById("productName").value.trim();

    const code =
        document.getElementById("productCode").value.trim();

    const price =
        Number(
            document.getElementById("productPrice").value
        );

    const quantity =
        Number(
            document.getElementById("productQuantity").value
        );

    const purchaseCost =
        Number(
            document.getElementById("productPurchaseCost").value
        );

    const categoryId =
        document.getElementById("productCategory").value;

    const target =
        document.getElementById("productTarget").value.trim();

    const imageFile =
        document.getElementById("productImageFile")
            ?.files?.[0] || null;

    const description =
        document.getElementById("productDescription").value.trim();

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
        document.getElementById("saveProductButton");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "جاري الحفظ...";
    }

    let uploadedImagePath = null;

    try {
        // ==================================
        // Existing Product Data
        // ==================================

        const oldProduct = id
            ? adminProducts.find(
                item =>
                    String(item.id) ===
                    String(id)
            )
            : null;

        const oldProductData = oldProduct
            ? {
                name: oldProduct.name,
                description: oldProduct.description,
                price: oldProduct.price,
                quantity: oldProduct.quantity,
                main_image: oldProduct.main_image,
                target: oldProduct.target,
                product_code: oldProduct.product_code,
                category_id: oldProduct.category_id
            }
            : null;

        const oldPurchaseCost =
            id
                ? adminProductCosts[String(id)]
                : null;

        const oldImageUrl =
            oldProduct?.main_image || null;

        // ==================================
        // Upload New Image
        // ==================================

        let imageUrl = oldImageUrl;

        if (imageFile) {
            const uploadedImage =
                await uploadProductImage(imageFile);

            imageUrl = uploadedImage.url;
            uploadedImagePath = uploadedImage.path;
        }

        // ==================================
        // Product Data
        // ==================================

        const productData = {
            name,
            description: description || null,
            price,
            quantity,
            main_image: imageUrl,
            target: target || null,
            product_code: code,
            category_id: Number(categoryId)
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
                    .insert(productData)
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
                    .update(productData)
                    .eq("id", id);

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
                        .update(oldProductData)
                        .eq(
                            "id",
                            id
                        );
                }

                if (
                    oldPurchaseCost !== undefined &&
                    oldPurchaseCost !== null
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
            } catch (imageDeleteError) {
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
            } catch (cleanupError) {
                console.warn(
                    "Uploaded image cleanup failed:",
                    cleanupError
                );
            }
        }

        if (error.code === "23505") {
            showFormMessage(
                "Product Code مستخدم مسبقًا. يجب اختيار كود مختلف.",
                "error"
            );
        }

        else if (error.code === "42501") {
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
            saveButton.disabled = false;
            saveButton.textContent = "حفظ المنتج";
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
            error.code === "42501"
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


        await loadAdminCategories();

        await loadAdminProducts();

    }
);