import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShopSlugRedirectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  
  // Safely rebuild all incoming query parameters (like weight, flavor, etc.)
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(val => queryParams.append(key, val));
      } else {
        queryParams.append(key, value);
      }
    }
  }
  
  const queryString = queryParams.toString();
  const redirectUrl = `/shop/products/${slug}${queryString ? `?${queryString}` : ''}`;
  
  redirect(redirectUrl);
}
