import type { Metadata } from 'next';
import { FranchiseCatalog } from '@/components/FranchiseCatalog';
import { FRANCHISES } from '@/lib/franchises';

export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    format?: string;
    category?: string;
    character?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const collection = FRANCHISES['sieu-nhan'];
  return {
    title: `${collection.displayName} - ${collection.subtitle}`,
    description: collection.pageDescription,
  };
}

export default function SieuNhanPage({ searchParams }: PageProps) {
  return <FranchiseCatalog franchise="sieu-nhan" searchParams={searchParams} />;
}
