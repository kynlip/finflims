'use server';

import { searchMoviesAdvanced, SearchFilters } from '@/lib/data';

export async function searchAnimations(
  query: string,
  filters: SearchFilters = {}
) {
  // Input validation - query is now optional if filters are present
  const cleanQuery = query ? query.trim() : '';

  // Maximum length check to prevent abuse
  if (cleanQuery.length > 100) {
    return [];
  }

  // Call the data layer with sanitized input and filters
  return await searchMoviesAdvanced(cleanQuery, filters);
}
