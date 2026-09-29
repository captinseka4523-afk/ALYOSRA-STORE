// =====================================================
// AL YOSRA STORE — INDEX PAGE JAVASCRIPT
// =====================================================


// =====================================================
// POLICY MODAL
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const modal =
        document.getElementById("policyModal");

    const modalTitle =
        document.getElementById("policyModalTitle");

    const modalContent =
        document.getElementById("policyModalContent");

    const closeBtn =
        document.getElementById("policyModalClose");


    // نصوص السياسات المحدثة لمتجر اليُسرى
    const policiesData = {

        privacy: {
            title: "سياسة الخصوصية",
            content: `
                <p><strong>نحترم خصوصيتك ونحمي بياناتك</strong></p>
                <p>في متجر اليُسرى (Al Yosra Store)، نؤمن أن الثقة تبدأ من الحفاظ على سرية معلوماتك. نجمع البيانات الأساسية فقط (مثل الاسم، رقم الهاتف، وعنوان الاستلام) بهدف تسهيل تجهيز وتوصيل طلباتكم بدقة.</p>
                <p>نحن نلتزم عدم مشاركة أو بيع بياناتك لأي طرف ثالث، وتُستخدم معلوماتك حصرياً داخل إطار خدمة المتجر وتطوير تجربتكم معنا.</p>
            `
        },

        returns: {
            title: "سياسة الاستبدال والاسترجاع",
            content: `
                <p><strong>ضمان الجودة وراحة البال</strong></p>
                <p>حرصاً منا على تقديم أداة عمل تليق بدراستكم وعياداتكم:</p>
                <ul>
                    <li>يُحَق للعميل طلب استبدال أو استرجاع المنتج خلال <strong>3 أيام</strong> من تاريخ الاستلام.</li>
                    <li>يُشترط أن يكون المنتج بحالته الأصلية تماماً، غير مستخدم، وفي غلافه الأصلي مع إبراز فاتورة الشراء.</li>
                    <li>المنتجات التي تم فتحها أو استخدامها وتضررت بسبب سوء الاستخدام لا تتيح للمستخدم الاسترجاع أو الاستبدال.</li>
                    <li>في حال وجود عيب مصنعي في الأداة أو المنتج، يتحمل المتجر كامل تكاليف الاستبدال.</li>
                </ul>
            `
        },

        shipping: {
            title: "سياسة الشحن والتوصيل",
            content: `
                <p><strong>خدمة التوصيل الحالية</strong></p>
                <p>نود إعلام عملائنا الكرام أنه <strong>لا يوجد حالياً شحن أو توصيل للمحافظات الأخرى</strong>، حيث نركز جهودنا حالياً على تقديم أفضل خدمة سرعة وجودة.</p>
                <p>عمليات التوصيل والخدمات مقتصرة في الوقت الحالي على <strong>دمشق وريفها</strong> فقط، لتلبية احتياجات الطلاب والعيادات بأسرع وقت ممكن. تابعونا لمعرفة توسع نطاق خدماتنا في القريب العاجل.</p>
            `
        },

        terms: {
            title: "الشروط والأحكام",
            content: `
                <p><strong>شروط استخدام المتجر</strong></p>
                <p>باستهلاكك أو طلبك لأي منتج من متجر اليُسرى، فإنك توافق على الشروط التالية:</p>
                <ul>
                    <li><strong>الأسعار والتوفر:</strong> أسعار المنتجات قابلة للتحديث بناءً على السوق، ونبذل قصارى جهدنا لضمان دقة الأسعار والمواصفات المعروضة.</li>
                    <li><strong>الملكية الفكرية:</strong> جميع التصاميم، النصوص، والشعارات الخاصة بمتجر اليُسرى هي ملكية حصرية للمتجر ولا يُسمح باستهلاكها دون إذن مسبق.</li>
                    <li><strong>المسؤولية:</strong> المتجر يقدم استشارات ومستلزمات طبية وأكاديمية، ويبقى استخدام الأدوات في الممارسة العملية مسؤولية الطبيب أو المستخدم.</li>
                </ul>
            `
        }

    };


    function openPolicy(policyKey) {

        const data =
            policiesData[policyKey];

        if (!data) {
            return;
        }

        modalTitle.textContent =
            data.title;

        modalContent.innerHTML =
            data.content;

        modal.hidden = false;

        requestAnimationFrame(() => {
            modal.classList.add("open");
        });

    }


    function closePolicy() {

        modal.classList.remove("open");

        setTimeout(
            () => modal.hidden = true,
            300
        );

    }


    // ربط الأزرار بالحدث

    document
        .getElementById("privacyPolicyBtn")
        ?.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                openPolicy("privacy");
            }
        );


    document
        .getElementById("returnsPolicyBtn")
        ?.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                openPolicy("returns");
            }
        );


    document
        .getElementById("shippingPolicyBtn")
        ?.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                openPolicy("shipping");
            }
        );


    document
        .getElementById("termsBtn")
        ?.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                openPolicy("terms");
            }
        );


    closeBtn?.addEventListener(
        "click",
        closePolicy
    );


    modal?.addEventListener(
        "click",
        (e) => {

            if (e.target === modal) {
                closePolicy();
            }

        }
    );


    document.addEventListener(
        "keydown",
        (e) => {

            if (e.key === "Escape") {
                closePolicy();
            }

        }
    );

});



