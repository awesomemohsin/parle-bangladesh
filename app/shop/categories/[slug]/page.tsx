"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProductCard from "@/components/product-card";
import { useCart } from "@/hooks/useCart";

type Variation = {
  weight?: string;
  flavor?: string;
  price: number;
  stock: number;
  isDefault?: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  variations: Variation[];
  image: string;
  description?: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export default function CategoryProductsPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const { addItem } = useCart();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRes, productsRes] = await Promise.all([
          fetch(`/api/categories/${slug}`),
          fetch(`/api/products?category=${slug}`),
        ]);

        if (categoryRes.ok) {
          const catData = await categoryRes.json();
          const cat = catData.category || null;
          setCategory(cat);
          if (cat) {
            document.title = `${cat.name} | Parle Bangladesh`;
          }
        }

        if (productsRes.ok) {
          const prodData = await productsRes.json();
          setProducts(prodData.products || []);
        }
      } catch (error) {
        console.error("Failed to load category products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadData();
    }
  }, [slug]);

  return (
    <div className="min-h-screen bg-white">

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/shop"
          className="text-red-600 hover:text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-2 group transition-all"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Shop
        </Link>

        <div className="mt-8 mb-12">
          <span className="text-red-600 font-black text-xs uppercase tracking-[0.3em]">Category</span>
          <h1 className="text-4xl text-gray-900 font-black tracking-tighter uppercase mt-2">
            {category?.name || "Category"}
          </h1>
          <p className="text-gray-500 font-medium mt-2 max-w-2xl">
            {category?.description || "Explore our collection of high-quality Parle snacks and beverages."}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading {category?.name || 'Category'}...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-black uppercase tracking-widest">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onAddToCart={(variation: Variation) =>
                  addItem({
                    productId: product.id,
                    productSlug: product.slug,
                    productName: product.name,
                    price: variation.price,
                    image: product.image,
                    quantity: 1,
                    weight: variation.weight,
                    flavor: variation.flavor,
                  })
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
