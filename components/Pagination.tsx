import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${page}`;
  };

  // Determine page range to show
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (endPage - startPage < 4) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + 4);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - 4);
    }
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2 overflow-x-auto pb-4 md:mt-12 md:pb-0">
      {/* Previous Button - Only show if not on first page */}
      {currentPage > 1 && (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="border-border bg-background hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}

      {startPage > 1 && (
        <>
          <Link
            href={getPageUrl(1)}
            className="border-border bg-background hover:bg-muted hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
          >
            1
          </Link>
          {startPage > 2 && <span className="text-muted-foreground">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={getPageUrl(page)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border font-bold transition-all ${
            currentPage === page
              ? 'bg-primary text-primary-foreground border-primary shadow-primary/25 scale-110 shadow-lg'
              : 'border-border bg-background hover:border-primary hover:text-primary hover:scale-105'
          } `}
        >
          {page}
        </Link>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="text-muted-foreground">...</span>
          )}
          <Link
            href={getPageUrl(totalPages)}
            className="border-border bg-background hover:bg-muted hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next Button - Only show if not on last page */}
      {currentPage < totalPages && (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="border-border bg-background hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
}
