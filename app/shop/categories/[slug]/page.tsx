"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ProductCard from "@/components/product-card";
import { useCart } from "@/hooks/useCart";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  stock: number;
  weight?: string;
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
          setCategory(catData.category || null);
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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/shop"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Shop
        </Link>

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {category?.name || "Category"}
          </h1>
          <p className="text-gray-600 mt-2">
            {category?.description || "Products in this category"}
          </p>
        </div>

        {isLoading ? (
          <p className="text-gray-600">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-600">No products found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onAddToCart={() =>
                  addItem({
                    productId: product.id,
                    productSlug: product.slug,
                    productName: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: 1,
                  })
                }
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
