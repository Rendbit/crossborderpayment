import React from "react";
import clsx from "clsx";

interface SkeletonLoaderProps {
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className }) => {
  const skeletonBox = "bg-gray-700 animate-pulse rounded";

  return (
    <div className={clsx("border border-white/50 rounded-md p-3 mt-2", className)}>
      <div className="mt-7 pb-5">
        <div className={clsx(skeletonBox, "h-6 w-[150px] mb-2")}></div>
        <div className={clsx(skeletonBox, "h-4 w-[250px]")}></div>
      </div>

      <table className="w-full">
        <tbody>
          {[1, 2, 3].map((_, index) => (
            <tr
              key={index}
              className="w-full md:block grid py-[1.5rem] gap-2"
            >
              <td className="w-[180px]">
                <div className={clsx(skeletonBox, "h-4 w-[120px]")}></div>
              </td>
              <td className="w-[280px]">
                <div className={clsx(skeletonBox, "h-[42px] w-full")}></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-[2.5rem] gap-5">
        <div className={clsx(skeletonBox, "w-[100px] h-[40px]")}></div>
        <div className={clsx(skeletonBox, "w-[100px] h-[40px]")}></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
