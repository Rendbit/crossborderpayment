const formateDecimal = (value: number) => {
  if (!value) return "0";
  const balanceStr = value.toString();
  const decimalIndex = balanceStr.indexOf(".");
  if (decimalIndex === -1) return balanceStr;
  const decimalPlaces = balanceStr.length - decimalIndex - 1;
  if (decimalPlaces >= 2) return String(value.toFixed(2));
  if (decimalPlaces >= 4) return String(value.toFixed(4));
  if (decimalPlaces >= 6) return String(value.toFixed(6));
  return String(value.toFixed(8));
};

export { formateDecimal };
