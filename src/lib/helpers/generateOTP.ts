export const generateOtp = (digits: number = 4): number => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const otp = Math.floor(min + Math.random() * (max - min + 1));
  return otp;
};
