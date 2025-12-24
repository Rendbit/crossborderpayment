import React, { useEffect, useState } from "react";
import { FiLoader } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa6";
import Alert from "../components/alert/Alert";
import Cookies from "js-cookie";
import OTPInput from "react-otp-input";
import { Link, useNavigate } from "react-router-dom";
import { createWallet } from "../function/auth";
import { User } from "lucide-react";
import AuthHeader from "../components/auth-nav/AuthHeader";
import AuthFooter from "../components/auth-nav/AuthFooter";

const AboutSelf: React.FC = () => {
  const [showCountries, setShowCountries] = useState<any>(false);
  const [allCountries, setAllCountries] = useState<any>([]);
  const [loader, setLoader] = useState<any>(false);
  const [searchText, setSeacrhText] = useState<any>("");
  const [transactionPin, setTransactionPin] = useState<any>("");
  const [confirmTransactionPin, setConfirmTransactionPin] = useState<any>("");
  const [userName, setUserName] = useState<any>("");
  const [country, setCountry] = useState<any>("");
  const [loading, setLoading] = useState<any>(false);
  const [msg, setMsg] = useState<any>("");
  const [alertType, setAlertType] = useState<any>("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) navigate("/dashboard");
  }, []);

  async function getAllCountruies() {
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
    getAllCountruies();
  }, []);

  async function handleAboutSelfCreation() {
    setLoading(true);
    if (!transactionPin || !confirmTransactionPin || !userName || !country) {
      setMsg("Please fill in all fields");
      setAlertType("error");
      setLoading(false);
      return;
    }
    if (transactionPin !== confirmTransactionPin) {
      setMsg("Transaction PINs do not match");
      setAlertType("error");
      setLoading(false);

      return;
    }

    try {
      const response = await createWallet(transactionPin, userName, country);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
        return;
      }

      navigate("/dashboard");
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      setMsg(error.message || "An error occurred during wallet creation.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative  bg-[#F9F9F9] dark:bg-gray-800">
      <AuthHeader />
      <main className="sm:mt-[3rem] md:mt-[2rem] mt-[30px] mx-3 md:px-24 relative">
        <img
          src="./image/Pattern.svg"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          alt=""
        />

        <div className="flex flex-col justify-center items-center relative z-[11]">
          <div className="bg-white dark:bg-gray-900 shadow shadow-[#585C5F1A] px-4 sm:px-6 pt-8 pb-5 rounded-[18px] w-full sm:w-[450px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./image/CustomRegisterIcon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px] mt-5"
              />
            </div>

            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[18px] dark:text-gray-300 md:text-[24px] text-[#0A0D14] mb-2">
                Create Your Wallet
              </h2>
              <p className="text-[#525866] dark:text-gray-300 text-[14px]">
                These details will help us set up your RendBit Wallet
              </p>
            </div>

            <form className="flex flex-col mt-[-10px] sm:w-[400px] mx-auto">
              <div className="w-[100%]">
                <label className="text-[#0A0D14] dark:text-gray-300 font-[500] text-[14px] mb-2 ml-1 block">
                  Username
                </label>
                <div className="border border-[#E2E4E9] text-[#868C98] px-2 py-[7px] rounded-[6px] gap-2 flex items-center justify-between w-full">
                  <User />
                  <input
                    type="text"
                    onChange={(e) => setUserName(e.target.value)}
                    disabled={loading}
                    placeholder="John Doe"
                    autoComplete="off"
                    name="username-field"
                    className="outline-none w-full"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="text-[#0A0D14] dark:text-gray-300 font-[500] text-[14px]  mb-1 block">
                  Create transaction Pin
                </label>
                <OTPInput
                  value={transactionPin}
                  inputType="number"
                  inputStyle={{ width: "100%" }}
                  onChange={setTransactionPin}
                  numInputs={4}
                  renderSeparator={
                    <span style={{ visibility: "hidden" }}>---</span>
                  }
                  renderInput={(props) => (
                    <input
                      {...props}
                      type="password"
                      placeholder="0"
                      className="text-center border-[#E2E4E9] text-[#868C98]  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  )}
                />
              </div>

              <div className="mt-5">
                <label className="text-[#0A0D14] dark:text-gray-300 font-[500] text-[14px]  mb-1 block">
                  Confirm transaction Pin
                </label>
                <OTPInput
                  value={confirmTransactionPin}
                  inputType="number"
                  onChange={setConfirmTransactionPin}
                  inputStyle={{ width: "100%" }}
                  numInputs={4}
                  renderSeparator={
                    <span style={{ visibility: "hidden" }}>---</span>
                  }
                  renderInput={(props) => (
                    <input
                      {...props}
                      placeholder="0"
                      type="password"
                      className="text-center  border-[#E2E4E9] text-[#868C98]  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  )}
                />
              </div>

              <div className="relative mt-5">
                <label className="text-[#0A0D14] dark:text-gray-300 font-[500] text-[14px]  mb-1 block">
                  Country
                </label>
                <div
                  onClick={() => setShowCountries(!showCountries)}
                  className="flex cursor-pointer items-center justify-between border border-[#E2E4E9] p-2 rounded-[6px] w-full"
                >
                  <input
                    type="text"
                    value={country}
                    placeholder="Select country"
                    readOnly
                    tabIndex={-1}
                    className="outline-none w-full  cursor-pointer text-[#868C98] placeholder:text-[var(--text-muted)]"
                  />

                  <FaChevronDown className="cursor-pointer text-gray-300" />
                </div>
                {showCountries && (
                  <div className="bg-[#F9F9F9] dark:bg-gray-800 w-full absolute top-[75px] rounded-[4px] border border-[white]/50 h-[300px] overflow-x-hidden overflow-y-scroll left-0 px-2 py-3">
                    <input
                      type="text"
                      onChange={(e) => setSeacrhText(e.target.value)}
                      placeholder="Search Country"
                      className="border border-gray-300 text-[#868C98] w-full placeholder:text-[13px] text-[13px] outline-none px-[4px] rounded mb-1 py-[5px]"
                    />
                    <div className="bg-[#F9F9F9] dark:bg-gray-800">
                      {loader ? (
                        <div className="flex items-center justify-center flex-col gap-3 mt-[7rem]">
                          <FiLoader className="text-[28px] animate-spin" />
                          <p className="text-[#868C98] text-[14px]">
                            Fetching Countries Please Wait...
                          </p>
                        </div>
                      ) : (
                        <>
                          {allCountries
                            .filter((country) =>
                              country.name
                                .toLowerCase()
                                .includes(searchText.toLowerCase())
                            )
                            .map((country, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer p-[5px] text-[14px] text-[#868C98]"
                                onClick={() => {
                                  setShowCountries(!showCountries);
                                  setCountry(country.name);
                                }}
                              >
                                <p className="text-[#868C98]">
                                  {country.emoji}
                                </p>
                                <p className="text-[#868C98]">{country.name}</p>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleAboutSelfCreation}
                disabled={loading}
                className="bg-[#0E7BB2] cursor-pointer flex justify-center items-center text-white py-2 px-4 rounded-md mt-7"
              >
                <span>Confirm</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>
              <div className="text-center text-[#868C98] sm:mt-[70px] text-[14px]">
                <p className="text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#0E7BB2]">
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
      <AuthFooter />
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default AboutSelf;
