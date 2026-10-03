/* =================================================
       SIDE MENU
    ================================================= */

    const menuToggle =
        document.getElementById("menuToggle");

    const sideMenu =
        document.getElementById("sideMenu");

    const sideMenuClose =
        document.getElementById("sideMenuClose");

    const sideMenuOverlay =
        document.getElementById("sideMenuOverlay");


    function openSideMenu() {

        if (!sideMenu || !sideMenuOverlay) {
            return;
        }

        sideMenu.classList.add("open");
sideMenu.removeAttribute("inert");

        sideMenuOverlay.classList.add("open");

        sideMenu.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "menu-open"
        );

    }


    function closeSideMenu() {

        if (!sideMenu || !sideMenuOverlay) {
            return;
        }

        sideMenu.classList.remove("open");
sideMenu.setAttribute("inert", "");

        sideMenuOverlay.classList.remove("open");

        sideMenu.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "menu-open"
        );

    }


    if (menuToggle) {

        menuToggle.addEventListener(
            "click",
            openSideMenu
        );

    }


    if (sideMenuClose) {

        sideMenuClose.addEventListener(
            "click",
            closeSideMenu
        );

    }


    if (sideMenuOverlay) {

        sideMenuOverlay.addEventListener(
            "click",
            closeSideMenu
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeSideMenu();

            }

        }
    );



(function () {

    "use strict";

    const form =
        document.getElementById("clinicSetupForm");

    if (!form) {
        return;
    }


    /* =====================================================
       Visual selection state
       ===================================================== */

    const choices =
        form.querySelectorAll(
            ".clinic-choice input"
        );

    choices.forEach(function (input) {

        input.addEventListener(
            "change",
            function () {

                const choice =
                    input.closest(
                        ".clinic-choice"
                    );

                if (!choice) {
                    return;
                }

                choice.classList.toggle(
                    "is-selected",
                    input.checked
                );

            }
        );

    });


    /* =====================================================
       WhatsApp
       ===================================================== */

    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const name =
                form.elements.customer_name.value.trim();

            const phone =
                form.elements.customer_phone.value.trim();

            const location =
                form.elements.customer_location.value.trim();

            const note =
                form.elements.customer_note.value.trim();


            const setupTypes =
                Array.from(
                    form.querySelectorAll(
                        'input[name="setup_type"]:checked'
                    )
                ).map(function (input) {
                    return input.value.trim();
                });


            if (!name || !phone) {
                return;
            }


            const messageParts = [

                "  السلام عليكم",
                "",
                "أرغب بالاستفسار عن تجهيز عيادتي.",
                "",
                "الاسم: " + name,
                "رقم التواصل: " + phone

            ];


            if (setupTypes.length) {

                messageParts.push(
                    "نوع التجهيز: " +
                    setupTypes.join("، ")
                );

            }


            if (location) {

                messageParts.push(
                    "الموقع / المدينة: " +
                    location
                );

            }


            if (note) {

                messageParts.push(
                    "تفاصيل إضافية: " +
                    note
                );

            }


            const message =
                messageParts.join("\n");


            const whatsappNumber =
                "963988902539";

            const whatsappUrl =
                "https://wa.me/" +
                whatsappNumber +
                "?text=" +
                encodeURIComponent(message);


            window.open(
                whatsappUrl,
                "_blank",
                "noopener,noreferrer"
            );

        }
    );

})();