document.addEventListener(
    "DOMContentLoaded",
    function () {

        const navbar =
            document.querySelector(".navbar");

        if (!navbar) {
            return;
        }


        function updateNavbar() {

            navbar.classList.toggle(
                "is-scrolled",
                window.scrollY > 40
            );

        }


        window.addEventListener(
            "scroll",
            updateNavbar,
            {
                passive: true
            }
        );


        updateNavbar();

    }
);