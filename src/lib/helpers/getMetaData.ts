import { PaginationDTO } from '../dto/pagination.dto';

export const getMetaData = (filters: PaginationDTO, total: number) => {
  const meta = {
    page: filters.page,
    limit: filters.limit,
    total,
  };

  return meta;
};
