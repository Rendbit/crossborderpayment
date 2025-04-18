import React from "react";

interface SavingsCardProps {
  item: any;
  setSaveCardModal: any;
}

const SavingsCard: React.FC<SavingsCardProps> = ({
  item,
  setSaveCardModal,
}) => {
  const handleSaveClick = () => {
    localStorage.setItem(
      "saveCard",
      JSON.stringify({ itemTitle: item.asset_name, assetCode: item.asset_code })
    );
    // localStorage.setItem("missionTitle", item.title);
    setSaveCardModal(true);
  };

  return (
    <div className="mx-auto bg-white lg:p-6 p-3 rounded-[8px]">
      <div className="flex items-center mb-4">
        <img src={item.image} alt="Asset Coin" className="h-[24px[24px] mr-2" />
        <h2 className="text-[#ffffff]">{item.asset_name}</h2>
      </div>
      <div className="my-[2rem]">
        <div className="inline-flex items-center gap-1 py-2 lg:px-4 px-2 bg-[#899EFD1A] rounded-[4px]">
          <img src="./images/tag-user.svg" alt="" />
          <p className="text-primary-color text-[10px]">
            {item.participants} Participants
          </p>
        </div>
        <div className="my-2">
          <span className="text-5xl text-[#ffffff]">7%</span>
          <span className="text-lg">APY</span>
        </div>
        <div className="mb-6">
          <p className="text-[#5D5D5D] text-[12px] lg:text-[16px]">
            With {item.asset_code} asset
          </p>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          className="bg-primary-color w-full text-white lg:px-6 px-3 py-2 rounded-lg font-semibold text-[12px] lg:text-[16px]"
          onClick={handleSaveClick}
        >
          Earn with {item.asset_code} &rarr;
        </button>
      </div>
    </div>
  );
};

export default SavingsCard;
