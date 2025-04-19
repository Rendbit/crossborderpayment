import React from "react";
import { useNavigate } from "react-router-dom";

interface SaveCardModalProps {
  setSaveCardModal: any;
}

const SaveCardModal: React.FC<SaveCardModalProps> = ({ setSaveCardModal }) => {
  const saveCard = JSON.parse(localStorage.getItem("saveCard") || "{}");
  const navigate = useNavigate()

  return (
    <div>
      <div
        className="h-full w-full fixed top-0 left-0 z-[99]"
        style={{ background: "rgba(14, 14, 14, 0.58)" }}
        onClick={() => setSaveCardModal(false)}
      ></div>
      <div
        className="bg-white lg:w-[500px] w-[90%] fixed top-[50%] left-[50%] z-[100] rounded-[8px]"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        {/* <div className="w-full bg-gradient-to-r from-primary-color to-blue-400 text-white p-4 rounded-t-[8px] flex flex-col items-start">
                <p className="text-sm">Task 04</p>
                <p className="text-2xl font-bold mt-2">Make your first deposit</p>
            </div> */}
        <img src="./images/save-img.svg" alt="" className="rounded-t-[11px]" />
        <div className="flex items-center justify-between mt-7 px-4 md:px-8">
          {/* <div className='flex items-center gap-1 py-2 px-4 bg-[#899EFD1A]'>
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
                </div> */}
        </div>
        <div className="md:px-8 px-4 mt-7 mb-[4rem]">
          <p className="text-[18px] lg:text-[20px]">
            Earning with {saveCard.itemTitle}
          </p>
          <p className="text-[#ffffff] lg:text-[14px] text-[12px]">
            Adding money to your {saveCard.itemTitle} earn accounts means you
            will convert your {saveCard.itemTitle} to {saveCard.assetCode}, an
            interest earning varient of {saveCard.itemTitle}.{" "}
            {saveCard.assetCode} is issued by ultra capital and you can always
            convert {saveCard.assetCode} back to {saveCard.itemTitle}.
          </p>
        </div>
        <div className="flex flex-col items-center mt-10 gap-4 md:w-[80%] w-[90%] mx-auto mb-[2rem]">
          <button
            className="bg-primary-color text-white py-2 px-8 rounded-[6px] w-full text-[14px] lgtext-[16px]"
            onClick={() => navigate(`/swap`)}
          >
            I understand, continue
          </button>
          {/* <button className="bg-[#EEEFF0] text-[#0C0C0C] py-2 px-8 rounded-[6px] w-full text-[14px] lgtext-[16px]">
                    Learn more
                </button> */}
        </div>
      </div>
    </div>
  );
};

export default SaveCardModal;
