// قراءة السلة
cart = JSON.parse(localStorage.getItem("cart")) || {};

// مكان عرض المنتجات
const orderSummary = document.getElementById("orderSummary");

// حساب المجموع
let totalPrice = 0;

function displayCheckout() {

    if (!orderSummary) return;

    orderSummary.innerHTML = "";

    // السلة فارغة
    if (Object.keys(cart).length === 0) {

        orderSummary.innerHTML = `
            <p style="text-align:center;">
                السلة فارغة
            </p>
        `;

        return;
    }

    // عرض المنتجات
    Object.keys(cart).forEach(id => {

        const product = products.find(p => p.id === id);

        if (!product) return;

        const quantity = cart[id];

        const subtotal = product.price * quantity;

        totalPrice += subtotal;

        orderSummary.innerHTML += `

        <div class="order-item">

            <img src="../${product.image}"
            alt="${product.name}"
            style="
            width:80px;
            height:80px;
            object-fit:contain;
            ">

            <div style="flex:1;padding:0 15px;">

                <h3>${product.name}</h3>

                <p>
                الكمية: ${quantity}
                </p>

                <p>
                السعر: ${product.price}$
                </p>

            </div>

            <strong>
            ${subtotal}$
            </strong>

        </div>

        `;

    });

    // المجموع الكلي

    orderSummary.innerHTML += `

    <hr>

    <h2 style="text-align:center;">

        المجموع الكلي:

        <span style="color:#2563eb;">

            ${totalPrice}$

        </span>

    </h2>

    `;

}

displayCheckout();

document
.getElementById("confirmOrder")
.addEventListener("click", function(){


    const name =
    document.getElementById("customerName").value.trim();


    const phone =
    document.getElementById("customerPhone").value.trim();


    const address =
    document.getElementById("customerAddress").value.trim();


    const note =
    document.getElementById("customerNote").value.trim();



    if(!name || !phone || !address){


        alert("يرجى تعبئة الاسم ورقم الهاتف والعنوان");


        return;


    }



let message =

`🦷 متجر اليُسرى

━━━━━━━━━━━━━━

📦 طلب جديد

👤 بيانات العميل:

الاسم:
${name}

📱 الهاتف:
${phone}

🏫 الجامعة:
${address}

━━━━━━━━━━━━━━

🛒 تفاصيل الطلب:

`;



    let total = 0;



    Object.keys(cart).forEach(id => {



        const product =
        products.find(p => p.id === id);



        if(product){


            const quantity = cart[id];


            const subtotal =
            product.price * quantity;


            total += subtotal;



message +=

`
🦷 ${product.name}

الكمية: ${quantity}
السعر: ${subtotal}$

`;


        }


    });



message +=

`
━━━━━━━━━━━━━━

💰 المجموع الكلي:
${total}$

📝 ملاحظات:
${note || "لا يوجد"}

━━━━━━━━━━━━━━

شكراً لطلبكم من متجر اليُسرى 🦷
`;



    const whatsappNumber =
    "963988902539";



    const whatsappURL =

    "https://wa.me/" 
    + whatsappNumber
    + "?text="
    + encodeURIComponent(message);



 // حفظ رسالة الواتساب للصفحة التالية


const today = new Date();


const date =
today.getFullYear()
+
String(today.getMonth()+1).padStart(2,"0")
+
String(today.getDate()).padStart(2,"0");



let orderNumber =
Number(localStorage.getItem("orderNumber")) || 0;


orderNumber++;



localStorage.setItem(
    "orderNumber",
    orderNumber
);



const orderId =

"AL-"
+
date
+
"-"
+
String(orderNumber).padStart(3,"0");



localStorage.setItem(
    "orderId",
    orderId
);



message +=

"\n\nرقم الطلب:\n"
+
orderId;


localStorage.setItem(
    "orderId",
    orderId
);




 localStorage.setItem(
    "whatsappMessage",
    message
);


// الانتقال إلى صفحة النجاح

window.location.href =
"order-success.html";


});
const customerFields = [
    "customerName",
    "customerPhone",
    "customerAddress",
    "customerNote"
];



// حفظ البيانات أثناء الكتابة

customerFields.forEach(id => {

    const field = document.getElementById(id);

    if(field){

        field.addEventListener("input", ()=>{

            localStorage.setItem(
                id,
                field.value
            );

        });

    }

});



// استرجاع البيانات عند فتح الصفحة

customerFields.forEach(id => {

    const savedData =
    localStorage.getItem(id);


    const field =
    document.getElementById(id);


    if(savedData && field){

        field.value = savedData;

    }

});