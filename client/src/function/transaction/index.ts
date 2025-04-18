const getTransactionHistory = async (token: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/transaction/crypto-all `,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch transaction history");
    }
    const uniqueTransactions = Array.from(
      new Map(
        data.data.transactions.map((item: any) => [
          item.transaction_hash,
          item,
        ])
      ).values()
    );
    localStorage.setItem(
      "uniqueTransactions",
      JSON.stringify(uniqueTransactions)
    );
    return data;
  } catch (error: any) {
    console.log("Error handling get transaction history: ", error);
    throw new Error(error.message || "Error handling get transaction history");
  }
};

const getFiatTransactionHistory = async (
  token: string,
  limit: number,
  page: number
) => {
  try {
    const res = await fetch(
      `${
        import.meta.env.VITE_BASE_URL
      }/transaction/fiat-all?page=${page}&limit=${limit}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          assetCode: "NGNC",
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.message || "Failed to fetch fiat transaction history"
      );
    }

    localStorage.setItem(
      "fiatTransactions",
      JSON.stringify(data?.data?.json?.transactions)
    );

    return data;
  } catch (error: any) {
    console.log("Error handling get fiat transaction history: ", error);
    throw new Error(
      error.message || "Error handling get fiat transaction history"
    );
  }
};

const makeWithdrawal = async (
  amount: number,
  address: string,
  assetCode: string,
  currencyType: string,
  transactionType: string,
  transactionDetails: any,
  token: string
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/transaction/payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          address,
          assetCode,
          currencyType,
          transactionType,
          transactionDetails,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to make withdrawal");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling make withdrawal:", error);
    throw new Error(error.message || "Error handling make withdrawal.");
  }
};

const swapAssets = async (
  token: string,
  sourceAssetCode: string,
  desAssetCode: string,
  sourceAmount: number,
  slippage: number
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/transaction/swap`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceAssetCode,
          desAssetCode,
          sourceAmount,
          slippage,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to swap assets");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling asset swap: ", error);
    throw new Error(error.message || "Error handling asset swap");
  }
};

const removeTrustLine = async (assetCode: string, token: string) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/transaction/remove-trustline`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          assetCode,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to remove trustline");
    }
    return data;
  } catch (error: any) {
    console.error("Error handling remove trustline: ", error);
    throw new Error(error.message || "Error handling remove trustline");
  }
};

const addTrustLine = async (assetCode: string, token: string) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/transaction/add-trustline`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          assetCode,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to add trustline");
    }
    return data;
  } catch (error: any) {
    console.error("Error handling add trustline: ", error);
    throw new Error(error.message || "Error handling add trustline");
  }
};

export {
  getTransactionHistory,
  getFiatTransactionHistory,
  makeWithdrawal,
  swapAssets,
  addTrustLine,
  removeTrustLine,
};
