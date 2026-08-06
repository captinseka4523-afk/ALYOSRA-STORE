document.getElementById("mainButton").addEventListener("click", function () {

    const target = document.getElementById("products");

    const start = window.scrollY;
    const end = target.offsetTop;
    const distance = end - start;

    let startTime = null;

    function animation(currentTime) {

        if (startTime === null) {
            startTime = currentTime;
        }

        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / 800, 1);

        const ease = progress * (2 - progress);

        window.scrollTo(0, start + distance * ease);

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);

});

