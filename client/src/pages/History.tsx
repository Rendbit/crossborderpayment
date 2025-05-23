import React, { useEffect, useState } from "react";

import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import { IoIosArrowRoundBack } from "react-icons/io";
import Cookies from "js-cookie";
import TransactionTable from "../components/table/TransactionTable";
import { useNavigate } from "react-router-dom";
import {
  getFiatTransactionHistory,
  getTransactionHistory,
} from "../function/transaction";
import Alert from "../components/alert/Alert";
import MobileNav from "../components/mobile-nav/MobileNav";

const History: React.FC = () => {
  const [transactionHistory, setTransactionHistory] = useState<any>([]);
  const [fiatTransactionHistory, setFiatTransactionHistory] = useState<any>([]);
  const user = Cookies.get("token");
  const [searchText, setSearchText] = useState<any>("");
  const [fiatSearchText, setFiatSearchText] = useState<any>("");
  const [loading, setLoading] = useState<any>(false);
  const [fiatLoading, setFiatLoading] = useState<any>(false);
  const [msg, setMsg] = useState<any>("");
  const [alertType, setAlertType] = useState<any>("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    handleGetTransactionHistory();
    handleGetFiatTransactionHistory();
  }, []);

  async function handleGetTransactionHistory() {
    const storedTx = localStorage.getItem("uniqueTransactions");
    const parsedTx = JSON.parse(storedTx || "null");

    if (parsedTx) {
      setTransactionHistory(parsedTx);
    }
    if (!parsedTx) {
      setLoading(true);
    }
    try {
      if (!user) {
        setFiatTransactionHistory(false);
        return;
      }
      const response = await getTransactionHistory(user);

      if (!response.success) {
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
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
        setFiatLoading(false);
        return;
      }

      // Remove duplicate transactionIds
      const uniqueTransactions = Array.from(
        new Map(
          response.data.transactions.map((item) => [
            item.transaction_hash,
            item,
          ])
        ).values()
      );
      setTransactionHistory(uniqueTransactions);
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
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
      setLoading(false);
    }
  }

  async function handleGetFiatTransactionHistory() {
    const storedTx = localStorage.getItem("fiatTransactions");
    const parsedTx = JSON.parse(storedTx || "null");

    if (parsedTx) {
      setFiatTransactionHistory(parsedTx);
    }
    if (!parsedTx) {
      setFiatLoading(true);
    }
    try {
      if (!user) {
        setFiatTransactionHistory(false);
        return;
      }
      const response = await getFiatTransactionHistory(user, 10, 1);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setFiatLoading(false);
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
        return;
      }

      setFiatTransactionHistory(response?.data?.json?.transactions);
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      console.error(error);
    } finally {
      setFiatLoading(false);
    }
  }

  return (
    <div className="w-full md:grid grid-cols-12">
      <div className="md:block hidden h-[100vh] sidebar p-4 pr-2 ">
        <SideNav />
      </div>
      <div className="py-6 overflow-hidden h-[100px] w-full z-50 sticky md:top-[-2%] top-0">
        <TopNav page="Transaction History" />
      </div>
      <div className="mt-[80px]  main-container md:pl-[60px] px-4 pl-2 w-full overflow-hidden md:col-span-10 col-span-12">
        <main className="top-0 left-0 right-0 w-full">
          {isActivateWalletAlert ? (
            <p className="text-black tetx-center flex justify-center items-center align-middle text-[20px] p-5 bg-red-300 rounded-md my-2">
              {isActivateWalletAlert && activateWalletAlert}
            </p>
          ) : (
            <TransactionTable
              name="Crypto Transaction History"
              tableType="crypto"
              transactionHistory={transactionHistory}
              loadingTx={loading}
              setSearchText={setSearchText}
              searchText={searchText}
            />
          )}
          <TransactionTable
            name="Fiat Transaction History"
            tableType="fiat"
            transactionHistory={fiatTransactionHistory}
            loadingTx={fiatLoading}
            setSearchText={setFiatSearchText}
            searchText={fiatSearchText}
          />
        </main>
        <MobileNav />
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default History;
