import type { MetadataRoute } from 'next';
import connectDB from '@/lib/db';
import { Product, Category } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Cache sitemap for 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parlebangladesh.com';

  // Base static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/offers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    await connectDB();

    // Fetch categories from DB
    const categories = await Category.find({}, 'slug updatedAt').lean();
    const categoryRoutes = categories.map((cat: any) => ({
      url: `${baseUrl}/shop/categories/${cat.slug}`,
      lastModified: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Fetch products from DB
    const products = await Product.find({}, 'slug updatedAt').lean();
    const productRoutes = products.map((prod: any) => ({
      url: `${baseUrl}/shop/products/${prod.slug}`,
      lastModified: prod.updatedAt ? new Date(prod.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    console.error('Error generating dynamic sitemap, returning static routes only:', error);
    return staticRoutes;
  }
}
