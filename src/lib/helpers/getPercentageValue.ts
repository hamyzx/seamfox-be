export const getPercentageValue = (value: number, percentage: number) => {
  const decimalValue = Number(value.toFixed(2));
  return (decimalValue * percentage) / 100;
};
