const adminLoginForm =
    document.getElementById("adminLoginForm");


const adminEmail =
    document.getElementById("adminEmail");


const adminPassword =
    document.getElementById("adminPassword");


const adminLoginButton =
    document.getElementById("adminLoginButton");


const adminLoginMessage =
    document.getElementById("adminLoginMessage");



// ==========================================
// تسجيل دخول المسؤول
// ==========================================

if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const email =
                adminEmail.value.trim();


            const password =
                adminPassword.value;


            if (!email || !password) {

                showLoginMessage(
                    "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
                    "error"
                );

                return;

            }


            adminLoginButton.disabled = true;

            adminLoginButton.textContent =
                "جاري تسجيل الدخول...";


            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email: email,
                            password: password
                        });


                if (error) {

                    throw error;

                }


                if (!data.user) {

                    throw new Error(
                        "تعذر الحصول على بيانات المستخدم."
                    );

                }


                // ==================================
                // التحقق من أن الحساب مسؤول
                // ==================================

                const {
                    data: isAdmin,
                    error: adminError
                } =
                    await supabaseClient
                        .rpc("is_admin");


                if (adminError) {

                    await supabaseClient.auth.signOut();

                    throw adminError;

                }


                if (!isAdmin) {

                    await supabaseClient.auth.signOut();

                    showLoginMessage(
                        "هذا الحساب لا يملك صلاحية الإدارة.",
                        "error"
                    );

                    return;

                }


                // ==================================
                // الدخول إلى لوحة التحكم
                // ==================================

                window.location.href =
                    "admin-dashboard.html";


            } catch (error) {

                console.error(
                    "Admin login error:",
                    error
                );


                showLoginMessage(
                    "بيانات تسجيل الدخول غير صحيحة أو حدث خطأ.",
                    "error"
                );


            } finally {

                adminLoginButton.disabled = false;

                adminLoginButton.textContent =
                    "تسجيل الدخول";

            }

        }
    );

}



// ==========================================
// رسالة تسجيل الدخول
// ==========================================

function showLoginMessage(
    message,
    type
) {

    if (!adminLoginMessage) return;


    adminLoginMessage.textContent =
        message;


    adminLoginMessage.className =
        "admin-login-message " + type;

}