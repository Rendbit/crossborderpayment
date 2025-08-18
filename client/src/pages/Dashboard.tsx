import React, { useEffect, useState } from "react";
import { GoArrowSwitch, GoChevronDown } from "react-icons/go";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import Alert from "../components/alert/Alert";
import ArrayItemLoader from "../components/loader/ArrayItemLoader";
import TransactionTable from "../components/table/TransactionTable";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/side-nav/SideNav";
import { getAllTrustLines, getMyAssets } from "../function/horizonQuery";
import { getProfile } from "../function/user";
import { createPortal } from "react-dom";
import {
  addTrustLine,
  getTransactionHistory,
  removeTrustLine,
} from "../function/transaction";
import { formateDecimal } from "../utils";
import AssetProgressBar from "../components/progress-bar/AssetProgressBar";
import TransactionGraph from "../components/TransactionGraph";
import TokenHoldingsProgress from "../components/TokenHoldingsProgress";
import MobileNav from "../components/mobile-nav/MobileNav";
import {
  Banknote,
  ArrowRightLeft,
  Send,
  Search,
  Globe,
  ArrowUpRight,
  Landmark,
  Eye,
} from "lucide-react";
import { BsBank } from "react-icons/bs";
import { useAppContext } from "../context/useContext";
import AddMoneyModal from "../components/modals/add-money";
import { CgAdd } from "react-icons/cg";
import { BiInfoCircle } from "react-icons/bi";

