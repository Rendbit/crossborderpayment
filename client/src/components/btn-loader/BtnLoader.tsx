import React from "react";

const BtnLoader: React.FC = () => {
  return (
    <div className={`bg-primary-color text-white py-[5px] px-4 rounded-[8px]`}>
      <img
        src="/images/loader.gif"
        className="mx-auto w-[30px] h-[30px]"
        alt="Loader image"
      />
    </div>
  );
};

export default BtnLoader;
