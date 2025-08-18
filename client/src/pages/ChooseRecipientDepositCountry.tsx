import { useState } from "react";
import { Globe, Plus } from "lucide-react";
import EmptyTopNav from "../components/top-nav/EmptyTopNav";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/useContext";

const ChooseRecipientDepositCountry = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { setSelectedCountryForTransfer } = useAppContext();

  const countries = [
    {
      name: "Nigeria",
      code: "NGN",
      symbol: "NGNC",
      logo: "https://flagcdn.com/w20/ng.png",
      currency: "Naira",
    },
    // { name: "Ghana", code: "GHS" },
    // { name: "Kenya", code: "KSH" },
  ];

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCountry = (country: any) => {
    localStorage.setItem("selectedCountryForTransfer", JSON.stringify(country));
    setSelectedCountryForTransfer(country);
    navigate("/anchor-deposit-method");
  };

  return (
    <>
      <EmptyTopNav />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
        {/* Avatar */}
        <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 flex items-center justify-center rounded-full">
          <svg
            className="w-8 h-8 text-gray-500 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Choose Recipient Country
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
          Select who will receive your money transfer.
        </p>

        {/* Search */}
        <div className="mt-6 w-full max-w-md">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Choose Country
          </label>
          <input
            type="text"
            placeholder="Search for Country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full 
             border border-gray-300 dark:border-gray-600 
             rounded-lg p-2 
             bg-white dark:bg-gray-800 
             text-gray-900 dark:text-gray-100
             focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
          />
        </div>

        {/* Country List */}
        <div className="w-full max-w-md mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="px-4 pt-3 pb-2 text-xs text-gray-400 dark:text-gray-500">
            SUPPORTED COUNTRIES
          </div>
          {filteredCountries.map((country, idx) => (
            <button
              onClick={() => handleSelectCountry(country)}
              key={country.name}
              className={`flex gap-2 w-full items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                idx !== filteredCountries.length - 1
                  ? "border-b border-gray-100 dark:border-gray-700"
                  : ""
              }`}
            >
              <span className="rounded-full overflow-hidden">
                <img
                  src={country?.logo}
                  alt={`${country?.name}`}
                  className="h-[25px] w-[25px]"
                />
              </span>{" "}
              <div>
                <div className="text-gray-900 dark:text-white text-sm font-medium">
                  {country.name}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {country.code}
                </div>
              </div>
            </button>
          ))}

          {/* New Recipient */}
          <button className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Plus className="w-4 h-4" /> New Recipient
          </button>
        </div>
      </div>
    </>
  );
};

export default ChooseRecipientDepositCountry;
