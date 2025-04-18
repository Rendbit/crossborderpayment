const queryTransaction = async (token: string, assetCode: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/sep24/queryTransfers24`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          assetCode,
        }),
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

const initiateDeposit = async (token: string, assetCode: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASE_URL}/sep24/initiateTransfer24/deposit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          assetCode,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to initiate deposit");
    }

    return data;
  } catch (error: any) {
    console.error("Error handling initiate deposit:", error);
    throw new Error(error.message || "Error handling initiate deposit.");
  }
};

export { queryTransaction, initiateDeposit };
