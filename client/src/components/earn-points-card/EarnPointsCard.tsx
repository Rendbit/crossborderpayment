import React from "react";
import { GoArrowRight } from "react-icons/go";

interface SpecialMissionCardProps {
  item: any;
  setEarnPointsModal: (state: boolean) => void;
}

const SpecialMissionCard: React.FC<SpecialMissionCardProps> = ({
  item,
  setEarnPointsModal,
}) => {
  const handleClaimClick = () => {
    localStorage.setItem(
      "earnPointsInfo",
      JSON.stringify({
        itemPoinnts: item.xp,
        itemNumber: item._id,
        itemTitle: item.name,
        itemDesc: item.description,
        itemUrl: item.url,
      })
    );
    // localStorage.setItem("missionTitle", item.title);
    setEarnPointsModal(true);
  };

  return (
    <div className="flex flex-col p-6 bg-white rounded-[20px] border">
      <div className="w-[160px] bg-primary-color text-white p-4 rounded-[8px] flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#FFFFFF1A] p-[2px] rounded-sm">
            {/* <img
              src="./images/simple-mission.svg" // Replace with actual path to the icon
              alt="Icon"
              className="w-[30px] h-[30px]"
              aria-hidden="true"
            /> */}
          </div>
          {/* <div className="bg-[#9A9A9A4D] p-[10px] rounded-full flex items-center gap-3">
            <img src="./images/simple-mission1.svg" alt="" />
            <p>{item?.tag}</p>
          </div> */}
        </div>
        <div>
          <p className="font-bold mb-[-8px] text-[54px]">{item?.xp}</p>
          <p className="text-[10px] font-[300]">XP POINTS</p>
        </div>
      </div>
      <div>
        <div className="mt-4">
          <h3 className="text-[20px] text-[#ffffff]">{item?.name}</h3>
          <p className="text-[#5D5D5D] md:text-[14px] text-[12px] font-[300]">
            {item?.description}
          </p>
        </div>
        <button
          className={`mt-6 bg-primary-color text-white py-2 px-6 rounded-[11px] inline-flex items-center gap-4 text-[14px]`}
          onClick={handleClaimClick}
        >
          <p>Claim</p>
          <GoArrowRight />
        </button>
      </div>
    </div>
  );
};

export default SpecialMissionCard;
