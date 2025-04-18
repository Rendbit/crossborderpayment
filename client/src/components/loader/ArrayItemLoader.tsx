import React from "react";

const ArrayItemLoader: React.FC = () => {
  return (
    <div
      role="status"
      className="py-4 w-full space-y-4 border-gray-200 divide-y divide-gray-200 rounded animate-pulse dark:divide-gray-300 md:py-6 dark:border-gray-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-24 mb-2.5"></div>
          <div className="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-300"></div>
        </div>
        <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-12"></div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <div>
          <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-24 mb-2.5"></div>
          <div className="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-300"></div>
        </div>
        <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-12"></div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <div>
          <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-24 mb-2.5"></div>
          <div className="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-300"></div>
        </div>
        <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-12"></div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <div>
          <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-24 mb-2.5"></div>
          <div className="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-300"></div>
        </div>
        <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-12"></div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <div>
          <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-24 mb-2.5"></div>
          <div className="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-300"></div>
        </div>
        <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-300 w-12"></div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default ArrayItemLoader;
