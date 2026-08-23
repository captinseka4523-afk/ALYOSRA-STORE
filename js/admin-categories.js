// ==========================================
// AL YOSRA STORE - Admin Categories
// ==========================================

let adminCategoriesList = [];


// ==========================================
// Category Toast
// ==========================================

function showCategoryToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "adminCategoryToast"
        );


    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "adminCategoryToast";

        toast.className =
            "admin-category-toast";

        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.className =
        `admin-category-toast ${type} show`;


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(
            function() {

                toast.classList.remove(
                    "show"
                );

            },
            2800
        );

}


// ==========================================
// Load Categories
// ==========================================

async function loadCategoriesManagement() {

    const table =
        document.getElementById(
            "adminCategoriesTable"
        );

    const loading =
        document.getElementById(
            "categoriesLoading"
        );

    const empty =
        document.getElementById(
            "categoriesEmpty"
        );


    if (!table) {
        return;
    }


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
            .from("categories")
            .select("id, name")
            .order("id", {
                ascending: true
            });


        if (error) {
            throw error;
        }


        adminCategoriesList =
            data || [];


        renderCategoriesManagement();


    } catch (error) {

        console.error(
            "Error loading categories:",
            error
        );


        if (loading) {

            loading.textContent =
                "حدث خطأ أثناء تحميل التصنيفات.";

        }

    }

}



// ==========================================
// Render Categories
// ==========================================

