import React, { useEffect, useState } from "react";
import { FiLoader } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa6";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import Cookies from "js-cookie";
import OTPInput from "react-otp-input";
import { Link, useNavigate } from "react-router-dom";
import { createWallet } from "../function/auth";

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
        return;
      }

      navigate("/dashboard");
    } catch (error: any) {
      setMsg(error.message || "An error occurred during wallet creation.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <AuthNav />
      <div className="sm:mt-[12rem] h-[100%] mx-3">
        <h2 className="text-[24px] text-white font-semibold mb-2 text-center">
          Create Your Wallet
        </h2>
        <div className="mt-5 flex flex-col justify-center items-center relative z-[11]">
          <div className="border border-[white]/50 px-4 sm:px-8 pt-8 pb-5 rounded-[16px] w-full max-w-[488px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./images/favicon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px]"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] mb-2 text-white">RendBit</h2>
              <p className="text-white sm:text-[14px] text-[12px]">
                These details will help us set up your RendBit Wallet
              </p>
            </div>
            <form className="flex flex-col mt-[-10px] sm:w-[400px] mx-auto">
              <div className="my-7">
                <label className="text-[#ffffff] font-[500] text-[14px] mb-1 block">
                  Username
                </label>
                <input
                  type="text"
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your nickname"
                  autoCapitalize="off"
                  className="border border-[white]/50 bg-white/8 autofill:bg-white/8 autofill:shadow-[0_0_0px_1000px_rgba(0,0,0,0)]  p-2 rounded-[6px] w-full outline-none text-white"
                />
              </div>

              <div>
                <label className="text-[#ffffff] font-[500] text-[14px] mb-1 block">
                  Create transaction Pin
                </label>
                <OTPInput
                  value={transactionPin}
                  inputType="number"
                  inputStyle={{ width: "80px" }}
                  onChange={setTransactionPin}
                  numInputs={4}
                  renderSeparator={
                    <span style={{ visibility: "hidden" }}>---</span>
                  }
                  renderInput={(props) => (
                    <input
                      {...props}
                      placeholder="0"
                      className="text-center text-white bg-white/8  border-[white]/50  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  )}
                />
              </div>

              <div className="my-7">
                <label className="text-[#ffffff] font-[500] text-[14px] mb-1 block">
                  Confirm transaction Pin
                </label>
                <OTPInput
                  value={confirmTransactionPin}
                  inputType="number"
                  onChange={setConfirmTransactionPin}
                  inputStyle={{ width: "80px" }}
                  numInputs={4}
                  renderSeparator={
                    <span style={{ visibility: "hidden" }}>---</span>
                  }
                  renderInput={(props) => (
                    <input
                      {...props}
                      placeholder="0"
                      className="text-center otp-input border-[white]/50 bg-white/8 text-white text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  )}
                />
              </div>

              <div className="relative">
                <label className="text-[#ffffff] font-[500] text-[14px] mb-1 block">
                  Country
                </label>
                <div
                  onClick={() => setShowCountries(!showCountries)}
                  className="flex cursor-pointer items-center justify-between border border-[white]/50 p-2 rounded-[6px] w-full"
                >
                  <input
                    type="text"
                    defaultValue={country}
                    placeholder="Nigeria"
                    autoComplete="off"
                    className="outline-none  w-full text-white autofill:bg-transparent autofill:shadow-[0_0_0px_1000px_rgba(0,0,0,0)]"
                  />
                  <FaChevronDown className="cursor-pointer text-gray-300" />
                </div>
                {showCountries && (
                  <div className="bg-white w-full absolute top-[75px] rounded-[4px] border border-[white]/50 h-[300px] overflow-x-hidden overflow-y-scroll left-0 px-2 py-3">
                    <input
                      type="text"
                      onChange={(e) => setSeacrhText(e.target.value)}
                      placeholder="Search Country"
                      className="border border-gray-300 text-black w-full placeholder:text-[13px] text-[13px] outline-none px-[4px] rounded mb-1 py-[5px]"
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
                                className="flex items-center gap-2 hover:bg-gray-300 cursor-pointer p-[5px] text-[14px] text-black"
                                onClick={() => {
                                  setShowCountries(!showCountries);
                                  setCountry(country.name);
                                }}
                              >
                                <p className="text-black">{country.emoji}</p>
                                <p className="text-black">{country.name}</p>
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
              <div className="text-center text-[white] sm:mt-[70px] text-[14px]">
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
      </div>
      <div className="mt-[100px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
        <p className="text-[white] text-[12px]">
          &copy; {new Date().getFullYear()} RendBit. All rights
          reserved.
        </p>
        <div className="text-[white] text-[12px] flex items-center gap-4">
          <Link to="#">Privacy Policy</Link>
          <Link to="#" className="mr-4">
            Terms of Use
          </Link>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default AboutSelf;
