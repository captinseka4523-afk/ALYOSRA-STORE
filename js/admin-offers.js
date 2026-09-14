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


let products = [];

let offers = [];

// ==========================================
// تجهيز ورفع صور العروض
// ==========================================

async function prepareOfferImage(file) {

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


    const canvasSize = 1600;

    const maxContentSize = 1560;


    let contentWidth =
        image.width;

    let contentHeight =
        image.height;


    if (
        contentWidth > maxContentSize ||
        contentHeight > maxContentSize
    ) {

        const scale =
            Math.min(
                maxContentSize / contentWidth,
                maxContentSize / contentHeight
            );


        contentWidth =
            Math.round(
                contentWidth * scale
            );


        contentHeight =
            Math.round(
                contentHeight * scale
            );

    }


    const canvas =
        document.createElement("canvas");


    canvas.width =
        canvasSize;

    canvas.height =
        canvasSize;


    const context =
        canvas.getContext("2d");


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


    const blob =
        await new Promise(
            (resolve, reject) => {

                canvas.toBlob(
                    result => {

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


async function uploadOfferImage(file) {

    if (!file) {
        return null;
    }


    const optimizedImage =
        await prepareOfferImage(file);


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


function getOfferImagePath(
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
                index + marker.length
            )
        );

    } catch {

        return null;

    }

}

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
// معاينة صورة العرض
// ==========================================

if (offerImageFile) {

    offerImageFile.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];


            if (!file) {

                if (offerImagePreview) {
                    offerImagePreview.hidden = true;
                }

                if (offerImagePreviewImage) {
                    offerImagePreviewImage.src = "";
                }

                if (offerImageStatus) {
                    offerImageStatus.textContent =
                        "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ العرض.";
                }

                return;
            }


            if (!file.type.startsWith("image/")) {

                showAdminOfferMessage(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );

                this.value = "";

                if (offerImagePreview) {
                    offerImagePreview.hidden = true;
                }

                if (offerImagePreviewImage) {
                    offerImagePreviewImage.src = "";
                }

                return;
            }


            try {

                if (offerImageStatus) {
                    offerImageStatus.textContent =
                        "جاري تجهيز معاينة الصورة...";
                }


                const optimizedImage =
                    await prepareOfferImage(file);


                if (!optimizedImage) {
                    throw new Error(
                        "تعذر تجهيز الصورة."
                    );
                }


                const previewUrl =
                    URL.createObjectURL(
                        optimizedImage
                    );


                if (offerImagePreviewImage) {

                    if (
                        offerImagePreviewImage.dataset.previewUrl
                    ) {

                        URL.revokeObjectURL(
                            offerImagePreviewImage.dataset.previewUrl
                        );

                    }


                    offerImagePreviewImage.src =
                        previewUrl;


                    offerImagePreviewImage.dataset.previewUrl =
                        previewUrl;

                }


                if (offerImagePreview) {
                    offerImagePreview.hidden = false;
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


                this.value = "";


                if (offerImagePreview) {
                    offerImagePreview.hidden = true;
                }


                if (offerImagePreviewImage) {

                    offerImagePreviewImage.src = "";


                    if (
                        offerImagePreviewImage.dataset.previewUrl
                    ) {

                        URL.revokeObjectURL(
                            offerImagePreviewImage.dataset.previewUrl
                        );


                        delete offerImagePreviewImage.dataset.previewUrl;

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

if (editOfferImageFile) {

    editOfferImageFile.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith("image/")) {

                showEditMessage(
                    "يرجى اختيار ملف صورة صالح.",
                    "error"
                );

                this.value = "";

                return;
            }

            try {

                if (editOfferImageStatus) {
                    editOfferImageStatus.textContent =
                        "جاري تجهيز معاينة الصورة...";
                }

                const optimizedImage =
                    await prepareOfferImage(file);

                if (!optimizedImage) {
                    throw new Error(
                        "تعذر تجهيز الصورة."
                    );
                }

                const previewUrl =
                    URL.createObjectURL(
                        optimizedImage
                    );

                if (editOfferImagePreviewImage) {

                    if (
                        editOfferImagePreviewImage.dataset.previewUrl
                    ) {
                        URL.revokeObjectURL(
                            editOfferImagePreviewImage.dataset.previewUrl
                        );
                    }

                    editOfferImagePreviewImage.src =
                        previewUrl;

                    editOfferImagePreviewImage.dataset.previewUrl =
                        previewUrl;
                }

                if (editOfferImagePreview) {
                    editOfferImagePreview.hidden = false;
                }

                if (editOfferImageStatus) {
                    editOfferImageStatus.textContent =
                        `تم تجهيز الصورة: ${file.name}`;
                }

            } catch (error) {

                console.error(
                    "Edit offer image preview error:",
                    error
                );

                this.value = "";

                if (editOfferImageStatus) {
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
                quantity,
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

editOfferQuantity.value =
    offer.quantity ?? 0;

const quantity =
    Number(
        offerQuantity?.value
    );
    if (
    !Number.isInteger(quantity) ||
    quantity < 0
) {
    showAdminOfferMessage(
        "يرجى إدخال كمية صحيحة للعرض.",
        "error"
    );

    return;
}

  if (editOfferImageFile) {
    editOfferImageFile.value = "";
}

if (editOfferImagePreviewImage) {
    if (
        editOfferImagePreviewImage.dataset.previewUrl
    ) {
        URL.revokeObjectURL(
            editOfferImagePreviewImage.dataset.previewUrl
        );

        delete editOfferImagePreviewImage.dataset.previewUrl;
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
                

   const quantity =
    Number(
        editOfferQuantity.value
    );

if (
    !Number.isInteger(quantity) ||
    quantity < 0
) {
    showAdminOfferMessage(
        "يرجى إدخال كمية صحيحة للعرض.",
        "error"
    );

    return;
}             

 const currentOffer =
    offers.find(
        item =>
            String(item.id) ===
            String(offerId)
    );

if (!currentOffer) {

    showEditMessage(
        "تعذر العثور على العرض الحالي.",
        "error"
    );

    return;
}

const selectedImageFile =
    editOfferImageFile?.files?.[0] || null;

let uploadedOfferImage = null;

const image =
    currentOffer.image || "";


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

                if (selectedImageFile) {

    uploadedOfferImage =
        await uploadOfferImage(
            selectedImageFile
        );
}

const finalImage =
    uploadedOfferImage?.url ||
    image;

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

                            p_quantity:
                            quantity,

                        p_image:
                            finalImage,

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

                const oldImagePath =
    getOfferImagePath(
        currentOffer.image
    );

if (oldImagePath && uploadedOfferImage?.path) {
    const { error: oldImageDeleteError } =
        await supabaseClient
            .storage
            .from("product-images")
            .remove([oldImagePath]);

    if (oldImageDeleteError) {
        console.error(
            "Old offer image delete error:",
            oldImageDeleteError
        );
    }
}

                closeOfferEditModal();


                showAdminOfferMessage(
                    "تم تعديل العرض بنجاح."
                );


                await loadOffers();


            } catch (error) {

       if (uploadedOfferImage?.path) {

    await supabaseClient
        .storage
        .from("product-images")
        .remove([
            uploadedOfferImage.path
        ]);
}         

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
    data: offerToDelete,
    error: offerFetchError
} = await supabaseClient
    .from("offers")
    .select("image")
    .eq("id", offerId)
    .single();

if (offerFetchError) {
    throw offerFetchError;
}
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

const oldImagePath =
    getOfferImagePath(
        offerToDelete?.image
    );

if (oldImagePath) {

    const {
        error: imageDeleteError
    } = await supabaseClient
        .storage
        .from("product-images")
        .remove([
            oldImagePath
        ]);

    if (imageDeleteError) {
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


    }
    
    
    
    catch (error) {

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


const quantity =
    Number(
        offerQuantity.value
    );

if (
    !Number.isInteger(quantity) ||
    quantity < 0
) {
    showAdminOfferMessage(
        "يرجى إدخال كمية صحيحة للعرض.",
        "error"
    );

    return;
}

          const selectedImageFile =
    offerImageFile?.files?.[0] || null;

let uploadedOfferImage = null;


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

if (selectedImageFile) {

    uploadedOfferImage =
        await uploadOfferImage(
            selectedImageFile
        );

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
                        quantity,
                      image:
    uploadedOfferImage?.url || null

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

                if (offerImagePreview) {
    offerImagePreview.hidden = true;
}

if (offerImagePreviewImage) {

    if (offerImagePreviewImage.dataset.previewUrl) {
        URL.revokeObjectURL(
            offerImagePreviewImage.dataset.previewUrl
        );

        delete offerImagePreviewImage.dataset.previewUrl;
    }

    offerImagePreviewImage.src = "";
}

if (offerImageStatus) {
    offerImageStatus.textContent =
        "اختر صورة من جهازك. سيتم تحسينها ورفعها تلقائيًا عند حفظ العرض.";
}


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
if (uploadedOfferImage?.path) {

    await supabaseClient.storage
        .from("product-images")
        .remove([
            uploadedOfferImage.path
        ]);

}

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