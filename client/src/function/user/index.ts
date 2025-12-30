const getProfile = async (token: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/user/profile`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      
      throw new Error(data.message || "Failed to fetch profile");
    }
    localStorage.setItem("userData", JSON.stringify(data.data));
    return data;
  } catch (error: any) {
    console.log("Error handling get profile:", error);
    throw new Error(error.message || "Error handling get profile");
  }
};

const getReferralsLeaderBoard = async (
  token: string,
  limit: number,
  page: number
) => {
  try {
    const res = await fetch(
      `${
        import.meta.env.VITE_BASE_URL
      }/user/referral-leaderboard?limit=${limit}&page=${page}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch referral leader board");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling get referral leader board:", error);
    throw new Error(
      error.message || "Error handling get referral leader board"
    );
  }
};

const getReferrals = async (token: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/user/referrals`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch referrals");
    }

    return data;
  } catch (error: any) {
    console.log("Error fetching referrals:", error);
    throw new Error(error.message || "Error fetching referrals");
  }
};

const exportPrivateKey = async (pinCode: string, token: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/user/export-private-key`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ pinCode }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to export private key");
    }
    return data;
  } catch (error: any) {
    console.log("Error handling export private key:", error);
    throw new Error(error.message || "Error handling export private key");
  }
};

const updateProfileImage = async (imageUrl: string, token: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/user/update-profile-image`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ userProfileUrl: imageUrl }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to update profile picture");
    }

    return data;
  } catch (error: any) {
    console.log("Error updating profile picture:", error);
    throw new Error(error.message || "Error updating profile picture");
  }
};

const updateProfile = async (
  username: string,
  country: string,
  token: string
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/user/update-profile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ username, country }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to update profile");
    }

    return data;
  } catch (error: any) {
    console.log("Error updating profile:", error);
    throw new Error(error.message || "Error updating profile");
  }
};

const updatePassword = async (
  password: string,
  oldPassword: string,
  token: string
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/user/change-password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({ oldPassword, password }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to update password");
    }

    return data;
  } catch (error: any) {
    console.log("Error updating password:", error);
    throw new Error(error.message || "Error updating password");
  }
};

const getTwoFaSettings = async (token: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/mfa/settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch 2FA settings");
    }

    return data;
  } catch (error: any) {
    console.log("Error fetching 2FA settings:", error);
    throw new Error(error.message || "Error fetching 2FA settings");
  }
};

const toggle2FASettings = async (token: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/mfa/toggle`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to toggle 2FA");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling toggle 2FA:", error);
    throw new Error(error.message || "Error handling toggle 2FA.");
  }
};

const setup2FA = async (token: string, code: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/mfa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to setup 2FA");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling setup 2FA:", error);
    throw new Error(error.message || "Error handling setup 2FA");
  }
};

const generateSecret = async (token: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/mfa/generate-secret`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to generate secret.");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling generate secret:", error);
    throw new Error(error.message || "Error handling generate secret.");
  }
};

const verifyMFACode = async (token: string, code: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to verify MFA code");
    }

    return data;
  } catch (error: any) {
    console.log("Error verifying MFA code:", error);
    throw new Error(error.message || "Error verifying MFA code");
  }
};

export {
  getProfile,
  exportPrivateKey,
  updateProfileImage,
  toggle2FASettings,
  updateProfile,
  updatePassword,
  getTwoFaSettings,
  getReferralsLeaderBoard,
  setup2FA,
  generateSecret,
  verifyMFACode,
  getReferrals,
};
