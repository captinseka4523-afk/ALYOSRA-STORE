const sendMessageBtn =
document.getElementById("sendMessageBtn");


if(sendMessageBtn){

    sendMessageBtn.addEventListener(
    "click",
    function(){


        const name =
        document.getElementById("nameInput").value;


        const phone =
        document.getElementById("phoneInput").value;


        const message =
        document.getElementById("messageInput").value;



        const whatsappNumber =
        "963988902539";


        const whatsappMessage =

`📩 رسالة جديدة من متجر اليُسرى

👤 الاسم:
${name || "غير مذكور"}

📱 الهاتف:
${phone || "غير مذكور"}

💬 الرسالة:
${message || "لا توجد رسالة"}`;



        const url =

        "https://wa.me/"
        + whatsappNumber
        + "?text="
        + encodeURIComponent(whatsappMessage);



        window.open(url, "_blank");


    });

}