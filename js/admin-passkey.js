// ==========================================
// إدارة Passkey للمسؤول
// ==========================================

const registerPasskeyButton =
    document.getElementById(
        "registerPasskeyButton"
    );



// ==========================================
// تسجيل Passkey لهذا الجهاز
// ==========================================

if (registerPasskeyButton) {

    registerPasskeyButton.addEventListener(
        "click",
        async function() {

            if (registerPasskeyButton.disabled) {
                return;
            }


            registerPasskeyButton.disabled = true;

            const originalText =
                registerPasskeyButton.textContent;


            registerPasskeyButton.textContent =
                "جاري إضافة Passkey...";


            try {

                // ==================================
                // التأكد من وجود جلسة حالية
                // ==================================

                const {
                    data: {
                        session
                    },
                    error: sessionError
                } =
                    await supabaseClient.auth
                        .getSession();


                if (sessionError) {

                    throw sessionError;

                }


                if (!session) {

                    throw new Error(
                        "لا توجد جلسة تسجيل دخول."
                    );

                }


                // ==================================
                // التأكد من صلاحية المسؤول
                // ==================================

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


                // ==================================
                // تسجيل Passkey
                // ==================================

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth
                        .registerPasskey();


                if (error) {

                    throw error;

                }


                if (!data) {

                    throw new Error(
                        "لم يتم الحصول على نتيجة تسجيل Passkey."
                    );

                }


                // ==================================
                // نجاح التسجيل
                // ==================================

                showAdminPasskeyMessage(
                    "تمت إضافة Passkey بنجاح. يمكن الآن استخدامه لتسجيل الدخول.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Admin Passkey registration error:",
                    error
                );


                let message =
                    "تعذر إضافة Passkey.";


                if (
                    error &&
                    error.message
                ) {

                    const errorMessage =
                        error.message.toLowerCase();


                    if (
                        errorMessage.includes(
                            "cancel"
                        ) ||
                        errorMessage.includes(
                            "abort"
                        )
                    ) {

                        message =
                            "تم إلغاء عملية إضافة Passkey.";

                    }

                    else if (
                        errorMessage.includes(
                            "not supported"
                        ) ||
                        errorMessage.includes(
                            "webauthn"
                        )
                    ) {

                        message =
                            "هذا الجهاز أو المتصفح لا يدعم Passkey.";

                    }

                    else if (
                        errorMessage.includes(
                            "invalid domain"
                        )
                    ) {

                        message =
                            "لا يمكن تسجيل Passkey من هذا النطاق. يجب استخدام نطاق المتجر المسموح به.";

                    }

                }


                showAdminPasskeyMessage(
                    message,
                    "error"
                );


            } finally {

                registerPasskeyButton.disabled =
                    false;

                registerPasskeyButton.textContent =
                    originalText;

            }

        }
    );

}



// ==========================================
// رسالة Passkey
// ==========================================

function showAdminPasskeyMessage(
    message,
    type
) {

    let messageElement =
        document.getElementById(
            "adminPasskeyMessage"
        );


    if (!messageElement) {

        messageElement =
            document.createElement("div");

        messageElement.id =
            "adminPasskeyMessage";

        messageElement.className =
            "admin-passkey-message";


        const headerActions =
            document.querySelector(
                ".admin-header-actions"
            );


        if (headerActions) {

            headerActions.appendChild(
                messageElement
            );

        }

    }


    messageElement.textContent =
        message;


    messageElement.className =
        "admin-passkey-message " + type;


    window.setTimeout(
        function() {

            if (messageElement) {

                messageElement.textContent =
                    "";

                messageElement.className =
                    "admin-passkey-message";

            }

        },
        6000
    );

}