// =====================================================
// SIDE MENU + PAGE REVEALS
// =====================================================

(function () {

    "use strict";


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

        sideMenu.setAttribute(
            "inert",
            ""
        );

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



    /* =================================================
       REVEAL SECTIONS
    ================================================= */

    const sections =
        document.querySelectorAll(
            ".reveal-section"
        );


    if (
        "IntersectionObserver"
        in window
    ) {

        const observer =
            new IntersectionObserver(
                function (entries) {

                    entries.forEach(
                        function (entry) {

                            if (
                                entry.isIntersecting
                            ) {

                                entry.target.classList.add(
                                    "is-visible"
                                );

                                observer.unobserve(
                                    entry.target
                                );

                            }

                        }
                    );

                },
                {
                    threshold: 0.12,
                    rootMargin:
                        "0px 0px -8% 0px"
                }
            );


        sections.forEach(
            function (section) {

                observer.observe(
                    section
                );

            }
        );


        /* =================================================
           ABOUT STAT COUNTERS
        ================================================= */

        const aboutStats =
            document.querySelector(
                ".about-stats"
            );


        if (aboutStats) {

            const stats =
                aboutStats.querySelectorAll(
                    ".about-stat"
                );


            function animateStat(stat, delay) {

                window.setTimeout(
                    function () {

                        stat.classList.add(
                            "is-stat-visible"
                        );

                        const number =
                            stat.querySelector(
                                ".about-stat-number"
                            );

                        const target =
                            Number(
                                stat.dataset.statTarget
                            );

                        const suffix =
                            stat.dataset.statSuffix || "";


                        if (
                            !number ||
                            !Number.isFinite(target)
                        ) {
                            return;
                        }


                        const duration = 1400;

                        const startTime =
                            performance.now();


                        function updateCounter(
                            currentTime
                        ) {

                            const elapsed =
                                currentTime -
                                startTime;


                            const progress =
                                Math.min(
                                    elapsed / duration,
                                    1
                                );


                            const eased =
                                1 -
                                Math.pow(
                                    1 - progress,
                                    3
                                );


                            const currentValue =
                                Math.round(
                                    target * eased
                                );


                            number.textContent =
                                currentValue.toLocaleString(
                                    "en-US"
                                ) + suffix;


                            if (
                                progress < 1
                            ) {

                                requestAnimationFrame(
                                    updateCounter
                                );

                            } else {

                                number.textContent =
                                    target.toLocaleString(
                                        "en-US"
                                    ) + suffix;

                            }

                        }


                        requestAnimationFrame(
                            updateCounter
                        );

                    },
                    delay
                );

            }


            const aboutObserver =
                new IntersectionObserver(
                    function (entries) {

                        entries.forEach(
                            function (entry) {

                                if (
                                    !entry.isIntersecting
                                ) {
                                    return;
                                }


                                stats.forEach(
                                    function (stat, index) {

                                        animateStat(
                                            stat,
                                            index * 450
                                        );

                                    }
                                );


                                aboutObserver.unobserve(
                                    entry.target
                                );

                            }
                        );

                    },
                    {
                        threshold: 0.18
                    }
                );


            aboutObserver.observe(
                aboutStats
            );

        }

    } else {

        sections.forEach(
            function (section) {

                section.classList.add(
                    "is-visible"
                );

            }
        );

    }



    /* =================================================
       SAFETY FALLBACK
       يمنع بقاء محتوى الأقسام مخفيًا إذا تعذر
       تشغيل IntersectionObserver.
    ================================================= */

    window.setTimeout(
        function () {

            sections.forEach(
                function (section) {

                    if (
                        !section.classList.contains(
                            "is-visible"
                        )
                    ) {

                        const rect =
                            section.getBoundingClientRect();


                        if (
                            rect.top <
                            window.innerHeight
                        ) {

                            section.classList.add(
                                "is-visible"
                            );

                        }

                    }

                }
            );

        },
        1800
    );


})();