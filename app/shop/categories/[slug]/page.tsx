import { getCategoryBySlug, getProducts, getCategories } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductCard from "@/components/product-card";
import Link from "next/link";
import { Metadata } from "next";
import ClientAddToCartWrapper from "@/components/client-add-to-cart-wrapper";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  
  if (!category) {
    return { title: "Category Not Found | Parle Bangladesh" };
  }

  return {
    title: `${category.name} | Parle Bangladesh`,
    description: category.description || `Browse our collection of ${category.name}`,
  };
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat: any) => ({
    slug: cat.slug,
  }));
}

export const revalidate = 60;

export default async function CategoryProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProducts({ query: { category: slug } })
  ]);

  if (!category) {
    notFound();
  }

  // Serialize IDs
  const serializedProducts = products.map((p: any) => ({
    ...JSON.parse(JSON.stringify(p)),
    id: p._id.toString()
  }));

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-red-100">
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <Link
          href="/#categories"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all mb-10 group"
        >
          <div className="w-7 h-7 rounded-full border-2 border-gray-100 flex items-center justify-center group-hover:border-red-600 group-hover:bg-red-600 group-hover:text-white transition-all text-xs">
            ←
          </div>
          Check Other Categories
        </Link>

        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
               <span className="w-8 h-1 bg-red-600 rounded-full"></span>
               <span className="text-xs font-bold text-red-600 uppercase tracking-widest">{category.name}</span>
            </div>
            <h1 className="text-4xl md:text-5xl text-gray-900 font-bold tracking-tight uppercase mb-4 leading-none">
              {category.name}
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-xl leading-relaxed">
              {category.description || "Fresh and delicious Parle products."}
            </p>
          </div>
          
          <Link href="/shop">
            <button className="h-14 px-8 rounded-xl bg-white border-2 border-slate-100 text-gray-400 hover:border-red-600 hover:text-red-600 font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-sm">
               Browse All Products
            </button>
          </Link>
        </div>

        {serializedProducts.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {serializedProducts.map((product: any) => (
              <ClientAddToCartWrapper key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
