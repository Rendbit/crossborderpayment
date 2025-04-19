import React from "react";

const Loader: React.FC = () => {
  return (
    <div className={` text-white py-[5px] px-4 rounded-[8px] mt-5`}>
      <img
        src="/image/loader.gif"
        className="mx-auto w-[30px] h-[30px]"
        alt="Loader image"
      />
    </div>
  );
};

export default Loader;
