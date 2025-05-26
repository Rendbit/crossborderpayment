const getStats = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/stats/all`, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${import.meta.env.VITE_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      
      throw new Error(data.message || "Failed to all stats");
    }
    localStorage.setItem("userData", JSON.stringify(data.data));
    return data;
  } catch (error: any) {
    console.log("Error handling get all stats:", error);
    throw new Error(error.message || "Error handling get all stats");
  }
};

export { getStats };