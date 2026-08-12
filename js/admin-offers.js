const offerForm =
    document.getElementById("offerForm");

const productsList =
    document.getElementById("productsList");

const offersList =
    document.getElementById("offersList");



let products = [];



async function loadProducts() {

    productsList.textContent =
        "جاري تحميل المنتجات...";


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

        console.error(error);

        productsList.textContent =
            "حدث خطأ أثناء تحميل المنتجات.";

        return;

    }


    products = data || [];


    if (products.length === 0) {

        productsList.textContent =
            "لا توجد منتجات.";

        return;

    }


    productsList.innerHTML = "";


    products.forEach(
        (product) => {

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
                    value="1"
                    disabled
                >

            `;


            productsList.appendChild(item);

        }
    );


    document
        .querySelectorAll(
            ".offer-product-checkbox"
        )
        .forEach(
            (checkbox) => {

                checkbox.addEventListener(
                    "change",
                    () => {

                        const quantityInput =
                            document.querySelector(
                                `.offer-product-quantity[data-product-id="${checkbox.value}"]`
                            );


                        quantityInput.disabled =
                            !checkbox.checked;

                    }
                );

            }
        );

}



async function loadOffers() {

    offersList.textContent =
        "جاري تحميل العروض...";


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
                    name
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

        console.error(error);

        offersList.textContent =
            "حدث خطأ أثناء تحميل العروض.";

        return;

    }


    if (!data || data.length === 0) {

        offersList.textContent =
            "لا توجد عروض حاليًا.";

        return;

    }


    offersList.innerHTML = "";


    data.forEach(
        (offer) => {

            const card =
                document.createElement("div");

            card.className =
                "offer-admin-item";


            const productsText =
                (offer.offer_items || [])
                    .map(
                        (item) =>
                            `${item.products?.name || "منتج"} × ${item.quantity}`
                    )
                    .join("، ");


            card.innerHTML = `

                <h3>
                    ${offer.name}
                </h3>


                <p>
                    ${offer.description || ""}
                </p>


                <p>
                    المنتجات:
                    ${productsText || "لا توجد منتجات"}
                </p>


                <strong>
                    $${Number(offer.price).toFixed(2)}
                </strong>


                <p>
                    الحالة:
                    ${offer.active ? "فعال" : "غير فعال"}
                </p>

            `;


            offersList.appendChild(card);

        }
    );

}



offerForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const name =
            document
                .getElementById("offerName")
                .value
                .trim();


        const description =
            document
                .getElementById("offerDescription")
                .value
                .trim();


        const price =
            Number(
                document
                    .getElementById("offerPrice")
                    .value
            );


        const image =
            document
                .getElementById("offerImage")
                .value
                .trim();



        const selectedProducts = [];


        document
            .querySelectorAll(
                ".offer-product-checkbox:checked"
            )
            .forEach(
                (checkbox) => {

                    const quantityInput =
                        document.querySelector(
                            `.offer-product-quantity[data-product-id="${checkbox.value}"]`
                        );


                    selectedProducts.push({

                        product_id:
                            Number(
                                checkbox.value
                            ),

                        quantity:
                            Number(
                                quantityInput.value
                            )

                    });

                }
            );



        if (
            selectedProducts.length === 0
        ) {

            alert(
                "اختر منتجًا واحدًا على الأقل."
            );

            return;

        }



        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            alert(
                "أدخل سعرًا صحيحًا للعرض."
            );

            return;

        }



        const {
            data: offer,
            error: offerError
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

            console.error(offerError);

            alert(
                "حدث خطأ أثناء إنشاء العرض."
            );

            return;

        }



        const offerItems =
            selectedProducts.map(
                (item) => ({

                    offer_id:
                        offer.id,

                    product_id:
                        item.product_id,

                    quantity:
                        item.quantity

                })
            );



        const {
            error: itemsError
        } = await supabaseClient
            .from("offer_items")
            .insert(
                offerItems
            );



        if (itemsError) {

            console.error(itemsError);


            await supabaseClient
                .from("offers")
                .delete()
                .eq(
                    "id",
                    offer.id
                );


            alert(
                "حدث خطأ أثناء إضافة منتجات العرض."
            );

            return;

        }



        alert(
            "تم إنشاء العرض بنجاح."
        );


        offerForm.reset();


        document
            .querySelectorAll(
                ".offer-product-quantity"
            )
            .forEach(
                (input) => {

                    input.disabled =
                        true;

                    input.value =
                        1;

                }
            );


        await loadOffers();

    }
);



loadProducts();

loadOffers();