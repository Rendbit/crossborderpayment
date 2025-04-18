import React from "react";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import { useNavigate } from "react-router-dom";

const Withdraw: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="w-full lg:w-[84%] ml-auto">
          <TopNav />
          <div className="py-[20px] px-[30px] h-[100vh] mt-[70px] lg:mx-[25px]">
            <div className="mt-5 ml-1 hidden lg:block">
              <p className="text-[32px] text-white">Withdraw Crypto</p>
              <p className="font-[300] text-[#ffffff]">
                Send crypto from your balance
              </p>
            </div>
            <div className="mt-9">
              <div className="flex items-center gap-5 flex-col md:flex-row">
                <div
                  className="bg-gradient-to-b from-[#0a567c] to-[#01a9a9] rounded-2xl border border-[white] h-[380px] text-white p-[1.5rem] cursor-pointer w-[350px] hover:scale-[1.01] transition-all"
                  onClick={() => navigate(`/withdraw-crypto`)}
                >
                  <div className="bg-white p-2 inline-block rounded-full">
                    <img
                      src="./images/empty-wallet.svg"
                      className="w-[20px] h-[20px]"
                      alt="wallet"
                    />
                  </div>
                  <div className="mt-[12rem] mb-[52px]">
                    <p className="font-[500] text-[20px]">Withdraw crypto</p>
                    <p className="mt-3 font-[300] text-[14px]">
                      Transfer crypto to an external Wallet
                    </p>
                  </div>
                </div>
                <div
                  className="bg-gradient-to-b from-[#a1a1a1] to-[#2aa3a3] rounded-2xl border border-[white] h-[380px] text-white p-[1.5rem] cursor-pointer w-[350px] hover:scale-[1.01] transition-all"
                  onClick={() => navigate(`/withdraw-fiat`)}
                >
                  <div className="bg-white p-2 inline-block rounded-full">
                    <img
                      src="./images/bank.svg"
                      className="w-[20px] h-[20px]"
                      alt="bank"
                    />
                  </div>
                  <div className="mt-[12rem] mb-7">
                    <p className="font-[500] text-[20px]">Withdraw with Fiat</p>
                    <p className="mt-3 text-[white] text-[14px] font-[300]">
                      Send crypto and get fiat
                    </p>
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

export default Withdraw;
