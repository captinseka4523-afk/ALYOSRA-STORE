// ==========================================
// AL YOSRA STORE - Admin Products
// ==========================================

let adminProducts = [];
let adminCategories = [];


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
            2800
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
        "productImage"
    ).value =
        product.main_image || "";


    document.getElementById(
        "productDescription"
    ).value =
        product.description || "";


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

async function saveProduct(
    event
) {

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


    const categoryId =
        document.getElementById(
            "productCategory"
        ).value;


    const target =
        document.getElementById(
            "productTarget"
        ).value.trim();


    const image =
        document.getElementById(
            "productImage"
        ).value.trim();


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

        saveButton.disabled = true;

        saveButton.textContent =
            "جاري الحفظ...";

    }


    try {

        const productData = {

            name: name,

            description:
                description || null,

            price: price,

            quantity: quantity,

            main_image:
                image || null,

            target:
                target || null,

            product_code:
                code,

            category_id:
                Number(categoryId)

        };


        let result;


        // ==================================
        // Add
        // ==================================

        if (!id) {

            result =
                await supabaseClient
                    .from("products")
                    .insert(
                        productData
                    )
                    .select()
                    .single();

        }


        // ==================================
        // Update
        // ==================================

        else {

            result =
                await supabaseClient
                    .from("products")
                    .update(
                        productData
                    )
                    .eq(
                        "id",
                        id
                    )
                    .select()
                    .single();

        }


        if (result.error) {
            throw result.error;
        }


        closeProductModalWindow();


        await loadAdminProducts();


        showAdminProductToast(
            id
                ? "تم تعديل المنتج بنجاح."
                : "تمت إضافة المنتج بنجاح.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save product error:",
            error
        );


        if (
            error.code === "23505"
        ) {

            showFormMessage(
                "Product Code مستخدم مسبقًا. يجب اختيار كود مختلف.",
                "error"
            );

        }

        else if (
            error.code === "42501"
        ) {

            showFormMessage(
                "ليس لديك صلاحية لتنفيذ هذه العملية.",
                "error"
            );

        }

        else {

            showFormMessage(
                "حدث خطأ أثناء حفظ المنتج.",
                "error"
            );

        }

    }

    finally {

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