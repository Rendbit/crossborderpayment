import React from "react";
import TopNav from "../components/top-nav/TopNav";
import TransactionTable from "../components/table/TransactionTable";

const History: React.FC = () => {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
      <TopNav page="Dashboard" />
      <TransactionTable isHistoryPage={true} />
    </main>
  );
};

export default History;
