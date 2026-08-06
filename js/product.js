const productId =
new URLSearchParams(window.location.search)
.get("id");



const product =
products.find(item => item.id === productId);





const productImage =
document.getElementById("productImage");

const productName =
document.getElementById("productName");

const productDescription =
document.getElementById("productDescription");

const productPrice =
document.getElementById("productPrice");

const productSpecs =
document.getElementById("productSpecs");





if(product){


    if(productImage){

        productImage.src = product.image;

        productImage.alt = product.name;

    }



    if(productName){

        productName.textContent =
        product.name;

    }



    if(productDescription){

        productDescription.textContent =
        product.description;

    }



    if(productPrice){

        productPrice.textContent =
        product.price + " $";

    }




    if(productSpecs){


        productSpecs.innerHTML = "";


        product.specs.forEach(spec => {


            productSpecs.innerHTML += `

            <li>
            ${spec}
            </li>

            `;


        });


    }


}






const quantityInput =
document.getElementById("quantityInput");


const plusBtn =
document.getElementById("plusBtn");


const minusBtn =
document.getElementById("minusBtn");





if(plusBtn){

    plusBtn.addEventListener(
    "click",
    function(){

        quantityInput.value =
        Number(quantityInput.value) + 1;

    });

}





if(minusBtn){

    minusBtn.addEventListener(
    "click",
    function(){

        if(Number(quantityInput.value) > 1){

            quantityInput.value =
            Number(quantityInput.value) - 1;

        }

    });

}
const addToCartBtn = document.getElementById("addToCartBtn");


if(addToCartBtn){


    addToCartBtn.addEventListener(
    "click",
    function(){


        let cart =
        JSON.parse(localStorage.getItem("cart")) || {};



        const quantity =
        Number(quantityInput.value);



        if(cart[product.id]){


            cart[product.id] += quantity;


        }else{


            cart[product.id] = quantity;


        }



        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );



        if(typeof updateCartCount === "function"){


            updateCartCount();


        }



        console.log(
            "تمت إضافة المنتج:",
            product.id,
            "الكمية:",
            quantity
        );


    });

}