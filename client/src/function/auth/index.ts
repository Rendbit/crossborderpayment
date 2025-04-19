import Cookies from "js-cookie";

const register = async (
  email: string,
  password: string,
  captchaValue?: string
) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        captcha: captchaValue,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to register");
    }
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("reg-email", email);
    return data;
  } catch (error: any) {
    console.log("Error handling register: ", error);
    throw new Error(error.message || "Error handling register");
  }
};

const googleLogin = async () => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/google/redirect`,
      {
        method: "GET",
        headers: {
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to login with google");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling google login: ", error);
    throw new Error(error.message || "Error handling google login");
  }
};

const signIn = async (
  email: string,
  password: string,
  mfaCode?: string,
  captchaValue?: string
) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        code: mfaCode,
        captcha: captchaValue,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to signin");
    }
    if (res.ok && data?.data?.isEmailVerified === false) {
      localStorage.setItem("reg-email", email);
    }
    if (res.ok && data?.data?.stellarPublicKey === undefined) {
      localStorage.setItem("token", data.data.token);
    }
    if (res.ok && data?.data?.stellarPublicKey) {
      Cookies.set("token", data.data.token);
      const { ...safeData } = data;
      localStorage.setItem("userData", JSON.stringify(safeData));
    }
    return data;
  } catch (error: any) {
    console.log("Error handling signin: ", error);
    throw new Error(error.message || "Error handling signin");
  }
};

const createWallet = async (
  transactionPin: string,
  username: string,
  country: string
) => {
  console.log(localStorage.getItem("token"));
  console.log({ pinCode: transactionPin, username, country });
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/create-wallet`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          pinCode: transactionPin,
          username,
          country,
        }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to complete profile.");
    }
    Cookies.set("token", data?.data?.token);
    const { password, token, ...safeData } = data;
    localStorage.setItem("userData", JSON.stringify(safeData));
    localStorage.removeItem("token");
    return data;
  } catch (error: any) {
    console.log("Error handling create wallet: ", error);
    throw new Error(error.message || "Error handling create wallet.");
  }
};

const verifyEmail = async (otp: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/verify-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ otp: otp }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to verify email.");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling verify email: ", error);
    throw new Error(error.message || "Error handling verify email.");
  }
};

const resendEmailOtp = async (email: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/resend-verify-email-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to resend OTP to your email.");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling resend email OTP: ", error);
    throw new Error(error.message || "Error handling resend email OTP.");
  }
};

const passwordReset = async (otp: string, email: string, password: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          otp,
          password,
          email,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to reset password.");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling password reset: ", error);
    throw new Error(error.message || "Error handling password reset.");
  }
};

const resendForgotPasswordOtp = async (email: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/resend-forgot-password-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to resend forgot password OTP.");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling resend forgot password OTP: ", error);
    throw new Error(
      error.message || "Error handling resend forgot password OTP."
    );
  }
};

const forgotPassword = async (email: string) => {
  try {
    localStorage.setItem("forgot-password-email", email);
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.message || "Failed to initiate forgot password process."
      );
    }
    return data;
  } catch (error: any) {
    console.log("Error handling forgot password: ", error);
    throw new Error(error.message || "Error handling forgot password.");
  }
};
export {
  register,
  googleLogin,
  signIn,
  createWallet,
  verifyEmail,
  resendEmailOtp,
  passwordReset,
  resendForgotPasswordOtp,
  forgotPassword,
};
