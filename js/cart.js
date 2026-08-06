const userCart =
JSON.parse(localStorage.getItem("cart")) || {};


const cartContainer =
document.getElementById("cartContainer");

const cartTotal =
document.getElementById("cartTotal");



function saveCart(){

    localStorage.setItem(
        "cart",
        JSON.stringify(userCart)
    );


    if(typeof updateCartCount === "function"){

        updateCartCount();

    }

}



function displayCart(){


    if(!cartContainer) return;


    cartContainer.innerHTML = "";



    if(Object.keys(userCart).length === 0){


        cartContainer.innerHTML = `

        <div class="empty-cart">

            السلة فارغة

        </div>

        `;


        if(cartTotal){

            cartTotal.textContent = "0$";

        }


        return;

    }



    let total = 0;



    Object.keys(userCart).forEach(id => {



        const product =
        products.find(
            item => item.id === id
        );



        if(product){


            const price =
            Number(
                product.price.replace("$","")
            );



            total += price * userCart[id];



            cartContainer.innerHTML += `


            <div class="cart-item">


                <img 
                src="${product.image}"
                alt="${product.name}"
                >



                <div class="cart-info">


                    <h3>
                    ${product.name}
                    </h3>



                    <p>
                    السعر: ${product.price} $
                    </p>



                    <div class="quantity-box">


                        <button 
                        class="quantity-btn plus"
                        data-id="${id}">
                        +
                        </button>



                        <span>
                        ${userCart[id]}
                        </span>



                        <button 
                        class="quantity-btn minus"
                        data-id="${id}">
                        -
                        </button>


                    </div>



                    <button 
                    class="remove-btn"
                    data-id="${id}">
                    حذف
                    </button>



                </div>


            </div>


            `;


        }


    });



    if(cartTotal){

        cartTotal.textContent =
        total + "$";

    }


}





document.addEventListener(
"click",
function(event){



    const id =
    event.target.dataset.id;



    if(event.target.classList.contains("plus")){


        userCart[id]++;


        saveCart();

        displayCart();

    }




    if(event.target.classList.contains("minus")){


        if(userCart[id] > 1){

            userCart[id]--;

        }else{

            delete userCart[id];

        }


        saveCart();

        displayCart();

    }





    if(event.target.classList.contains("remove-btn")){


        delete userCart[id];


        saveCart();

        displayCart();

    }



});





document.addEventListener(
"DOMContentLoaded",
function(){


    displayCart();


});