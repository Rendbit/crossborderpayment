import React, { useState } from "react";
import Cookies from "js-cookie";
import { BsLightningChargeFill } from "react-icons/bs";
import Alert from "../alert/Alert";

interface EarnPointsModalProps {
  setEarnPointsModal: (state: boolean) => void;
}

const EarnPointsModal: React.FC<EarnPointsModalProps> = ({
  setEarnPointsModal,
}) => {
  const taskInfo = JSON.parse(localStorage.getItem("earnPointsInfo") || "{}");
  const [twitterHnandle, setTwitterHandle] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");

  const user = Cookies.get("user");

  async function completeTask() {
    ({
      taskId: taskInfo.itemNumber,
      twitterHandle: twitterHnandle,
    });

    if (taskInfo?.itemTitle?.includes("Twitter")) {
      if (!twitterHnandle) {
        setMsg("Please enter your Twitter handle");
        setAlertType("error");
        return;
      }
    }
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/referralProgram/complete-task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user}`,
          "x-api-key": `${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          taskId: taskInfo.itemNumber,
          twitterHandle: twitterHnandle,
        }),
      }
    );
    const data = await response.json();
    return data
  }

  return (
    <div>
      <div
        className="h-full w-full fixed top-0 left-0 z-[99]"
        style={{ background: "rgba(14, 14, 14, 0.58)" }}
        onClick={() => setEarnPointsModal(false)}
      ></div>
      <div
        className="bg-white w-[500px] fixed top-[50%] left-[50%] z-[100] rounded-[8px]"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        {/* <div className="w-full bg-gradient-to-r from-primary-color to-blue-400 text-white p-4 rounded-t-[8px] flex flex-col items-start">
                <p className="text-sm">Task 04</p>
                <p className="text-2xl font-bold mt-2">Make your first deposit</p>
            </div> */}
        <img
          src="./images/earn-points-modal-img.svg"
          alt=""
          className="rounded-t-[11px]"
        />
        <div className="flex items-center justify-between mt-7 px-4">
          <div className="flex items-center gap-1 py-2 px-4 bg-[#899EFD1A]">
            <BsLightningChargeFill className="text-primary-color" />
            <p className="text-primary-color text-[10px]">More Information</p>
          </div>
          {/* <div className='bg-[#899EFD1A] inline-flex items-center rounded-md'>
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
        {/* <p>{taskInfo?.itemNumber}</p> */}
        <div className="px-4 mt-7 mb-[6rem]">
          <p className="text-[20px]">{taskInfo?.itemTitle}</p>
          <p className="text-[#ffffff] text-[14px] font-[300]">
            {taskInfo?.itemDesc}
          </p>
          {taskInfo?.itemTitle?.includes("Twitter") && (
            <input
              type="text"
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="Please enter your twitter handle"
              className="border w-full py-2 mt-3 rounded-[6px] outline-none px-2 text-[#ffffff]"
            />
          )}
        </div>
        <div className="flex flex-col items-center mt-10 gap-4 w-[80%] mx-auto mb-[2rem]">
          <a href={`${taskInfo?.itemUrl}`} target="_blank" className="w-full">
            <button
              className={`bg-primary-color text-white py-2 px-8 rounded-[6px] w-full text-[14px]`}
            >
              Execute task
            </button>
          </a>
          <button
            className={`bg-[#EEEFF0] text-[#0C0C0C] py-2 px-8 rounded-[6px] w-full text-[14px]`}
            onClick={completeTask}
          >
            Claim +{taskInfo.itemPoinnts} Points
          </button>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default EarnPointsModal;
