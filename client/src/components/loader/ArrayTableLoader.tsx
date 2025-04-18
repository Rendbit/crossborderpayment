import React from "react";

interface ArrayTableLoaderProps {
  number: number;
}

const ArrayTableLoader: React.FC<ArrayTableLoaderProps> = ({ number }) => {
  return (
    <tbody>
      <tr className="text-[12px] border-b animate-pulse">
        <td className="py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-16"></div>
          </div>
        </td>
        {Array.from({ length: number }).map((_, index) => (
          <td className="py-4 px-6" key={index}>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </td>
        ))}
      </tr>
    </tbody>
  );
};

export default ArrayTableLoader;
