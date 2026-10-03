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

 const menuToggle = document.getElementById("menuToggle");
    const sideMenu = document.getElementById("sideMenu");
    const sideMenuClose = document.getElementById("sideMenuClose");
    const sideMenuOverlay = document.getElementById("sideMenuOverlay");

    function openMenu() {
        if(sideMenu && sideMenuOverlay) {
            sideMenu.classList.add("open");
sideMenu.removeAttribute("inert");
            sideMenuOverlay.classList.add("open");
            sideMenu.setAttribute("aria-hidden", "false");
        }
    }
    function closeMenu() {
        if(sideMenu && sideMenuOverlay) {
            sideMenu.classList.remove("open");
sideMenu.setAttribute("inert", "");
            sideMenuOverlay.classList.remove("open");
            sideMenu.setAttribute("aria-hidden", "true");
        }
    }

    if(menuToggle) menuToggle.addEventListener("click", openMenu);
    if(sideMenuClose) sideMenuClose.addEventListener("click", closeMenu);
    if(sideMenuOverlay) sideMenuOverlay.addEventListener("click", closeMenu);