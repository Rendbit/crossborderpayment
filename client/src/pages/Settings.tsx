import React, { useEffect, useState } from "react";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import SaveCardModal from "../components/save-card-modal/SaveCardModal";
import Cookies from "js-cookie";
import { FaChevronDown } from "react-icons/fa6";
import Alert from "../components/alert/Alert";
import { FiLoader } from "react-icons/fi";
import { BiCopy } from "react-icons/bi";
import { ImCheckboxChecked, ImCheckboxUnchecked } from "react-icons/im";

import Loader from "../components/loader/Loader";
import {
  exportPrivateKey,
  getProfile,
  getTwoFaSettings,
  setup2FA,
  toggle2FASettings,
  updatePassword,
  updateProfile,
  verifyMFACode,
} from "../function/user";

const Settings: React.FC = () => {
  const [showCountries, setShowCountries] = useState<any>(false);
  const [pinCode, setPinCode] = useState<any>("");

  const [showPrivateKey, setShowPrivateKey] = useState<any>(false);

  const [saveCardModal, setSaveCardModal] = useState<any>(false);
  const settingsTypeArray = [
    "Profile",
    "Password",
    "Privacy",
    "Two Factor Authentication",
  ];
  const [selectedTab, setSelectedTab] = useState<any>(settingsTypeArray[0]);
  const [selectedTabIndex, setSelectedTabIndex] = useState<any>(0);
  const [username, setUsername] = useState<any>("");
  const [email, setEmail] = useState<any>("");
  const [country, setCountry] = useState<any>("");

  const [password, setPassword] = useState<any>("");
  const [address, setAddress] = useState<any>("");
  const [confirmPassword, setConfirmPassword] = useState<any>("");
  const [oldPassword, setOldPassword] = useState<any>("");

  const [allCountries, setAllCountries] = useState<any>([]);
  const [loader, setLoader] = useState<any>(false);
  const [searchText, setSeacrhText] = useState<any>("");

  const [msg, setMsg] = useState<any>("");
  const [alertType, setAlertType] = useState<any>("");

  const [loading, setLoading] = useState<any>(false);
  const [fileUploadLoader, setfileUploadLoader] = useState<any>(false);
  const [currentFile, setCurrentFile] = useState<any>(null);
  const [currentImage, setCurrentImage] = useState<any>("/images/Avatar.svg");
  const [profilePicMsg, setProfilePicMsg] = useState<any>("");
  const [privateKey, setPrivateKey] = useState<any>("");
  const [revealPrivateKey, setRevealPrivateKey] = useState<any>(false);
  const [loadingUserData, setLoadingUserData] = useState<any>(false);
  const [multiFAInfo, setMultiFAInfo] = useState<any>();
  const [qrLoading, setQrLoading] = useState<any>(false);
  let [modal, setModal] = useState<any>("");
  const [multiFAInfoSetUp, setMultiFAInfoSetUp] = useState<any>();
  const [mfaCode, setMfaCode] = useState<any>("");
  const [verifyCodeLoader, setVerifyCodeLoader] = useState<any>(false);

  const user = Cookies.get("token");

  async function handleGetProfile() {
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");

    if (parsedUserData) {
      setAddress(parsedUserData?.stellarPublicKey);
      setUsername(parsedUserData?.username);
      setEmail(parsedUserData?.primaryEmail);
      setCountry(parsedUserData?.country);
      setCurrentImage(parsedUserData?.userProfileUrl);
    }

    if (!parsedUserData) {
      setLoadingUserData(true);
    }
    try {
      if (!user) {
        setLoadingUserData(false);
        return;
      }
      const response = await getProfile(user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoadingUserData(false);
        return;
      }
    } catch (error: any) {
      setMsg(error.message || "Failed to get profile details.");
      setAlertType("error");
    } finally {
      setLoadingUserData(false);
    }
  }

  async function handleExportPrivateKey() {
    setLoading(true);
    if (!pinCode) {
      setMsg("Please enter your PIN code");
      setAlertType("error");
      return;
    }

    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await exportPrivateKey(pinCode, user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setPrivateKey(response.data.privateKey);
      setShowPrivateKey(true);
      setRevealPrivateKey(false);
    } catch (error: any) {
      setMsg(error.message || "Failed to export private key.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function getAllCountries() {
    setLoader(true);
    const response = await fetch(
      "https://api.countrystatecity.in/v1/countries",
      {
        headers: {
          "X-CSCAPI-KEY":
            "VUJ1UU5aSmlLU2xiNEJxdUg0RnQ0akNZbXAyV2ZiVHlnN1F6dHA1dg==",
        },
      }
    );
    const data = await response.json();
    if (response) setLoader(false);
    setAllCountries(data);
    return data;
  }

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey);
    handleGetProfile();
    getAllCountries();
    handleGetTwoFaSettings();
  }, []);
  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey);
    setCountry(parsedUserData?.country);
    setUsername(parsedUserData?.username);
  }, [loading]);

  async function handleFileUpload() {
    // setCurrentFile(file);
    if (currentFile === null) {
      setMsg("Please select a file");
      setAlertType("error");
      return;
    }
    // if (currentFile) {
    //   const preview = URL.createObjectURL(currentFile);
    //   setPreviewUrl(preview);
    // }
    setfileUploadLoader(true);
    setProfilePicMsg("File Upload in progress, please do not refresh the page");
    const formData = new FormData();
    formData.append("file", currentFile);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/user/account/uploadProfileImage`,
      {
        method: "POST",
        body: formData,
        headers: {
          // 'Content-Type':'multipart/form-data',
          Authorization: `Bearer ${user}`,
          "Api-Key": `${process.env.NEXT_PUBLIC_API_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (res) {
      setCurrentFile(null);
      setfileUploadLoader(false);
    }
    if (res.ok) {
      setMsg("File uploaded successfully");
      setAlertType("success");
      setCurrentImage(data.data.image);
      profilePicUpdate(data.data.image);
    }
    if (!res.ok) {
      setMsg("File upload wasn't successfull");
      setAlertType("error");
    }
  }

  async function profilePicUpdate(imageUrl: string) {
    // setProfilePicMsg('Please hang on, while we update your profile image.')
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/user/account/profile-image`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user}`,
          "Api-Key": `${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          userProfileUrl: imageUrl,
        }),
      }
    );
    if (res) setfileUploadLoader(false);
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message);
      setAlertType("success");
      handleGetProfile();
    }
    if (!res.ok) {
      setMsg(data.message);
      setAlertType("error");
    }
  }

  async function handleUpdateProfile() {
    setLoading(true);
    if (!username) {
      setMsg("Please enter your username");
      setAlertType("error");
      return;
    }
    if (!country) {
      setMsg("Please enter your country");
      setAlertType("error");
      return;
    }
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await updateProfile(username, country, user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }
      setMsg(response.message);
      setAlertType("success");
      handleGetProfile();
    } catch (error: any) {
      setMsg(error.message || "Failed to update profile details.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword() {
    setLoading(true);
    if (!password || !confirmPassword || !oldPassword) {
      setMsg("Please fill all fields");
      setAlertType("error");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await updatePassword(password, oldPassword, user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(error.message || "Failed to update password.");
      setAlertType("error");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleGetTwoFaSettings() {
    setLoading(true);

    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await getTwoFaSettings(user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setMultiFAInfo(response.data);
    } catch (error: any) {
      setMsg(error.message || "Failed get MFA details.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle2fa() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await toggle2FASettings(user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      await handleGetTwoFaSettings();
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(error.message || "Failed toggle MFA.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup2FA() {
    setQrLoading(true);
    if (!mfaCode) {
      setMsg("MFA code is required.");
      setAlertType("error");
      return;
    }
    try {
      if (!user) {
        setQrLoading(false);
        return;
      }
      const response = await setup2FA(user, mfaCode);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setQrLoading(false);
        return;
      }
      setMultiFAInfoSetUp(response.data);
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(error.message || "Failed setup MFA.");
      setAlertType("error");
    } finally {
      setQrLoading(false);
    }
  }

  async function handleVerifyMFACode() {
    setVerifyCodeLoader(true);

    try {
      if (!user) {
        setVerifyCodeLoader(false);
        return;
      }
      const response = await verifyMFACode(user, mfaCode);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setVerifyCodeLoader(false);
        return;
      }
      await handleGetTwoFaSettings();
      setModal(false);
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(error.message || "Failed verify MFA.");
      setAlertType("error");
    } finally {
      setVerifyCodeLoader(false);
    }
  }

  return (
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="w-full lg:w-[84%] ml-auto mb-10">
          <TopNav />
          {loadingUserData ? (
            <div className="flex items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="px-[15px] h-[100%] lg:pl-12 pb-[30px] pt-[30px] mt-[70px] overflow-y-hidden md:mx-[30px]">
              <p className="text-[#ffffff] md:text-[25px] font-[500]">
                Settings
              </p>
              <div className="flex items-center  mt-7">
                {settingsTypeArray.map((item, index) => {
                  return (
                    <p
                      key={index}
                      className={`px-[.8rem] pb-[18px] font-[500] text-[#667085] cursor-pointer text-[14px] md:text-[16px] ${
                        selectedTabIndex === index
                          ? "text-white border-b border-white"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedTab(item);
                        setSelectedTabIndex(index);
                      }}
                    >
                      {item}
                    </p>
                  );
                })}
              </div>
              {selectedTab === "Profile" && (
                <div className="border border-white/50 rounded-md p-3 mt-2 w-full md:w-[500px]">
                  <div className="mt-7 pb-5">
                    <p className="text-[#ffffff] font-[500] text-[18px] mb-1">
                      Personal info
                    </p>
                    <p className="text-[#667085] font-[300]">
                      Update your personal details here.
                    </p>
                  </div>

                  {/* Username */}
                  <div className="grid  gap-2 py-[1rem]">
                    <div className="text-[#ffffff] font-[500] w-[180px]">
                      Username
                    </div>
                    <div className="w-full">
                      <input
                        value={username}
                        disabled={loading}
                        onChange={(e) => setUsername(e.target.value)}
                        type="text"
                        placeholder="username"
                        className="w-full bg-transparent border border-[#D0D5DD] px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-[#ffffff]"
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div className="grid  gap-2 py-[1rem] relative">
                    <div className="text-[#ffffff] font-[500] w-[180px]">
                      Country
                    </div>
                    <div className="w-full">
                      <div
                        onClick={() => setShowCountries(!showCountries)}
                        className="flex items-center justify-between border border-gray-300 p-2 rounded-[6px] cursor-pointer"
                      >
                        <input
                          type="text"
                          disabled
                          value={country}
                          placeholder="Nigeria"
                          className="outline-none bg-transparent w-full text-[white]"
                        />
                        <FaChevronDown className="text-white" />
                      </div>
                      {showCountries && !loading && (
                        <div className="bg-white w-full absolute z-10 top-[75px] rounded-[4px] border border-gray-300 h-[300px] overflow-y-scroll px-2 py-3">
                          <input
                            type="text"
                            onChange={(e) => setSeacrhText(e.target.value)}
                            disabled={loading}
                            placeholder="Search Country"
                            className="border bg-white text-black border-gray-300 w-full placeholder:text-[13px] text-[13px] outline-none px-[4px] rounded mb-1 py-[5px]"
                          />
                          <div>
                            {loader ? (
                              <div className="flex items-center justify-center flex-col gap-3 mt-[7rem]">
                                <FiLoader className="text-[28px] animate-spin" />
                                <p className="text-black text-[14px]">
                                  Fetching Countries Please Wait...
                                </p>
                              </div>
                            ) : (
                              allCountries
                                .filter((country) =>
                                  country.name
                                    .toLowerCase()
                                    .includes(searchText.toLowerCase())
                                )
                                .map((country, index) => (
                                  <div
                                    key={index}
                                    className="flex text-black items-center gap-2 hover:bg-gray-300 cursor-pointer p-[5px] text-[14px]"
                                    onClick={() => {
                                      setShowCountries(false);
                                      setCountry(country.name);
                                    }}
                                  >
                                    <p>{country.emoji}</p>
                                    <p>{country.name}</p>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="grid  gap-2 py-[1rem]">
                    <div className="text-[#ffffff] font-[500] w-[180px]">
                      Email address
                    </div>
                    <div className="w-full">
                      <input
                        value={email}
                        disabled
                        type="text"
                        placeholder="Enter your email"
                        className="border bg-transparent border-[#D0D5DD] px-[14px] py-[10px] w-full rounded-[8px] shadow-sm outline-none text-[#ffffff] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end mt-[2.5rem] gap-5">
                    <button className="bg-[#B3261E] border border-[#FFFFFF]/50 py-2 px-5 rounded-[8px] text-[#ffffff]">
                      Cancel
                    </button>
                    <button
                      className="bg-[#0E7BB2] border border-[#FFFFFF]/50 py-2 px-5 rounded-[8px] text-white"
                      onClick={handleUpdateProfile}
                      disabled={loading}
                    >
                      <span>Save</span>
                      {loading && (
                        <img
                          src="./images/loader.gif"
                          className="w-[20px] mx-2"
                          alt="loading"
                        />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedTab === "Password" && (
                <div className="border border-white/50 rounded-md p-4 mt-2 w-full md:w-[500px]">
                  <div className="mt-7 pb-5">
                    <p className="text-white font-medium text-[18px] mb-1">
                      Change password
                    </p>
                    <p className="text-[#667085] font-light">
                      Update your password here.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div>
                      <label className="block text-white font-medium mb-1">
                        Current Password
                      </label>
                      <input
                        onChange={(e) => setOldPassword(e.target.value)}
                        type="password"
                        disabled={loading}
                        placeholder="********"
                        className="w-full bg-transparent border border-[#D0D5DD] px-4 py-2.5 rounded-md shadow-sm outline-none text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-1">
                        New Password
                      </label>
                      <input
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        disabled={loading}
                        placeholder="********"
                        className="w-full bg-transparent border border-[#D0D5DD] px-4 py-2.5 rounded-md shadow-sm outline-none text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-1">
                        Confirm Password
                      </label>
                      <input
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        disabled={loading}
                        placeholder="********"
                        className="w-full bg-transparent border border-[#D0D5DD] px-4 py-2.5 rounded-md shadow-sm outline-none text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-10 gap-4">
                    <button
                      className="bg-[#B3261E] border border-white/50 py-2 px-6 rounded-md text-white"
                      onClick={() => {
                        // add cancel logic if needed
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      className="bg-[#0E7BB2] border border-white/50 py-2 px-6 rounded-md text-white flex items-center"
                      onClick={handleUpdatePassword}
                      disabled={loading}
                    >
                      <span>Save</span>
                      {loading && (
                        <img
                          src="./images/loader.gif"
                          className="w-5 h-5 ml-2"
                          alt="loading"
                        />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedTab === "Privacy" && (
                <div className="border border-white/50 rounded-md p-4 mt-2 w-full md:w-[500px]">
                  <div className="mt-7 pb-5">
                    <p className="text-white font-medium text-[18px] mb-1">
                      Privacy
                    </p>
                    <p className="text-[#667085] font-light">
                      Access your public & private key
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Export Public Key */}
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Export Public Key
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={address}
                          disabled
                          className="w-full bg-transparent border border-[#D0D5DD] px-4 py-2.5 rounded-md shadow-sm outline-none text-white"
                        />
                        <BiCopy
                          className="text-white cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(address);
                            setMsg("Address copied successfully!");
                            setAlertType("success");
                          }}
                        />
                      </div>
                    </div>

                    {/* Export Private Key */}
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Export Private Key
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          disabled
                          value={
                            showPrivateKey ? privateKey : "******************"
                          }
                          onChange={(e) =>
                            !showPrivateKey && setPinCode(e.target.value)
                          }
                          className="w-full bg-transparent border border-[#D0D5DD] px-4 py-2.5 rounded-md shadow-sm outline-none text-white"
                        />
                        <BiCopy
                          className="text-white cursor-pointer"
                          onClick={() => {
                            if (!showPrivateKey) {
                              setRevealPrivateKey(true);
                            } else {
                              navigator.clipboard.writeText(privateKey);
                              setMsg("Private key copied successfully!");
                              setAlertType("success");
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "Two Factor Authentication" && (
                <div className="border border-white/50 rounded-md p-3 mt-2 w-full md:w-[500px]">
                  <div className=" mt-7 pb-5">
                    <p className="text-[#ffffff] font-[500] text-[18px] mb-1">
                      Two Factor Authentication
                    </p>
                    <p className="text-[#667085] font-[300]">
                      Set up your two factor authentication here.
                    </p>
                  </div>
                  <div className="w-full">
                    {/* Toggle Multifactor Authentication */}
                    <div className="w-full md:flex grid py-[1.5rem] gap-4 items-center">
                      <div className="text-[#ffffff] font-[500] md:py-[1.5rem] w-[280px]">
                        Toggle Multifactor Authentication
                      </div>
                      <div>
                        {multiFAInfo?.isEnabled ? (
                          <label className="inline-flex items-center cursor-pointer relative">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              disabled={loading}
                              checked
                            />
                            <div
                              onClick={handleToggle2fa}
                              className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                            ></div>
                          </label>
                        ) : (
                          <label className="inline-flex items-center cursor-pointer relative">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              disabled
                            />
                            <div
                              onClick={handleToggle2fa}
                              className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                            ></div>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* MFA Setup Status */}
                    <div className="w-full md:flex grid py-[1.5rem] gap-4 items-center">
                      <div className="text-[#ffffff] font-[500] md:py-[1.5rem] w-[280px]">
                        Multifactor Authentication Setup?
                      </div>
                      <div>
                        {multiFAInfo?.isSetup ? (
                          <ImCheckboxChecked className="cursor-pointer text-primary-color" />
                        ) : (
                          <ImCheckboxUnchecked
                            className="cursor-pointer text-primary-color"
                            onClick={() => {
                              setModal("multiFAQrModal");
                              handleSetup2FA();
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-[2.5rem] gap-5">
                    <button className="bg-[#B3261E] border border-[#FFFFFF]/50] py-2 px-5 rounded-[8px] text-[#ffffff]">
                      Cancel
                    </button>

                    <button
                      className="bg-[#0E7BB2] border border-[#FFFFFF]/50 py-2 px-5 rounded-[8px] text-white"
                      onClick={handleUpdatePassword}
                      disabled={loading}
                    >
                      <span>Save</span>
                      {loading && (
                        <img
                          src="./images/loader.gif"
                          className="w-[20px] mx-2"
                          alt=""
                        />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal === "verify-code" && (
        <div className="border border-white/50 rounded-md p-3 mt-2">
          <div
            className="h-full w-full fixed top-0 left-0 z-[99]"
            style={{ background: "rgba(14, 14, 14, 0.58)" }}
            onClick={() => setModal(false)}
          ></div>
          <div
            className="bg-white fixed top-[50%] left-[50%] z-[100] rounded-[8px]"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <div className="bg-white p-10" style={{ borderRadius: "10px" }}>
              <p className="text-center text-gray-500 text-[14px]">
                Enter 6-digit code from your google authenticator app
              </p>
              <input
                type="text"
                placeholder="******"
                className="mt-5 w-full border border-[#D0D5DD] px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-[#ffffff]"
                onChange={(e) => setMfaCode(e.target.value)}
                disabled={verifyCodeLoader}
              />

              <button
                className="flex justify-center items-center bg-[#0E7BB2] border border-[#FFFFFF]/50 text-white py-[8px] px-8 rounded-[6px] mt-5 w-full text-[14px] lg:text-[16px]"
                onClick={handleVerifyMFACode}
                disabled={verifyCodeLoader}
              >
                Verify code
                {verifyCodeLoader && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "multiFAQrModal" && (
        <div className="border border-white/50 rounded-md p-4 mt-2">
          <div className="mt-7 pb-5">
            <p className="text-white font-medium text-[18px] mb-1">
              Two Factor Authentication
            </p>
            <p className="text-[#667085] font-light">
              Set up your two factor authentication here.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Toggle MFA */}
            <div>
              <label className="block text-white font-medium mb-2">
                Toggle Multifactor Authentication
              </label>
              <div>
                {multiFAInfo?.isEnabled ? (
                  <label className="inline-flex items-center cursor-pointer relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      disabled={loading}
                      checked
                    />
                    <div
                      onClick={handleToggle2fa}
                      className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                ) : (
                  <label className="inline-flex items-center cursor-pointer relative">
                    <input type="checkbox" className="sr-only peer" disabled />
                    <div
                      onClick={handleToggle2fa}
                      className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    ></div>
                  </label>
                )}
              </div>
            </div>

            {/* MFA Setup */}
            <div>
              <label className="block text-white font-medium mb-2">
                Multifactor Authentication Setup?
              </label>
              <div>
                {multiFAInfo?.isSetup ? (
                  <ImCheckboxChecked className="cursor-pointer text-primary-color" />
                ) : (
                  <ImCheckboxUnchecked
                    className="cursor-pointer text-primary-color"
                    onClick={() => {
                      setModal("multiFAQrModal");
                      handleSetup2FA();
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end mt-10 gap-5">
            <button className="bg-[#B3261E] border border-[#FFFFFF]/50 py-2 px-5 rounded-[8px] text-white">
              Cancel
            </button>

            <button
              className="bg-[#0E7BB2] border border-[#FFFFFF]/50 py-2 px-5 rounded-[8px] text-white flex items-center"
              onClick={handleUpdatePassword}
              disabled={loading}
            >
              <span>Save</span>
              {loading && (
                <img
                  src="./images/loader.gif"
                  className="w-[20px] mx-2"
                  alt="Loading"
                />
              )}
            </button>
          </div>
        </div>
      )}
      {saveCardModal && <SaveCardModal setSaveCardModal={setSaveCardModal} />}
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      {revealPrivateKey && (
        <div className="border border-white/50 rounded-md p-3 mt-2">
          <div
            className="h-full w-full fixed top-0 left-0 z-[99]"
            style={{ background: "rgba(14, 14, 14, 0.58)" }}
            onClick={() => setRevealPrivateKey(false)}
          ></div>
          <div
            className="bg-black lg:w-[500px] w-[90%] fixed top-[50%] left-[50%] z-[100] rounded-[8px]"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            {/* <div className="w-full bg-gradient-to-r from-primary-color to-blue-400 text-white p-4 rounded-t-[8px] flex flex-col items-start">
                      <p className="text-sm">Task 04</p>
                      <p className="text-2xl font-bold mt-2">Make your first deposit</p>
                  </div> */}
            <img
              src="./images/caution.svg"
              alt=""
              className="rounded-t-[11px] w-full"
            />
            {/* <div className='flex items-center justify-between mt-7 px-4 md:px-8'>
                      <div className='flex items-center gap-1 py-2 px-4 bg-[#899EFD1A]'>
                          <BsLightningChargeFill className='text-primary-color'/>
                          <p className='text-primary-color text-[10px]'>Task 01 </p>
                      </div>
                      <div className='bg-[#899EFD1A] inline-flex items-center rounded-md'>
                          <div className='flex items-center gap-1 border-r border-gray-300 py-2 px-4'>
                              <img src="./images/tag-user.svg" alt="" />
                              <p className='text-primary-color text-[10px]'>139181 Participants</p>
                          </div>
                          <div className='flex items-center gap-1 py-2 px-4'>
                              <img src="./images/cup-colored.svg" alt="" />
                              <p className='text-primary-color text-[10px]'>20 Tiers</p>
                          </div>
                      </div>
                  </div> */}
            <div className="md:px-8 px-4 mt-7 mb-[4rem] text-center">
              <p className="text-[18px] lg:text-[20px] text-[#F7931A] font-[500]">
                Caution:{" "}
              </p>
              <p className="text-[white] lg:text-[14px] text-[12px] font-[500]">
                Exporting your private key will reveal sensitive information
                about your wallet. Ensure you store it securely and never share
                it with anyone. Losing your private key may result in the
                permanent loss of your assets.
              </p>
            </div>
            <input
              type="password"
              onChange={(e) => setPinCode(e.target.value)}
              disabled={loading}
              placeholder="Provide your pin code"
              className="md:w-[80%] w-[90%] mx-auto block border border-[#FFFFFF]/50 px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-[white]"
            />
            <div className="flex flex-col items-center mt-10 gap-4 md:w-[80%] w-[90%] mx-auto mb-[2rem]">
              <button
                onClick={handleExportPrivateKey}
                disabled={loading}
                className="flex justify-center items-center bg-[#0E7BB2] border border-[#FFFFFF]/50 text-white py-2 px-8 rounded-[6px] w-full text-[14px] lgtext-[16px]"
              >
                <span>Yes, I understand</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>

              <button
                onClick={() => setRevealPrivateKey(false)}
                className="bg-[#B3261E] border border-[#FFFFFF]/50 py-2 px-8 rounded-[6px] w-full text-[14px] lgtext-[16px]"
              >
                No Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default Settings;
