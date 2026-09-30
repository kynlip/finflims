import type { Metadata } from 'next';
import { FranchiseCatalog } from '@/components/FranchiseCatalog';
import { FRANCHISES } from '@/lib/franchises';

export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const collection = FRANCHISES.doraemon;
  return {
    title: `${collection.displayName} - ${collection.subtitle}`,
    description: collection.pageDescription,
  };
}

export default function DoraemonPage({ searchParams }: PageProps) {
  return <FranchiseCatalog franchise="doraemon" searchParams={searchParams} />;
}
