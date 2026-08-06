

let countdown = 3;

const savedOrderId =
localStorage.getItem("orderId");


const orderIdElement =
document.getElementById("orderId");


if(savedOrderId && orderIdElement){

    orderIdElement.textContent =
    savedOrderId;

}

const counter =
document.getElementById("countdown");


// قراءة رسالة واتساب المحفوظة

const whatsappMessage =
localStorage.getItem("whatsappMessage");



const whatsappNumber =
"963988902539";



function startCountdown(){


    const timer =
    setInterval(()=>{


        countdown--;


       if(countdown >= 0){


    counter.textContent = countdown;


}



if(countdown === 0){


    clearInterval(timer);


    localStorage.removeItem("cart");



    localStorage.removeItem("whatsappMessage");



    if(whatsappMessage){


        const url =

        "https://wa.me/"
        + whatsappNumber
        + "?text="
        + encodeURIComponent(whatsappMessage);



        window.location.href = url;


    }


}



    },1000);


}



startCountdown();




// زر العودة إلى المنتجات

function goProducts(){


    window.location.href =
    "products.html";


}
window.addEventListener("pageshow", function(){

    if(!localStorage.getItem("whatsappMessage")){

        window.location.href = "products.html";

    }

});