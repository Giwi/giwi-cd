export interface QueryChain {
  value(): unknown;
  write(): QueryChain;
  push(item: Record<string, unknown>): QueryChain;
  find(query: Record<string, unknown>): FindChain;
  filter(query: Record<string, unknown> | ((item: Record<string, unknown>) => boolean)): FilterChain;
  remove(query: Record<string, unknown>): QueryChain;
  assign(updates: Record<string, unknown>): QueryChain;
  map(fn: (item: Record<string, unknown>) => unknown): { value(): unknown[] };
  take(n: number): { value(): unknown[] };
  orderBy(keys: string[], orders: string[]): { reverse(): { value(): unknown[] }; value(): unknown[] };
}

export interface FindChain {
  value(): Record<string, unknown> | undefined;
  assign(updates: Record<string, unknown>): QueryChain;
  remove(): QueryChain;
}

export interface FilterChain {
  value(): Record<string, unknown>[];
  assign(updates: Record<string, unknown>): QueryChain;
  orderBy(keys: string[], orders: string[]): { reverse(): { value(): unknown[] }; value(): unknown[]; take(n: number): { value(): unknown[] } };
  sortBy(key: string): { reverse(): { value(): unknown[] }; value(): unknown[] };
  take(n: number): { value(): unknown[] };
}
