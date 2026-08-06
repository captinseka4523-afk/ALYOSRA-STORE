window.products = [

    {
        id: "mirror",
        name: "مرآة أسنان",
        image: "images/product1.png",
        description: "أداة أساسية لطلاب طب الأسنان",
        price: "5",
        specs: [
            "جودة عالية",
            "مناسبة للتدريب",
            "سهلة التعقيم"
        ]
    },

    {
        id: "pliers",
        name: "ملقط أسنان",
        image: "images/product2.png",
        description: "أداة مهمة للتدريب العملي",
        price: "8",
        specs: [
            "مصنوع من المعدن",
            "دقة عالية",
            "مناسب للطلاب"
        ]
    },

    {
        id: "explorer",
        name: "مسبار أسنان",
        image: "images/product3.png",
        description: "أداة فحص دقيقة لطلاب الأسنان",
        price: "7",
        specs: [
            "طرف دقيق",
            "استخدام عملي",
            "جودة ممتازة"
        ]
    },

    {
        id: "dental-kit",
        name: "طقم أدوات أسنان",
        image: "images/product1.png",
        description: "مجموعة تدريبية متكاملة",
        price: "25",
        specs: [
            "مجموعة كاملة",
            "مناسبة للطلاب",
            "حقيبة تدريبية"
        ]
    },
    {
        id: "probe",
        name: "أداة فحص",
        image: "images/product2.png",
        description: "مناسبة للتطبيقات العملية",
        price: "6",
        specs: [
            "تصميم عملي",
            "سهلة الاستخدام",
            "مناسبة للتدريب"
        ]
    },


    {
        id: "mirror-handle",
        name: "مقبض مرآة",
        image: "images/product3.png",
        description: "مقبض عالي الجودة",
        price: "4",
        specs: [
            "خفيف الوزن",
            "متين",
            "راحة أثناء الاستخدام"
        ]
    },


    {
        id: "orthodontic-pliers",
        name: "كماشة تقويم",
        image: "images/product1.png",
        description: "أداة خاصة بطلاب التقويم",
        price: "15",
        specs: [
            "دقة عالية",
            "مناسبة للتقويم",
            "صناعة احترافية"
        ]
    },


    {
        id: "training-tool",
        name: "أداة تدريب",
        image: "images/product2.png",
        description: "للتدريب داخل المختبر",
        price: "12",
        specs: [
            "للتدريب العملي",
            "مناسبة للمختبر",
            "جودة جيدة"
        ]
    }


];



let cart = JSON.parse(localStorage.getItem("cart")) || {};



const productsContainer =
document.getElementById("productsContainer");



function displayProducts(){


    if(!productsContainer) return;


    productsContainer.innerHTML = "";



    products.forEach(product => {


        productsContainer.innerHTML += `

        <div class="product-card"
        data-id="${product.id}">


            <img 
            src="${product.image}"
            alt="${product.name}">


            <h3>
            ${product.name}
            </h3>


            <p>
            ${product.description}
            </p>


            <span class="product-price">
            ${product.price} $
            </span>


            <button class="add-cart"
            data-id="${product.id}">
            أضف إلى السلة
            </button>


        </div>

        `;


    });


}

document.addEventListener(
"DOMContentLoaded",
displayProducts
);





document.addEventListener(
"click",
function(event){



    // فتح صفحة تفاصيل المنتج عند الضغط على الكرت

    const card = event.target.closest(".product-card");


    if(card && !event.target.classList.contains("add-cart")){


        const id = card.dataset.id;


     window.location.href = "product.html?id=" + id;


    }



    // إضافة المنتج إلى السلة

    if(event.target.classList.contains("add-cart")){


        const id = event.target.dataset.id;



        cart[id] = cart[id]
        ? cart[id] + 1
        : 1;



        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );



        if(typeof updateCartCount === "function"){


            updateCartCount();


        }



        console.log(
            "تمت إضافة المنتج:",
            id
        );


    }


});
