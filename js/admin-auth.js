// ==========================================
// حماية لوحة الإدارة
// ==========================================

async function checkAdminAccess() {

    try {

        const {
            data: {
                session
            },
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {

            throw sessionError;

        }


        // لا يوجد تسجيل دخول

        if (!session) {

            window.location.href =
                "admin-login.html";

            return;

        }


        // ======================================
        // التحقق من صلاحية المسؤول
        // ======================================

        const {
            data: isAdmin,
            error: adminError
        } =
            await supabaseClient
                .rpc("is_admin");


        if (adminError) {

            throw adminError;

        }


        if (!isAdmin) {

            await supabaseClient.auth.signOut();

            window.location.href =
                "admin-login.html";

            return;

        }


        // ======================================
        // عرض البريد الإلكتروني
        // ======================================

        const emailElement =
            document.getElementById(
                "adminUserEmail"
            );


        if (
            emailElement &&
            session.user
        ) {

            emailElement.textContent =
                session.user.email;

        }


        // ======================================
        // تشغيل لوحة الإدارة
        // ======================================

        initializeAdminDashboard();


    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );


        window.location.href =
            "admin-login.html";

    }

}



// ==========================================
// التنقل بين أقسام لوحة الإدارة
// ==========================================

function initializeAdminDashboard() {


    const navItems =
        document.querySelectorAll(
            ".admin-nav-item"
        );


    const sections =
        document.querySelectorAll(
            ".admin-section"
        );


    navItems.forEach(
        button => {

            button.addEventListener(
                "click",
                function() {


                    const sectionName =
                        this.dataset.section;


                    // إزالة active من الأزرار

                    navItems.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    // إضافة active للزر الحالي

                    this.classList.add(
                        "active"
                    );


                    // إخفاء جميع الأقسام

                    sections.forEach(
                        section => {

                            section.classList.remove(
                                "active"
                            );

                        }
                    );


                    // إظهار القسم المطلوب

                    const targetSection =
                        document.getElementById(
                            sectionName +
                            "Section"
                        );


                    if (targetSection) {

                        targetSection.classList.add(
                            "active"
                        );

                    }

                }
            );

        }
    );

// ======================================
// فتح القسم المطلوب من الرابط
// ======================================

const requestedSection =
    new URLSearchParams(
        window.location.search
    ).get("section");


if (requestedSection) {

    const requestedButton =
        document.querySelector(
            `.admin-nav-item[data-section="${requestedSection}"]`
        );


    const requestedTarget =
        document.getElementById(
            requestedSection +
            "Section"
        );


    if (
        requestedButton &&
        requestedTarget
    ) {

        navItems.forEach(
            item => {

                item.classList.remove(
                    "active"
                );

            }
        );


        requestedButton.classList.add(
            "active"
        );


        sections.forEach(
            section => {

                section.classList.remove(
                    "active"
                );

            }
        );


        requestedTarget.classList.add(
            "active"
        );

    }

}

    // ======================================
    // تسجيل الخروج
    // ======================================

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function() {


                logoutButton.disabled =
                    true;


                logoutButton.textContent =
                    "جاري تسجيل الخروج...";


                const {
                    error
                } =
                    await supabaseClient.auth
                        .signOut();


                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );


                    logoutButton.disabled =
                        false;

                    logoutButton.textContent =
                        "تسجيل الخروج";

                    return;

                }


                window.location.href =
                    "admin-login.html";

            }
        );

    }

}



// ==========================================
// بدء التحقق
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    checkAdminAccess
);