const queryTransaction = async (token: string, assetCode: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/sep24/queryTransfers24?assetCode=${assetCode}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to query transaction");
    }

    return data;
  } catch (error: any) {
    console.log("Error handling query transaction:", error);
    throw new Error(error.message || "Error handling query transaction.");
  }
};

const initiateTransfer24 = async (token: string, assetCode: string, stellarPublicKey: string, txType: string) => {
  console.log({assetCode, txType})
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/sep24/initiateTransfer24/${txType}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({assetCode, stellarPublicKey})
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Failed to initiate ${txType}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Error handling initiate ${txType}:`, error);
    throw new Error(error.message || `Error handling initiate ${txType}.`);
  }
};

export { queryTransaction, initiateTransfer24 };
