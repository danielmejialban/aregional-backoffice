export interface PageDTO<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
