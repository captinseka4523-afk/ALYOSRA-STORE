const adminLoginForm =
    document.getElementById("adminLoginForm");


const adminEmail =
    document.getElementById("adminEmail");


const adminPassword =
    document.getElementById("adminPassword");


const adminLoginButton =
    document.getElementById("adminLoginButton");


const adminPasskeyButton =
    document.getElementById("adminPasskeyButton");


const adminLoginMessage =
    document.getElementById("adminLoginMessage");



// ==========================================
// تسجيل دخول المسؤول باستخدام كلمة المرور
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

            adminPasskeyButton.disabled = true;

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

                adminPasskeyButton.disabled = false;

                adminLoginButton.textContent =
                    "تسجيل الدخول";

            }

        }
    );

}



// ==========================================
// تسجيل دخول المسؤول باستخدام Passkey
// ==========================================

if (adminPasskeyButton) {

    adminPasskeyButton.addEventListener(
        "click",
        async function() {

            if (adminPasskeyButton.disabled) {
                return;
            }


            adminPasskeyButton.disabled = true;

            adminLoginButton.disabled = true;

            adminPasskeyButton.textContent =
                "جاري التحقق...";


            showLoginMessage(
                "يرجى إكمال التحقق باستخدام Passkey.",
                "info"
            );


            try {

                // ==================================
                // تسجيل الدخول باستخدام Passkey
                // ==================================

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPasskey();


                if (error) {

                    throw error;

                }


                if (!data || !data.user) {

                    throw new Error(
                        "تعذر الحصول على بيانات المستخدم بعد التحقق."
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
                    "Admin Passkey login error:",
                    error
                );


                let message =
                    "تعذر تسجيل الدخول باستخدام Passkey.";


                if (
                    error &&
                    error.message
                ) {

                    const errorMessage =
                        error.message.toLowerCase();


                    if (
                        errorMessage.includes(
                            "not supported"
                        ) ||
                        errorMessage.includes(
                            "webAuthn".toLowerCase()
                        )
                    ) {

                        message =
                            "هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول باستخدام Passkey.";

                    }

                    else if (
                        errorMessage.includes(
                            "cancel"
                        ) ||
                        errorMessage.includes(
                            "abort"
                        )
                    ) {

                        message =
                            "تم إلغاء عملية التحقق باستخدام Passkey.";

                    }

                }


                showLoginMessage(
                    message,
                    "error"
                );


            } finally {

                adminPasskeyButton.disabled = false;

                adminLoginButton.disabled = false;

                adminPasskeyButton.textContent =
                    "الدخول باستخدام Passkey";

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