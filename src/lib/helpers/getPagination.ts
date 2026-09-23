export const getPagination = (page: number, pageSize: number) => {
  const take = pageSize ? +pageSize : 10;
  const skip = (page - 1) * take;

  return { take, skip };
};
