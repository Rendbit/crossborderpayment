import React from "react";

const SavingsCardLoader: React.FC = () => {
  return (
    <div className="mx-auto bg-white lg:p-6 p-3 rounded-[8px] animate-pulse">
      <div className="flex items-center mb-4">
        <div className="h-6 w-6 bg-gray-300 rounded-full mr-2"></div>
        <div className="h-4 bg-gray-300 rounded w-24"></div>
      </div>
      <div className="my-[2rem]">
        <div className="inline-flex items-center gap-1 py-2 lg:px-4 px-2 bg-gray-200 rounded-[4px]">
          <div className="h-4 w-4 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-20"></div>
        </div>
        <div className="my-2">
          <div className="h-10 bg-gray-300 rounded w-20"></div>
          <div className="h-5 bg-gray-300 rounded w-10 mt-1"></div>
        </div>
        <div className="mb-6">
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="bg-gray-300 w-full h-10 rounded-lg"></div>
      </div>
    </div>
  );
};

export default SavingsCardLoader;
