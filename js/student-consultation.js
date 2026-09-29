 (function () {

            "use strict";

            const form =
                document.getElementById("studentConsultationForm");

            if (!form) return;


            /* ================================================
               SIDE MENU
            ================================================= */

            const menuToggle =
                document.getElementById("menuToggle");

            const sideMenu =
                document.getElementById("sideMenu");

            const sideMenuOverlay =
                document.getElementById("sideMenuOverlay");

            const sideMenuClose =
                document.getElementById("sideMenuClose");


            function openMenu() {

                if (!sideMenu) return;

                sideMenu.classList.add("open");
sideMenu.removeAttribute("inert");

                sideMenuOverlay?.classList.add("open");

                sideMenu.setAttribute(
                    "aria-hidden",
                    "false"
                );

                document.body.classList.add(
                    "side-menu-open"
                );
            }


            function closeMenu() {

                if (!sideMenu) return;

                sideMenu.classList.remove("open");
sideMenu.setAttribute("inert", "");

                sideMenuOverlay?.classList.remove("open");

                sideMenu.setAttribute(
                    "aria-hidden",
                    "true"
                );

                document.body.classList.remove(
                    "side-menu-open"
                );
            }


            menuToggle?.addEventListener(
                "click",
                openMenu
            );

            sideMenuClose?.addEventListener(
                "click",
                closeMenu
            );

            sideMenuOverlay?.addEventListener(
                "click",
                closeMenu
            );


            sideMenu
                ?.querySelectorAll("a")
                .forEach(function (link) {

                    link.addEventListener(
                        "click",
                        closeMenu
                    );

                });


            /* ================================================
               CONSULTATION TYPES
            ================================================= */

            const radios =
                form.querySelectorAll(
                    'input[name="consultation_type"]'
                );


            const dynamicGroup =
                document.getElementById(
                    "dynamicConsultationGroup"
                );


            const dynamicTitle =
                document.getElementById(
                    "dynamicTitle"
                );


            const dynamicDescription =
                document.getElementById(
                    "dynamicDescription"
                );


            const dynamicItems = {

                "اختيار أداة": {
                    element:
                        document.getElementById("toolDetails"),

                    title:
                        "ما الأداة التي تريد الاستفسار عنها؟",

                    description:
                        "اكتب اسم الأداة التي تريد معرفة المزيد عنها."
                },


                "مقارنة أدوات": {
                    element:
                        document.getElementById("comparisonDetails"),

                    title:
                        "الأدوات التي تريد مقارنتها",

                    description:
                        "اكتب الأدوات التي تريد معرفة الفرق بينها."
                },


                "أدوات سنة دراسية": {
                    element:
                        document.getElementById("toolDetails"),

                    title:
                        "الأدوات التي تفكر بها",

                    description:
                        "يمكنك كتابة أداة معينة أو توضيح طلبك في الرسالة."
                },


                "استشارة مادة": {
                    element:
                        document.getElementById("subjectDetails"),

                    title:
                        "ما المادة التي تحتاج فيها إلى المساعدة؟",

                    description:
                        "اكتب اسم المادة التي تريد الاستشارة بخصوصها."
                },


                "موضوع أو Chapter": {
                    element:
                        document.getElementById("topicDetails"),

                    title:
                        "حدد الموضوع الذي يشغلك",

                    description:
                        "تحديد المادة والموضوع يساعدنا على فهم سؤالك."
                },


                "استشارة عملية": {
                    element:
                        document.getElementById("practicalDetails"),

                    title:
                        "أخبرنا عن المرحلة العملية",

                    description:
                        "اكتب المرحلة أو التدريب وما الذي تحتاج إلى معرفته."
                },


                "استشارة عامة": {
                    element:
                        document.getElementById("generalDetails"),

                    title:
                        "ما موضوع الاستشارة؟",

                    description:
                        "اكتب باختصار المجال الذي تريد السؤال عنه."
                }

            };


            function clearDynamic() {

                form
                    .querySelectorAll(
                        ".student-dynamic-content"
                    )
                    .forEach(function (item) {

                        item.hidden = true;

                        item.classList.remove(
                            "is-visible"
                        );

                    });


                form
                    .querySelectorAll(
                        ".student-dynamic-content input"
                    )
                    .forEach(function (input) {

                        input.required = false;

                    });

            }


            function showDynamic(type) {

                clearDynamic();

                const config =
                    dynamicItems[type];


                if (!config || !config.element) {

                    dynamicGroup.hidden = true;

                    return;

                }


                dynamicGroup.hidden = false;


                dynamicTitle.textContent =
                    config.title;


                dynamicDescription.textContent =
                    config.description;


                config.element.hidden = false;


                requestAnimationFrame(function () {

                    config.element.classList.add(
                        "is-visible"
                    );

                });


                if (type === "اختيار أداة") {

                    document.getElementById(
                        "toolName"
                    ).required = true;

                }


                if (type === "مقارنة أدوات") {

                    document.getElementById(
                        "toolOne"
                    ).required = true;

                    document.getElementById(
                        "toolTwo"
                    ).required = true;

                }


                if (type === "استشارة مادة") {

                    document.getElementById(
                        "subjectName"
                    ).required = true;

                }


                if (type === "موضوع أو Chapter") {

                    document.getElementById(
                        "topicSubject"
                    ).required = true;

                    document.getElementById(
                        "topicName"
                    ).required = true;

                }


                if (type === "استشارة عملية") {

                    document.getElementById(
                        "practicalStage"
                    ).required = true;

                    document.getElementById(
                        "practicalNeed"
                    ).required = true;

                }


                if (type === "استشارة عامة") {

                    document.getElementById(
                        "generalTopic"
                    ).required = true;

                }

            }


            radios.forEach(function (radio) {

                radio.addEventListener(
                    "change",
                    function () {

                        form
                            .querySelectorAll(
                                ".student-consultation-option"
                            )
                            .forEach(function (option) {

                                option.classList.remove(
                                    "is-selected"
                                );

                            });


                        const parent =
                            radio.closest(
                                ".student-consultation-option"
                            );


                        parent?.classList.add(
                            "is-selected"
                        );


                        showDynamic(
                            radio.value
                        );

                    }
                );

            });


            /* ================================================
               WHATSAPP
            ================================================= */

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();


                    if (!form.checkValidity()) {

                        form.reportValidity();

                        return;

                    }


                    const data =
                        new FormData(form);


                    const name =
                        (data.get("student_name") || "")
                            .trim();


                    const university =
                        (data.get("university") || "")
                            .trim();


                    const year =
                        (data.get("academic_year") || "")
                            .trim();


                    const phone =
                        (data.get("student_phone") || "")
                            .trim();


                    const consultation =
                        (data.get("consultation_type") || "")
                            .trim();


                    const note =
                        (data.get("student_note") || "")
                            .trim();


                    const messageParts = [

                        "مرحبًا متجر اليُسرى،",

                        "",

                        "أرغب بطلب استشارة طلابية.",

                        "",

                        "الاسم: " + name,

                        "الجامعة: " + university,

                        "السنة الدراسية: " + year,

                        "نوع الاستشارة: " + consultation

                    ];


                    if (
                        consultation ===
                        "اختيار أداة"
                    ) {

                        const tool =
                            (data.get("tool_name") || "")
                                .trim();

                        if (tool) {

                            messageParts.push(
                                "اسم الأداة: " + tool
                            );

                        }

                    }


                    if (
                        consultation ===
                        "مقارنة أدوات"
                    ) {

                        const toolOne =
                            (data.get("tool_one") || "")
                                .trim();

                        const toolTwo =
                            (data.get("tool_two") || "")
                                .trim();


                        if (toolOne) {

                            messageParts.push(
                                "الأداة الأولى: " + toolOne
                            );

                        }


                        if (toolTwo) {

                            messageParts.push(
                                "الأداة الثانية: " + toolTwo
                            );

                        }

                    }


                    if (
                        consultation ===
                        "أدوات سنة دراسية"
                    ) {

                        const tool =
                            (data.get("tool_name") || "")
                                .trim();

                        if (tool) {

                            messageParts.push(
                                "الأداة / الاحتياج: " + tool
                            );

                        }

                    }


                    if (
                        consultation ===
                        "استشارة مادة"
                    ) {

                        const subject =
                            (data.get("subject_name") || "")
                                .trim();

                        if (subject) {

                            messageParts.push(
                                "اسم المادة: " + subject
                            );

                        }

                    }


                    if (
                        consultation ===
                        "موضوع أو Chapter"
                    ) {

                        const subject =
                            (data.get("topic_subject") || "")
                                .trim();

                        const topic =
                            (data.get("topic_name") || "")
                                .trim();


                        if (subject) {

                            messageParts.push(
                                "المادة: " + subject
                            );

                        }


                        if (topic) {

                            messageParts.push(
                                "الموضوع / Chapter: " + topic
                            );

                        }

                    }


                    if (
                        consultation ===
                        "استشارة عملية"
                    ) {

                        const stage =
                            (data.get("practical_stage") || "")
                                .trim();

                        const need =
                            (data.get("practical_need") || "")
                                .trim();


                        if (stage) {

                            messageParts.push(
                                "المرحلة / التدريب: " + stage
                            );

                        }


                        if (need) {

                            messageParts.push(
                                "الاحتياج: " + need
                            );

                        }

                    }


                    if (
                        consultation ===
                        "استشارة عامة"
                    ) {

                        const topic =
                            (data.get("general_topic") || "")
                                .trim();

                        if (topic) {

                            messageParts.push(
                                "موضوع الاستشارة: " + topic
                            );

                        }

                    }


                    if (note) {

                        messageParts.push(
                            "تفاصيل إضافية: " + note
                        );

                    }


                    messageParts.push(
                        "رقم التواصل: " + phone
                    );


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