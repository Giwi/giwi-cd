import type { Request, Response, NextFunction } from 'express';

interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const createPagination = (defaultLimit = 20, maxLimit = 100) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
    const offset = (page - 1) * limit;

    (req as unknown as Record<string, unknown>).pagination = { page, limit, offset };
    next();
  };
};

const paginate = <T>(data: T[], total: number, pagination: PaginationOptions): PaginatedResult<T> => {
  const { page, limit } = pagination;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

export { createPagination, paginate };
