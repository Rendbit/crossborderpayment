const getMyAssets = async (token: string, selectedAsset = "NGNC") => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/horizonQueries/getAllWalletAssets?currencyType=${selectedAsset}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch user assets");
    }
    if (!selectedAsset) {
      localStorage.setItem(
        "selectedAsset",
        JSON.stringify(data?.data?.allWalletAssets[0])
      );
      localStorage.setItem(
        "allWalletTotalBalanceInUsd",
        JSON.stringify(data?.data?.allWalletTotalBalanceInUsd)
      );
    }
    localStorage.setItem("walletAssets", JSON.stringify(data.data));
    localStorage.setItem(
      "allWalletAssets",
      JSON.stringify(data.data.allWalletAssets)
    );
    localStorage.setItem("wallet", JSON.stringify(data.data));
    localStorage.setItem(
      "allWalletTotalBalanceInSelectedCurrency",
      JSON.stringify(data.data.allWalletTotalBalanceInSelectedCurrency)
    );
    localStorage.setItem(
      "nonYieldWalletTotalBalanceInSelectedCurrency",
      JSON.stringify(data.data.nonYieldWalletTotalBalanceInSelectedCurrency)
    );
    localStorage.setItem(
      "yieldWalletTotalBalanceInSelectedCurrency",
      JSON.stringify(data.data.yieldWalletTotalBalanceInSelectedCurrency)
    );
    localStorage.setItem(
      "allWalletTotalBalanceInUsd",
      JSON.stringify(data.data.allWalletTotalBalanceInUsd)
    );
    localStorage.setItem(
      "yieldWalletAssets",
      JSON.stringify(data.data.yieldWalletAssets)
    );
    localStorage.setItem(
      "nonYieldWalletAssets",
      JSON.stringify(data.data.nonYieldWalletAssets)
    );

    return data;
  } catch (error: any) {
    console.log("Error handling get all my assets:", error);
    throw new Error(error.message || "Error handling get all my assets.");
  }
};

const getAllTrustLines = async (token: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/horizonQueries/getAllTrustLines`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.log({ data });
      throw new Error(data.message || "Failed to get alltrustlines");
    }
    localStorage.setItem("PUBLIC_ASSETS", JSON.stringify(data.data.trustLines));
    return data;
  } catch (error: any) {
    console.log("Error handling get all trustlines:", error);
    throw new Error(error.message || "Error handling get all trustlines.");
  }
};

const getConversionRates = async (
  token: string,
  inputAmount: number,
  inputSymbol: string,
  outputSymbol: string,
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/horizonQueries/getConversionRates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          inputSymbol,
          outputSymbol,
          inputAmount,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch conversion rates");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling get conversion rates: ", error);
    throw new Error(error.message || "Error handling get conversion rates.");
  }
};

export { getMyAssets, getAllTrustLines, getConversionRates };