const Dashboard: React.FC = () => {
  const [userData, setUserData] = useState<any>();
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [currencyChange, setCurrencyChange] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const user = Cookies.get("token");
  const [walletAssets, setWalletAssets] = useState<any>();
  const [selectedTrustLine, setSelectedTrustLine] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [PUBLIC_ASSETS, setPublic_Assets] = useState<any>([]);
  const [loadingPUBLIC_ASSETS, setLoadingPUBLIC_ASSETS] =
    useState<boolean>(false);
  const [convertCurrency, setConvertCurrency] = useState("USD");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);
  const assets = [
    { symbol: "NGNC", name: "Nigeria Naira", displaySymbol: "NGN" },
    { symbol: "USDC", name: "United State Dollars", displaySymbol: "USD" },
    // { symbol: "GHSC", name: "Ghana Cedis", displaySymbol: "GHS" },
    // { symbol: "KESC", name: "Kenya Shillings", displaySymbol: "KES" },
  ];
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [selectedCurrency, setSelectedCurrency] = useState(
    assets[0].displaySymbol
  );
  const [dropDown, setDropDown] = useState<any>();
  const [removeDropDown, setRemoveDropDown] = useState<any>();
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [convertPrice, setConvertPrice] = useState<any>(0);
  const [searchText, setSearchText] = useState<string>("");
  const [loadingTx, setLoadingTx] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [address, setAddress] = useState<string>("");
  const { setIsAddMoneyModalOpen, setIsSendMoneyModalOpen } = useAppContext();

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey || "");
    handleGetProfile();
    handleGetMyAssets();
    handleGetAllTrustLines();
    handleGetTransactionHistory();
  }, []);

  useEffect(() => {
    const storedAllWalletTotalBalanceInSelectedCurrency = localStorage.getItem(
      "allWalletTotalBalanceInSelectedCurrency"
    );
    const storedAllWalletTotalBalanceInUsd = localStorage.getItem(
      "allWalletTotalBalanceInUsd"
    );
    const parsedAllWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedAllWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedAllWalletTotalBalanceInUsd = JSON.parse(
      storedAllWalletTotalBalanceInUsd || "null"
    );
    setCurrentPrice(parsedAllWalletTotalBalanceInSelectedCurrency || 0);
    setConvertPrice(parsedAllWalletTotalBalanceInUsd || 0);
  }, [walletAssets]);

  async function handleGetMyAssets() {
    const storedWalletAssets = localStorage.getItem("walletAssets");
    const storedAllWalletTotalBalanceInSelectedCurrency = localStorage.getItem(
      "allWalletTotalBalanceInSelectedCurrency"
    );
    const storedAllWalletTotalBalanceInUsd = localStorage.getItem(
      "allWalletTotalBalanceInUsd"
    );
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");
    const parsedAllWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedAllWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedAllWalletTotalBalanceInUsd = JSON.parse(
      storedAllWalletTotalBalanceInUsd || "null"
    );
    if (
      parsedWalletAssets &&
      parsedAllWalletTotalBalanceInSelectedCurrency &&
      parsedAllWalletTotalBalanceInUsd
    ) {
      setWalletAssets(parsedWalletAssets);
      setCurrentPrice(parsedAllWalletTotalBalanceInSelectedCurrency || 0);
      setConvertPrice(parsedAllWalletTotalBalanceInUsd || 0);
    }
    if (
      !parsedWalletAssets ||
      !parsedAllWalletTotalBalanceInSelectedCurrency ||
      !parsedAllWalletTotalBalanceInUsd
    ) {
      setLoadingWalletAssets(true);
    }
    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }
      const response = await getMyAssets(user, selectedCurrency);
      if (!response.success) {
        if (
          response.message.includes(
            "Fund your wallet with at least 5 XLM to activate your account."
          )
        ) {
          setActivateWalletAlert(response.message);
          setIsActivateWalletAlert(true);
        } else {
          setMsg(response.message);
          setAlertType("error");
        }

        setLoadingWalletAssets(false);
        return;
      }
      setWalletAssets(response?.data);
    } catch (error: any) {
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        setMsg(error.message || "Failed to get all wallet assets");
        setAlertType("error");
      }
    } finally {
      setLoadingWalletAssets(false);
    }
  }

  async function handleGetAllTrustLines() {
    const storedPUBLIC_ASSETS = localStorage.getItem("PUBLIC_ASSETS");
    const parsedPUBLIC_ASSETS = JSON.parse(storedPUBLIC_ASSETS || "null");

    if (parsedPUBLIC_ASSETS) {
      setPublic_Assets(parsedPUBLIC_ASSETS);
    }
    if (!parsedPUBLIC_ASSETS) {
      setLoadingPUBLIC_ASSETS(true);
    }
    try {
      if (!user) {
        setLoadingPUBLIC_ASSETS(false);

        return;
      }

      const response = await getAllTrustLines(user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setPublic_Assets(response.data.trustLines);
      localStorage.setItem(
        "PUBLIC_ASSETS",
        JSON.stringify(response.data.trustLines)
      );
    } catch (error: any) {
      setMsg(error.message || "Failed to get all trustlines");
      setAlertType("error");
    } finally {
      setLoadingPUBLIC_ASSETS(false);
    }
  }

  async function handleGetProfile() {
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");

    if (parsedUserData) {
      setUserData(parsedUserData);
    }
    if (!parsedUserData) {
      setLoadingUserData(true);
    }
    try {
      if (!user) {
        return;
      }

      const response = await getProfile(user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
      }
      setUserData(response.data);
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      setMsg(error.message || "Failed to fetch profile details");
      setAlertType("error");
    } finally {
      setLoadingUserData(false);
    }
  }

  async function handlRemoveTrustLine() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await removeTrustLine(
        selectedTrustLine.asset_code,
        user
      );
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        console.log({ response });
        return;
      }
      await handleGetMyAssets();
      setMsg(response.message);
      setDropDown(false);
      setRemoveDropDown(false);
      setAlertType("success");
      setSelectedTrustLine(false);
      await handleGetTransactionHistory();
    } catch (error: any) {
      setMsg(error.message || "Failed to remove trustline");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTrustLine() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await addTrustLine(selectedAsset.code, user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      await handleGetMyAssets();
      setMsg(response.message);
      setAlertType("success");
      setSelectedAsset(false);
      setDropDown(false);
      setRemoveDropDown(false);
      await handleGetTransactionHistory();
    } catch (error: any) {
      setMsg(error.message || "Failed to add trustline");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGetTransactionHistory() {
    const storedTx = localStorage.getItem("uniqueTransactions");
    const parsedTx = JSON.parse(storedTx || "null");

    if (parsedTx) {
      setTransactionHistory(parsedTx);
    }
    if (!parsedTx) {
      setLoadingTx(true);
    }
    try {
      if (!user) {
        setLoadingTx(false);
        return;
      }
      const response = await getTransactionHistory(user);
      if (!response.success) {
        if (
          response.message.includes(
            "Fund your wallet with at least 5 XLM to activate your account."
          )
        ) {
          setActivateWalletAlert(response.message);
          setIsActivateWalletAlert(true);
        } else {
          setMsg(response.message);
          setAlertType("error");
        }
        setLoadingTx(false);
        return;
      }
      const uniqueTransactions = Array.from(
        new Map(
          response.data.transactions.map((item: any) => [
            item.transaction_hash,
            item,
          ])
        ).values()
      );
      setTransactionHistory(uniqueTransactions);
    } catch (error: any) {
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        setMsg(error.message || "Failed to get all crypto transactions");
        setAlertType("error");
      }
    } finally {
      setLoadingTx(false);
    }
  }

  const walletAssetCodes =
    walletAssets?.allWalletAssets?.map((asset: any) => asset?.asset_code) || [];

  //   return (
  //     <div className="w-full md:grid grid-cols-12">
  //       <div className="md:block hidden h-[100vh] sidebar p-4 pr-2 ">
  //         <SideNav />
  //       </div>
  //       <div className="py-6 overflow-hidden h-[100px] w-full z-50 sticky md:top-[-2%] top-0">
  //         <TopNav page="Dashboard" />
  //       </div>
  //       <div className="mt-[100px]  main-container md:pl-[60px] px-4 pl-2 w-full overflow-hidden md:col-span-10 col-span-12">
  //         <main className="top-0 left-0 right-0 w-full">
  //           <div className="flex-1">
  //             <div className={`md:flex grid items-center gap-5`}>
  //               <div
  //                 className={`bg-gradient-to-b from-[#0E84B2] to-[#0F2267]/5 border border-[#E2E4E9]  border border-[#FFFFFF]/10 text-white pt-3 rounded-lg w-full mx-auto ${
  //                   loadingWalletAssets
  //                     ? "animate-pulse from-primary-color to-blue-400"
  //                     : ""
  //                 }`}
  //               >
  //                 <div className={`mb-4 px-6`}>
  //                   <div className="flex justify-between">
  //                     <h2 className="text-[#FFFFFF]/70 text-[18px]">
  //                       <b>BALANCE</b>
  //                     </h2>
  //                     <div className="relative mb-[10px] ml-[10px]">
  //                       <b>
  //                         <span
  //                           className="text-[#FFFFFF]/70 inline-flex text-[18px] items-center cursor-pointer"
  //                           onClick={() => setCurrencyChange(!currencyChange)}
  //                         >
  //                           {selectedCurrency} <GoChevronDown />
  //                         </span>
  //                       </b>
  //                       {currencyChange && (
  //                         <div className="absolute bg-white border border-[#E2E4E9] rounded shadow">
  //                           {assets.map((currency, index) => (
  //                             <p
  //                               key={index}
  //                               className="px-2 py-1 text-[black] cursor-pointer"
  //                               onClick={() => {
  //                                 setCurrencyChange(false);
  //                                 setSelectedCurrency(currency.displaySymbol);
  //                                 if (currency.symbol === "NGNC") {
  //                                   setCurrentPrice(
  //                                     walletAssets.allWalletTotalBalanceInNgn
  //                                   );
  //                                   setConvertPrice(
  //                                     walletAssets.allWalletTotalBalanceInUsd || 0
  //                                   );
  //                                   setConvertCurrency("USD");
  //                                 } else {
  //                                   setConvertCurrency("NGN");
  //                                   setConvertPrice(
  //                                     walletAssets.allWalletTotalBalanceInNgn || 0
  //                                   );
  //                                   setCurrentPrice(
  //                                     walletAssets.allWalletTotalBalanceInUsd || 0
  //                                   );
  //                                 }
  //                               }}
  //                             >
  //                               {currency.displaySymbol}
  //                             </p>
  //                           ))}
  //                         </div>
  //                       )}
  //                     </div>
  //                   </div>

  //                   <div className="flex ">
  //                     <p className="md:text-4xl mt-2 mb-2 text-[white] text-3xl">
  //                       <b>
  //                         {selectedCurrency}{" "}
  //                         {currentPrice?.toFixed(2) || "loading..."}
  //                       </b>
  //                     </p>
  //                   </div>
  //                   <p className="text-[16px] font-[300] text-[white]">
  //                     ≈ {convertPrice?.toFixed(2) || "loading..."}{" "}
  //                     {convertCurrency}
  //                   </p>
  //                 </div>

  //                 <div className="mt-3 px-6">
  //                   <TokenHoldingsProgress address={address} />
  //                 </div>
  //                 <div className={`flex px-6 gap-4 py-4 rounded-b-lg`}>
  //                   <button
  //                     onClick={() => navigate("/deposit")}
  //                     className="bg-[#0E7BB2] cursor-pointer px-6 text-[12px] md:text-[16px] rounded-[8px]"
  //                   >
  //                     Deposit
  //                   </button>
  //                   <button
  //                     onClick={() => navigate("/transfer")}
  //                     className="border border-[#E2E4E9] cursor-pointer border border-[#B2B2B27A] text-white py-[6px] px-6 text-[12px] md:text-[16px] rounded-[8px]"
  //                   >
  //                     Transfer
  //                   </button>
  //                 </div>
  //               </div>
  //               <div
  //                 className={`border border-[#E2E4E9] border border-[#FFFFFF]/20 pt-3 rounded-lg w-full mx-auto `}
  //               >
  //                 <TransactionGraph address={address} />
  //               </div>
  //             </div>
  //             <div className="mt-5 w-full">
  //               <div className="rounded-[12px] shadow-md text-white">
  //                 <>
  //                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
  //                     <h2 className="text-[22px] font-semibold text-white">
  //                       Your Assets
  //                     </h2>
  //                     <div className="flex gap-3">
  //                       <button
  //                         className="bg-blue-600 cursor-pointer hover:bg-blue-500 transition px-5 py-2 rounded-[8px] text-sm md:text-base text-white"
  //                         onClick={() => {
  //                           if (isActivateWalletAlert) {
  //                             setAlertType("error");
  //                             setMsg(
  //                               "Fund your wallet with at least 5 XLM to activate your account."
  //                             );
  //                             return;
  //                           }
  //                           setShowAddModal(true);
  //                         }}
  //                       >
  //                         + Add Asset
  //                       </button>
  //                       <button
  //                         className="bg-red-600 cursor-pointer hover:bg-red-500 transition px-5 py-2 rounded-[8px] text-sm md:text-base text-white"
  //                         onClick={() => {
  //                           if (isActivateWalletAlert) {
  //                             setAlertType("error");
  //                             setMsg(
  //                               "Fund your wallet with at least 5 XLM to activate your account."
  //                             );
  //                             return;
  //                           }
  //                           setShowRemoveModal(true);
  //                         }}
  //                       >
  //                         − Remove Asset
  //                       </button>
  //                     </div>
  //                   </div>

  //                   {isActivateWalletAlert && (
  //                     <p className="bg-red-500 text-white p-4 rounded-lg text-center mb-4">
  //                       {activateWalletAlert}
  //                     </p>
  //                   )}

  //                   {/* Add Asset Modal */}
  //                   {showAddModal && (
  //                     <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-[100]">
  //                       <div className="bg-[#010014]  mx-4 border border-[#E2E4E9] border border-white/20 text-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
  //                         <div className="flex justify-between items-center mb-4">
  //                           <h3 className="text-lg font-semibold">Add Asset</h3>
  //                           <button
  //                             onClick={() => setShowAddModal(false)}
  //                             className="text-gray-400 cursor-pointer hover:text-white"
  //                           >
  //                             ✕
  //                           </button>
  //                         </div>
  //                         {loadingPUBLIC_ASSETS ? (
  //                           <ArrayItemLoader />
  //                         ) : (
  //                           (() => {
  //                             const availableAssets = Object.keys(
  //                               PUBLIC_ASSETS
  //                             )?.filter(
  //                               (key) =>
  //                                 !walletAssetCodes?.includes(
  //                                   PUBLIC_ASSETS[key]?.code?.toUpperCase()
  //                                 ) && PUBLIC_ASSETS[key].code !== "native"
  //                             );
  //                             return availableAssets?.length > 0 ? (
  //                               availableAssets.map((key, index) => (
  //                                 <div
  //                                   key={index}
  //                                   className="flex items-center gap-3 py-2 px-3 hover:bg-[#050d2a] cursor-pointer rounded-md"
  //                                   onClick={() => {
  //                                     setSelectedAsset(PUBLIC_ASSETS[key]);
  //                                     setShowAddModal(false);
  //                                   }}
  //                                 >
  //                                   <img
  //                                     src={PUBLIC_ASSETS[key].image}
  //                                     alt=""
  //                                     className="w-8 h-8"
  //                                   />
  //                                   <div>
  //                                     <p className="font-medium">
  //                                       {PUBLIC_ASSETS[key].name}
  //                                     </p>
  //                                     <p className="text-[10px] text-gray-400">
  //                                       {PUBLIC_ASSETS[key].code === "native"
  //                                         ? "XLM"
  //                                         : PUBLIC_ASSETS[key].code}
  //                                     </p>
  //                                   </div>
  //                                 </div>
  //                               ))
  //                             ) : (
  //                               <p className="text-center text-gray-500">
  //                                 No more assets to add
  //                               </p>
  //                             );
  //                           })()
  //                         )}
  //                       </div>
  //                     </div>
  //                   )}

  //                   {/* Remove Asset Modal */}
  //                   {showRemoveModal && (
  //                     <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-[100]">
  //                       <div className="bg-[#010014]  mx-4 border border-[#E2E4E9] border border-white/20 text-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
  //                         <div className="flex justify-between items-center mb-4">
  //                           <h3 className="text-lg font-semibold">
  //                             Remove Asset
  //                           </h3>
  //                           <button
  //                             onClick={() => setShowRemoveModal(false)}
  //                             className="text-gray-400 cursor-pointer hover:text-white"
  //                           >
  //                             ✕
  //                           </button>
  //                         </div>
  //                         {loadingWalletAssets ? (
  //                           <ArrayItemLoader />
  //                         ) : (
  //                           (() => {
  //                             const removableAssets =
  //                               walletAssets?.allWalletAssets?.filter(
  //                                 (asset: any) => asset?.asset_code !== "NATIVE"
  //                               );
  //                             return removableAssets?.length > 0 ? (
  //                               removableAssets.map(
  //                                 (asset: any, index: number) => (
  //                                   <div
  //                                     key={index}
  //                                     className="flex items-center gap-3 py-2 px-3 hover:bg-[#050d2a] cursor-pointer rounded-md"
  //                                     onClick={() => {
  //                                       setSelectedTrustLine(asset);
  //                                       setShowRemoveModal(false);
  //                                     }}
  //                                   >
  //                                     <img
  //                                       src={asset?.image}
  //                                       alt=""
  //                                       className="w-8 h-8"
  //                                     />
  //                                     <div>
  //                                       <p className="font-medium">
  //                                         {asset?.asset_name}
  //                                       </p>
  //                                       <p className="text-[10px] text-gray-400">
  //                                         {asset.code === "NATIVE"
  //                                           ? "XLM"
  //                                           : asset?.asset_code}
  //                                       </p>
  //                                     </div>
  //                                   </div>
  //                                 )
  //                               )
  //                             ) : (
  //                               <p className="text-center text-gray-500">
  //                                 No assets to remove
  //                               </p>
  //                             );
  //                           })()
  //                         )}
  //                       </div>
  //                     </div>
  //                   )}
  //                 </>

  //                 {/* Asset Cards Grid */}
  //                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4  overflow-y-auto">
  //                   {loadingWalletAssets ? (
  //                     <ArrayItemLoader />
  //                   ) : (
  //                     walletAssets?.allWalletAssets?.map(
  //                       (asset: any, index: number) => (
  //                         <div
  //                           key={index}
  //                           className="bg-[#050d2a] p-4 rounded-[10px] border border-[#E2E4E9] border border-white/20 hover:shadow-lg transition cursor-pointer"
  //                         >
  //                           <div className="flex items-center gap-3 mb-3">
  //                             <img
  //                               src={asset?.image}
  //                               alt=""
  //                               className="w-10 h-10"
  //                             />
  //                             <div>
  //                               <p className="text-[white] text-[16px] font-semibold">
  //                                 {asset?.asset_name}
  //                               </p>
  //                               <p className="text-[11px] text-gray-400">
  //                                 {asset?.asset_code === "NATIVE"
  //                                   ? "XLM"
  //                                   : asset?.asset_code}
  //                               </p>
  //                             </div>
  //                           </div>
  //                           <div className="flex justify-between items-center">
  //                             <p className="text-[20px] font-bold text-white">
  //                               {formateDecimal(asset?.balance || 0)}
  //                             </p>
  //                             <p className="text-[16px] text-gray-300">
  //                               $
  //                               {formateDecimal(
  //                                 asset?.equivalentBalanceInUsd || 0
  //                               )}
  //                             </p>
  //                           </div>
  //                         </div>
  //                       )
  //                     )
  //                   )}
  //                 </div>
  //               </div>

  //               {/* <TransactionTable
  //               name="Crypto Transaction History"
  //               tableType="crypto"
  //               loadingTx={loadingTx}
  //               transactionHistory={transactionHistory}
  //               setSearchText={setSearchText}
  //               searchText={searchText}
  //             /> */}
  //             </div>
  //           </div>
  //         </main>
  //         <MobileNav />
  //       </div>

  //       {selectedTrustLine && (
  //         <div>
  //           <div
  //             style={{
  //               position: "fixed",
  //               width: "100%",
  //               left: "0",
  //               top: "0",
  //               zIndex: "99",
  //               display: "flex",
  //               alignItems: "center",
  //               justifyContent: "center",
  //               height: "100vh",
  //               background: "rgba(18, 18, 18, 0.8)",
  //             }}
  //           >
  //             <div className="bg-black mx-3" style={{ borderRadius: "10px" }}>
  //               <div className="text-center  flex items-center justify-center flex-col mt-7">
  //                 <img
  //                   src={selectedTrustLine.image}
  //                   className="w-[60px] mb-2"
  //                   alt=""
  //                 />
  //                 <div>
  //                   <p className="text-[white]">
  //                     {selectedTrustLine?.asset_name}
  //                   </p>
  //                   <p className="text-[white] text-[12px]">
  //                     {selectedTrustLine?.asset_code === "NATIVE"
  //                       ? "XLM"
  //                       : selectedTrustLine?.asset_code}
  //                   </p>
  //                 </div>
  //               </div>

  //               <div
  //                 className="flex items-center justify-between mt-[1rem] px-[2rem] flex-col"
  //                 style={{ padding: "0 2rem", textAlign: "center" }}
  //               >
  //                 <p className="text-white text-[15px] mb-2 text-center">
  //                   Are you sure you want to{" "}
  //                   <span className="font-[500]">REMOVE</span> this asset from
  //                   your list of trustlines?
  //                 </p>
  //               </div>
  //               <div className="flex items-center gap-4 px-[2rem] mb-8">
  //                 <button
  //                   className="bg-[#B3261E] cursor-pointer border border-[#E2E4E9] border border-[white]/50 text-white p-3 rounded-lg w-full mt-[2rem]"
  //                   onClick={() => setSelectedTrustLine(false)}
  //                   disabled={loading}
  //                 >
  //                   No
  //                 </button>
  //                 <button
  //                   className="flex justify-center items-center cursor-pointer border border-[#E2E4E9] border border-white/50 bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-[2rem]"
  //                   onClick={handlRemoveTrustLine}
  //                   disabled={loading}
  //                 >
  //                   <span>Yes, continue</span>
  //                   {loading && (
  //                     <img
  //                       src="./image/loader.gif"
  //                       className="w-[20px] mx-2"
  //                       alt=""
  //                     />
  //                   )}
  //                 </button>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       )}
  //       {selectedAsset && (
  //         <div>
  //           <div
  //             style={{
  //               position: "fixed",
  //               width: "100%",
  //               left: "0",
  //               top: "0",
  //               zIndex: "99",
  //               display: "flex",
  //               alignItems: "center",
  //               justifyContent: "center",
  //               height: "100vh",
  //               background: "rgba(18, 18, 18, 0.8)",
  //             }}
  //           >
  //             <div className="bg-black mx-3" style={{ borderRadius: "10px" }}>
  //               <div className="text-center  flex items-center justify-center flex-col mt-7">
  //                 <img
  //                   src={selectedAsset.image}
  //                   className="w-[60px] mb-2"
  //                   alt=""
  //                 />
  //                 <div>
  //                   <p className="text-[white]">{selectedAsset?.name}</p>
  //                   <p className="text-[white] text-[12px]">
  //                     {selectedAsset?.code === "NATIVE"
  //                       ? "XLM"
  //                       : selectedAsset?.code}
  //                   </p>
  //                 </div>
  //               </div>

  //               <div
  //                 className="flex items-center justify-between mt-[1rem] px-[2rem] flex-col"
  //                 style={{ padding: "0 2rem", textAlign: "center" }}
  //               >
  //                 <p className="text-white text-[15px] mb-2 text-center">
  //                   Are you sure you want to{" "}
  //                   <span className="font-[500]">ADD</span> this asset from your
  //                   list of trustlines?
  //                 </p>
  //               </div>
  //               <div className="flex items-center gap-4 px-[2rem] mb-8">
  //                 <button
  //                   className="bg-[#B3261E] border border-[#E2E4E9] cursor-pointer border border-white/50 text-white p-3 rounded-lg w-full mt-[2rem]"
  //                   onClick={() => setSelectedAsset(false)}
  //                   disabled={loading}
  //                 >
  //                   No
  //                 </button>
  //                 <button
  //                   className="flex justify-center items-center border border-[#E2E4E9] cursor-pointer border border-white/50 bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-[2rem]"
  //                   onClick={handleAddTrustLine}
  //                   disabled={loading}
  //                 >
  //                   <span>Yes, continue</span>
  //                   {loading && (
  //                     <img
  //                       src="./image/loader.gif"
  //                       className="w-[20px] mx-2"
  //                       alt=""
  //                     />
  //                   )}
  //                 </button>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       )}
  //       {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
  //     </div>
  //   );
  // };

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Dashboard" />

        {/* Balances */}
        <section className="mt-6 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg border border-[#D9D9D9] dark:border-gray-700">
          {/* Balance Card */}
          <div className="w-full  bg-white dark:bg-gray-800  p-6 md:p-8 mb-6">
            {/* Top Controls */}
            <div className="flex justify-between items-start mb-6">
              {/* Left Side: Title + Main Balance */}
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                  TOTAL AVAILABLE BALANCE
                </h3>

                {/* Main Balance */}
                <p className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {selectedCurrency} {currentPrice?.toFixed(2) || "loading..."}
                </p>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-300">
                  ≈ {convertPrice?.toFixed(2) || "loading..."} {convertCurrency}
                </p>
              </div>

              {/* Right Side: Eye + Currency Selector */}
              <div className="flex items-center gap-3 mt-1">
                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition">
                  <Eye />
                </button>

                <div className="relative">
                  <span
                    className="inline-flex items-center text-sm md:text-base font-semibold text-gray-900 dark:text-white cursor-pointer px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    onClick={() => setCurrencyChange(!currencyChange)}
                  >
                    {selectedCurrency} <GoChevronDown className="ml-1" />
                  </span>

                  {currencyChange && (
                    <div className="absolute top-full mt-1 right-0 w-max bg-white dark:bg-gray-800 border border-[#E2E4E9] dark:border-gray-700 rounded shadow z-50">
                      {assets.map((currency, index) => (
                        <p
                          key={index}
                          className="px-4 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer whitespace-nowrap transition"
                          onClick={() => {
                            setCurrencyChange(false);
                            setSelectedCurrency(currency.displaySymbol);
                            if (currency.symbol === "NGNC") {
                              setCurrentPrice(
                                walletAssets.allWalletTotalBalanceInNgn
                              );
                              setConvertPrice(
                                walletAssets.allWalletTotalBalanceInUsd || 0
                              );
                              setConvertCurrency("USD");
                            } else {
                              setConvertCurrency("NGN");
                              setConvertPrice(
                                walletAssets.allWalletTotalBalanceInNgn || 0
                              );
                              setCurrentPrice(
                                walletAssets.allWalletTotalBalanceInUsd || 0
                              );
                            }
                          }}
                        >
                          {currency.displaySymbol}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 mb-6">
              {walletAssets?.allWalletAssets?.map(
                (asset: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      backgroundImage:
                        "url(./images/vector-line.svg), url(./images/vector-line.svg)",
                      backgroundRepeat: "no-repeat, no-repeat",
                      backgroundPosition:
                        "right 0px top -10px, right -60px top 20px",
                      backgroundSize: "auto, auto",
                    }}
                    className="p-4 md:p-6 rounded-lg border border-[#D9D9D9] dark:border-gray-700 flex flex-col gap-4"
                  >
                    {/* Asset Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center p-3 gap-2 bg-[#E7F1F7] dark:bg-gray-700 rounded-full text-sm">
                        <img
                          src={asset?.image}
                          alt={asset?.asset_name}
                          className="w-5 h-5"
                        />
                        <span>{asset?.asset_name}</span>
                      </div>
                      <span className="bg-[#E7F1F7]  dark:bg-gray-700 p-3 rounded-full">
                        <BsBank
                          className="text-gray-900 dark:text-gray-100"
                          size={16}
                        />
                      </span>
                    </div>

                    {/* Asset Balance */}
                    <div className="flex mt-[50px] py-[20px] justify-center items-center">
                      <div>
                        <div className="flex gap-2 text-center">
                          <p className="text-sm text-black dark:text-gray-400">
                            Available{" "}
                            {asset?.asset_code === "NATIVE"
                              ? "XLM"
                              : asset?.asset_code}{" "}
                            balance
                          </p>
                          <BiInfoCircle
                            title={`${
                              asset?.asset_code === "NATIVE"
                                ? "XLM"
                                : asset?.asset_code
                            } balance`}
                            className="cursor-pointer"
                          />
                        </div>

                        <p className="text-2xl text-[#1E1E1E] dark:text-gray-400 text-center font-bold">
                          {asset?.asset_code === "NATIVE"
                            ? "XLM"
                            : asset?.asset_code}{" "}
                          {formateDecimal(asset?.balance || 0)}
                        </p>
                        <p className="text-sm text-center text-[#1E1E1E dark:text-gray-300">
                          ${formateDecimal(asset?.equivalentBalanceInUsd || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              <button className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                Add Currency <Banknote size={16} />
              </button>
              <button
                onClick={() => setIsAddMoneyModalOpen(true)}
                className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Add Money <CgAdd size={16} />
              </button>
              <button
                onClick={() => setIsSendMoneyModalOpen(true)}
                className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Send Money <Send size={16} />
              </button>
              <button
                onClick={() => navigate("/swap")}
                className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <ArrowRightLeft size={16} /> Convert Funds
              </button>
            </div>
          </div>
        </section>

        {/* Transactions */}
        <TransactionTable NumberOfTx={3} isHistoryPage={false}/>
      </main>
    </>
  );
};

export default Dashboard;
