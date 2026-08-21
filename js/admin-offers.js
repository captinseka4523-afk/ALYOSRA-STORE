const offerForm =
    document.getElementById("offerForm");

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

const editOfferImage =
    document.getElementById("editOfferImage");

const editOfferProductsList =
    document.getElementById("editOfferProductsList");

const offerEditMessage =
    document.getElementById("offerEditMessage");

const closeOfferEditModalButton =
    document.getElementById("closeOfferEditModal");

const cancelOfferEdit =
    document.getElementById("cancelOfferEdit");


let products = [];

let offers = [];


// ==========================================
// رسالة داخل لوحة العروض
// ==========================================

let adminOfferToastTimer;


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
            document.createElement("div");

        toast.id =
            "adminOfferToast";

        document.body.appendChild(toast);

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
        } = await supabaseClient

            .from("products")

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


        renderCreateProducts();


    } catch (error) {

        console.error(
            "خطأ في تحميل المنتجات:",
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


    if (products.length === 0) {

        productsList.textContent =
            "لا توجد منتجات.";

        return;

    }


    productsList.innerHTML = "";


    products.forEach(
        product => {

            const item =
                document.createElement("div");


            item.className =
                "offer-product-item";


            item.innerHTML = `

                <label>

                    <input
                        type="checkbox"
                        class="offer-product-checkbox"
                        value="${product.id}"
                    >

                    <span>
                        ${product.name}
                    </span>

                </label>


                <input
                    type="number"
                    class="offer-product-quantity"
                    data-product-id="${product.id}"
                    min="1"
                    max="${Number(product.quantity) || 1}"
                    value="1"
                    disabled
                >

            `;


            productsList.appendChild(
                item
            );

        }
    );


    document
        .querySelectorAll(
            ".offer-product-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () => {

                        const input =
                            document.querySelector(
                                `.offer-product-quantity[data-product-id="${checkbox.value}"]`
                            );


                        if (!input) {
                            return;
                        }


                        input.disabled =
                            !checkbox.checked;

                    }
                );

            }
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
        } = await supabaseClient

            .from("offers")

            .select(`
                id,
                name,
                description,
                price,
                image,
                active,
                created_at,
                offer_items (
                    product_id,
                    quantity,
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


    offersList.innerHTML = "";


    offers.forEach(
        offer => {

            const card =
                document.createElement("div");


            card.className =
                "offer-admin-item";


            const productsText =
                (offer.offer_items || [])
                    .map(
                        item =>
                            `${item.products?.name || "منتج"} × ${item.quantity}`
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
                                src="${offer.image}"
                                alt="${offer.name}"
                                class="offer-admin-image"
                            >
                          `
                        : ""
                }


                <h3>
                    ${offer.name}
                </h3>


                ${
                    offer.description
                        ? `
                            <p>
                                ${offer.description}
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
                            productsText ||
                            "لا توجد منتجات"
                        }
                    </span>

                </div>


                <div class="offer-admin-meta">

                    <strong>
                        $${Number(
                            offer.price
                        ).toFixed(2)}
                    </strong>


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
                        data-id="${offer.id}"
                    >
                        التفاصيل
                    </button>


                    <button
                        type="button"
                        class="offer-admin-action offer-edit-action"
                        data-action="edit"
                        data-id="${offer.id}"
                    >
                        تعديل
                    </button>


                    <button
                        type="button"
                        class="offer-admin-action offer-toggle-action"
                        data-action="toggle"
                        data-id="${offer.id}"
                    >
                        ${toggleText}
                    </button>


                    <button
                        type="button"
                        class="offer-admin-action offer-delete-action"
                        data-action="delete"
                        data-id="${offer.id}"
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
// فتح نافذة التعديل
// ==========================================

async function openOfferEditModal(
    offerId
) {

    const offer =
        offers.find(
            item =>
                String(item.id) ===
                String(offerId)
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


    editOfferImage.value =
        offer.image || "";


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


    const offerItems =
        offer.offer_items || [];


    const selectedMap =
        new Map();


    offerItems.forEach(
        item => {

            selectedMap.set(
                String(item.product_id),
                Number(item.quantity) || 1
            );

        }
    );


    if (products.length === 0) {

        editOfferProductsList.textContent =
            "لا توجد منتجات.";

        return;

    }


    editOfferProductsList.innerHTML =
        "";


    products.forEach(
        product => {

            const productId =
                String(product.id);


            const selected =
                selectedMap.has(
                    productId
                );


            const quantity =
                selected
                    ? selectedMap.get(
                        productId
                    )
                    : 1;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "offer-product-item";


            item.innerHTML = `

                <label>

                    <input
                        type="checkbox"
                        class="edit-offer-product-checkbox"
                        value="${product.id}"
                        ${
                            selected
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        ${product.name}
                    </span>

                </label>


                <input
                    type="number"
                    class="edit-offer-product-quantity"
                    data-product-id="${product.id}"
                    min="1"
                    max="${Number(product.quantity) || 1}"
                    value="${quantity}"
                    ${
                        selected
                            ? ""
                            : "disabled"
                    }
                >

            `;


            editOfferProductsList.appendChild(
                item
            );

        }
    );


    editOfferProductsList
        .querySelectorAll(
            ".edit-offer-product-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "change",
                    () => {

                        const input =
                            editOfferProductsList
                                .querySelector(
                                    `.edit-offer-product-quantity[data-product-id="${checkbox.value}"]`
                                );


                        if (!input) {
                            return;
                        }


                        input.disabled =
                            !checkbox.checked;

                    }
                );

            }
        );

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

}


// ==========================================
// حفظ تعديل العرض
// ==========================================

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


            const image =
                editOfferImage.value.trim();


            const selectedProducts = [];


            editOfferProductsList
                .querySelectorAll(
                    ".edit-offer-product-checkbox:checked"
                )
                .forEach(
                    checkbox => {

                        const input =
                            editOfferProductsList
                                .querySelector(
                                    `.edit-offer-product-quantity[data-product-id="${checkbox.value}"]`
                                );


                        const quantity =
                            Number(
                                input?.value
                            ) || 0;


                        if (
                            quantity > 0
                        ) {

                            selectedProducts.push({

                                product_id:
                                    Number(
                                        checkbox.value
                                    ),

                                quantity

                            });

                        }

                    }
                );


            if (!name) {

                showEditMessage(
                    "أدخل اسم العرض.",
                    "error"
                );

                return;

            }


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                showEditMessage(
                    "أدخل سعرًا صحيحًا.",
                    "error"
                );

                return;

            }


            if (
                selectedProducts.length === 0
            ) {

                showEditMessage(
                    "اختر منتجًا واحدًا على الأقل.",
                    "error"
                );

                return;

            }


            try {

                showEditMessage(
                    "جاري حفظ التعديلات..."
                );


                const {
                    data,
                    error
                } = await supabaseClient.rpc(
                    "admin_update_offer",
                    {
                        p_offer_id:
                            Number(offerId),

                        p_name:
                            name,

                        p_description:
                            description,

                        p_price:
                            price,

                        p_image:
                            image,

                        p_items:
                            selectedProducts
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


                closeOfferEditModal();


                showAdminOfferMessage(
                    "تم تعديل العرض بنجاح."
                );


                await loadOffers();


            } catch (error) {

                console.error(
                    "خطأ في تعديل العرض:",
                    error
                );


                showEditMessage(
                    "حدث خطأ أثناء حفظ التعديلات.",
                    "error"
                );

            }

        }
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
// تفاصيل العرض
// ==========================================

function showOfferDetails(
    offerId
) {

    const offer =
        offers.find(
            item =>
                String(item.id) ===
                String(offerId)
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
                    `${item.products?.name || "منتج"} × ${item.quantity}`
            )
            .join("\n");


    const message =

        `العرض: ${offer.name}\n\n` +

        `السعر: $${Number(
            offer.price
        ).toFixed(2)}\n\n` +

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
                String(item.id) ===
                String(offerId)
        );


    if (!offer) {
        return;
    }


    try {

       const {
    data,
    error
} = await supabaseClient.rpc(
    "admin_toggle_offer",
    {
        p_offer_id: Number(offerId),
        p_active: !offer.active
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


        if (error) {
            throw error;
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
                String(item.id) ===
                String(offerId)
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
            error:
                itemsError
        } = await supabaseClient

            .from("offer_items")

            .delete()

            .eq(
                "offer_id",
                offerId
            );


        if (itemsError) {
            throw itemsError;
        }


        const {
            error:
                offerError
        } = await supabaseClient

            .from("offers")

            .delete()

            .eq(
                "id",
                offerId
            );


        if (offerError) {
            throw offerError;
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


            if (!id) {
                return;
            }


            if (
                action === "details"
            ) {

                showOfferDetails(
                    id
                );

            }


            if (
                action === "edit"
            ) {

                openOfferEditModal(
                    id
                );

            }


            if (
                action === "toggle"
            ) {

                toggleOffer(
                    id
                );

            }


            if (
                action === "delete"
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

if (closeOfferEditModalButton) {

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


            const image =
                document
                    .getElementById(
                        "offerImage"
                    )
                    .value
                    .trim();


            const selectedProducts = [];


            document
                .querySelectorAll(
                    ".offer-product-checkbox:checked"
                )
                .forEach(
                    checkbox => {

                        const quantityInput =
                            document.querySelector(
                                `.offer-product-quantity[data-product-id="${checkbox.value}"]`
                            );


                        const quantity =
                            Number(
                                quantityInput?.value
                            ) || 0;


                        if (
                            quantity > 0
                        ) {

                            selectedProducts.push({

                                product_id:
                                    Number(
                                        checkbox.value
                                    ),

                                quantity

                            });

                        }

                    }
                );


            if (
                selectedProducts.length === 0
            ) {

                showAdminOfferMessage(
                    "اختر منتجًا واحدًا على الأقل.",
                    "error"
                );

                return;

            }


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                showAdminOfferMessage(
                    "أدخل سعرًا صحيحًا للعرض.",
                    "error"
                );

                return;

            }


            try {

                const {
                    data: offer,
                    error:
                        offerError
                } = await supabaseClient

                    .from("offers")

                    .insert({

                        name,
                        description,
                        price,
                        image

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

                            quantity:
                                item.quantity

                        })
                    );


                const {
                    error:
                        itemsError
                } = await supabaseClient

                    .from("offer_items")

                    .insert(
                        offerItems
                    );


                if (itemsError) {

                    await supabaseClient
                        .from("offers")
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


                document
                    .querySelectorAll(
                        ".offer-product-quantity"
                    )
                    .forEach(
                        input => {

                            input.disabled =
                                true;

                            input.value =
                                1;

                        }
                    );


                await loadOffers();


            } catch (error) {

                console.error(
                    "خطأ في إنشاء العرض:",
                    error
                );


                showAdminOfferMessage(
                    "حدث خطأ أثناء إنشاء العرض.",
                    "error"
                );

            }

        }
    );

}


// ==========================================
// بدء الصفحة
// ==========================================

loadProducts();

loadOffers();