const cartCount = document.getElementById("cartCount");


function updateCartCount(){

    if(cartCount){

        const cart =
        JSON.parse(localStorage.getItem("cart")) || {};


        const count =
        Object.values(cart)
        .reduce((sum, quantity)=> sum + quantity, 0);


        cartCount.textContent = count;

    }

}



document.addEventListener(
"DOMContentLoaded",
updateCartCount
);