function renderCategoriesManagement() {

    const table =
        document.getElementById(
            "adminCategoriesTable"
        );

    const loading =
        document.getElementById(
            "categoriesLoading"
        );

    const empty =
        document.getElementById(
            "categoriesEmpty"
        );


    if (!table) {
        return;
    }


    if (loading) {
        loading.hidden = true;
    }


    table.innerHTML = "";


    if (
        adminCategoriesList.length === 0
    ) {

        if (empty) {
            empty.hidden = false;
        }

        return;

    }


    if (empty) {
        empty.hidden = true;
    }


    adminCategoriesList.forEach(
        category => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${category.id}
                </td>

                <td>
                    <strong>
                        ${escapeCategoryHtml(
                            category.name
                        )}
                    </strong>
                </td>

                <td>

                    <div class="admin-actions">

                        <button
                            type="button"
                            class="admin-edit-button"
                            data-category-action="edit"
                            data-id="${category.id}"
                        >
                            تعديل
                        </button>

                        <button
                            type="button"
                            class="admin-delete-button"
                            data-category-action="delete"
                            data-id="${category.id}"
                        >
                            حذف
                        </button>

                    </div>

                </td>

            `;


            table.appendChild(row);

        }
    );

}



// ==========================================
// Open Add Modal
// ==========================================

function openAddCategoryModal() {

    const modal =
        document.getElementById(
            "categoryModal"
        );

    const form =
        document.getElementById(
            "categoryForm"
        );

    const title =
        document.getElementById(
            "categoryModalTitle"
        );


    if (!modal) {
        return;
    }


    if (form) {
        form.reset();
    }


    document.getElementById(
        "categoryId"
    ).value = "";


    if (title) {

        title.textContent =
            "إضافة تصنيف";

    }


    clearCategoryMessage();


    modal.hidden = false;

}



// ==========================================
// Open Edit Modal
// ==========================================

function openEditCategoryModal(
    id
) {

    const category =
        adminCategoriesList.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!category) {
        return;
    }


    document.getElementById(
        "categoryId"
    ).value =
        category.id;


    document.getElementById(
        "categoryName"
    ).value =
        category.name || "";


    document.getElementById(
        "categoryModalTitle"
    ).textContent =
        "تعديل التصنيف";


    clearCategoryMessage();


    document.getElementById(
        "categoryModal"
    ).hidden = false;

}



// ==========================================
// Close Modal
// ==========================================

function closeCategoryModal() {

    const modal =
        document.getElementById(
            "categoryModal"
        );


    if (modal) {
        modal.hidden = true;
    }


    clearCategoryMessage();

}



// ==========================================
// Save Category
// ==========================================

async function saveCategory(
    event
) {

    event.preventDefault();


    clearCategoryMessage();


    const id =
        document.getElementById(
            "categoryId"
        ).value.trim();


    const name =
        document.getElementById(
            "categoryName"
        ).value.trim();


    if (!name) {

        showCategoryMessage(
            "يرجى إدخال اسم التصنيف.",
            "error"
        );

        return;

    }


    const saveButton =
        document.getElementById(
            "saveCategoryButton"
        );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            "جاري الحفظ...";

    }


    try {

        let result;


        // ------------------------------
        // Add
        // ------------------------------

        if (!id) {

            result =
                await supabaseClient
                    .from("categories")
                    .insert({
                        name: name
                    });

        }


        // ------------------------------
        // Update
        // ------------------------------

        else {

            result =
                await supabaseClient
                    .from("categories")
                    .update({
                        name: name
                    })
                    .eq(
                        "id",
                        id
                    );

        }


        if (result.error) {
            throw result.error;
        }


        closeCategoryModal();


        await loadCategoriesManagement();


        showCategoryToast(
            id
                ? "تم تعديل التصنيف بنجاح."
                : "تمت إضافة التصنيف بنجاح."
        );


    } catch (error) {

        console.error(
            "Save category error:",
            error
        );


        if (
            error.code === "23505"
        ) {

            showCategoryMessage(
                "اسم التصنيف مستخدم مسبقًا.",
                "error"
            );

        }

        else {

            showCategoryMessage(
                "حدث خطأ أثناء حفظ التصنيف.",
                "error"
            );

        }

    }

    finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "حفظ التصنيف";

        }

    }

}



// ==========================================
// Delete Category
// ==========================================

async function deleteCategory(
    id
) {

    const category =
        adminCategoriesList.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!category) {
        return;
    }


    // ======================================
    // Check products using this category
    // ======================================

    try {

        const {
            data: products,
            error
        } = await supabaseClient
            .from("products")
            .select("id")
            .eq(
                "category_id",
                id
            );


        if (error) {
            throw error;
        }


        if (
            products &&
            products.length > 0
        ) {

            showCategoryToast(
                `لا يمكن حذف التصنيف "${category.name}" لأنه مستخدم حاليًا من قبل ${products.length} منتج.`,
                "error"
            );

            return;

        }


        // ==================================
        // Delete confirmation
        // ==================================

        const confirmed =
            confirm(
                `هل أنت متأكد من حذف التصنيف "${category.name}"؟`
            );


        if (!confirmed) {
            return;
        }


        const {
            error: deleteError
        } =
            await supabaseClient
                .from("categories")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (deleteError) {
            throw deleteError;
        }


        await loadCategoriesManagement();


        showCategoryToast(
            "تم حذف التصنيف بنجاح."
        );


    } catch (error) {

        console.error(
            "Delete category error:",
            error
        );


        showCategoryToast(
            "تعذر حذف التصنيف.",
            "error"
        );

    }

}



// ==========================================
// Events
// ==========================================

function setupCategoryEvents() {

    const addButton =
        document.getElementById(
            "addCategoryButton"
        );

    const closeButton =
        document.getElementById(
            "closeCategoryModal"
        );

    const cancelButton =
        document.getElementById(
            "cancelCategoryButton"
        );

    const form =
        document.getElementById(
            "categoryForm"
        );

    const table =
        document.getElementById(
            "adminCategoriesTable"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            openAddCategoryModal
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeCategoryModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeCategoryModal
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveCategory
        );

    }


    if (table) {

        table.addEventListener(
            "click",
            function(event) {

                const button =
                    event.target.closest(
                        "button[data-category-action]"
                    );


                if (!button) {
                    return;
                }


                const action =
                    button.dataset.categoryAction;


                const id =
                    button.dataset.id;


                if (
                    action === "edit"
                ) {

                    openEditCategoryModal(
                        id
                    );

                }


                if (
                    action === "delete"
                ) {

                    deleteCategory(
                        id
                    );

                }

            }
        );

    }

}



// ==========================================
// Messages - Modal
// ==========================================

function showCategoryMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "categoryFormMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `admin-form-message ${type}`;

}


function clearCategoryMessage() {

    const element =
        document.getElementById(
            "categoryFormMessage"
        );


    if (!element) {
        return;
    }


    element.textContent = "";

    element.className =
        "admin-form-message";

}



// ==========================================
// Escape HTML
// ==========================================

function escapeCategoryHtml(
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
// Start
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        setupCategoryEvents();

        await loadCategoriesManagement();

    }
);