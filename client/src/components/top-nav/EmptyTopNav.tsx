import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const EmptyTopNav = () => {
  const navigate = useNavigate();

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="fixed w-full z-50 h-[88px] flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-[32px] py-[20px]">
      <div className="flex items-center gap-3">
        {/* Back button */}
        <button
          onClick={goBack}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-100 dark:bg-gray-700 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white" />
        </button>

        {/* Title */}
        <button onClick={() => navigate("/dashboard")}>
          <span className="text-gray-900 dark:text-white font-medium text-lg">
            RendBit
          </span>
        </button>
      </div>
    </div>
  );
};

export default EmptyTopNav;
