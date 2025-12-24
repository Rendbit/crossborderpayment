import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="mt-auto mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
      <p className="text-[#0A0D14] dark:text-gray-300 text-[12px]">
        &copy; {new Date().getFullYear()} RendBit. All rights reserved.
      </p>

      <div className="text-[#0A0D14] dark:text-gray-300 text-[12px] flex items-center gap-4">
        <Link to="#">Privacy Policy</Link>
        <Link to="#" className="mr-4">
          Terms of Use
        </Link>
      </div>
    </div>
  );
};


export default Footer;