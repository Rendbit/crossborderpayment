import React from "react";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import { RiBankLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

const DepositFiat: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="w-full lg:w-[84%] ml-auto">
          <TopNav />
          <div className="py-[20px] px-[10px] h-[100vh]  mt-[160px] lg:mx-[50px]">
            <h1 className="text-white text-[32px] font-semibold">Deposit Crypto</h1>
            <div className="border mt-5 border-[#FFFFFF]/50 rounded-2xl p-5 lg:w-[500px] w-full lg:ml-0 lg:mr-auto mx-auto">
              <div>
                <img src="" alt="" width="25px" />

                <div className="ml-1 hidden lg:block">
                  <p className="text-white text-[20px] font-semibold">
                    Get crypto within a short period of time
                  </p>
                  <p className="font-[300] text-[#ffffff]">
                    Choose Preferred Method
                  </p>
                </div>
              </div>

              <div className="mt-9">
                <h2 className="lg:text-[white] text-white mb-2 font-[500] lg:font-[400]">
                  Choose your deposit method
                </h2>
                <div className="flex gap-5">
                  <div className="w-full lg:w-[500px] lg:p-2 bg-gradient-to-b from-[#FFFFFF]/70 to-[#41F8F8]/40 rounded-lg border border-[#FFFFFF]/50">
                    <div className="p-3 rounded-[8px]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#ffffff]">Bank Transfer</p>
                        </div>
                        <div className="bg-[#ffffff] p-1 rounded-full">
                          <RiBankLine className="text-white text-[22px]" />
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="text-white">Transfer Time</p>
                        <p className="font-300 text-[#ffffff]">0 hours</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        className="py-2 cursor-pointer w-[90%] rounded-[6px] border border-transparent text-white bg-[#0E7BB2] mb-3 mt-[4rem]"
                        style={{
                          borderImage:
                            "linear-gradient(to right, #FFFFFF, #FFFFFF20) 1",
                          borderImageSlice: 1,
                          borderRadius: "6px",
                        }}
                        onClick={() => navigate(`/deposit-provider`)}
                      >
                        Proceed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositFiat;
