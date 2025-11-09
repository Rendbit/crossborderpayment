import React from "react";

interface ArrayTableLoaderProps {
  number: number;
}

const ArrayTableLoader: React.FC<ArrayTableLoaderProps> = ({ number }) => {
  return Array.from({ length: number }).map((_, index) => (
    <td colSpan={5}  className="py-4 px-6" key={index}>
      <div className="h-4 bg-gray-300 rounded w-16"></div>
    </td>
  ));
};

export default ArrayTableLoader;
