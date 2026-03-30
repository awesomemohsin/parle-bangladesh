"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
};

export default function ShopPage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = 'Shop | Parle Bangladesh'
    const loadData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to load shop data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory =
        selectedCategory === "all" || product.category === selectedCategory;
      const query = search.trim().toLowerCase();
      const bySearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.description || "")
          .toLowerCase()
          .includes(query);

      return byCategory && bySearch;
    });
  }, [products, selectedCategory, search]);

  return (
    <div className="min-h-screen bg-white">

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Shop Products</h1>
          <p className="text-gray-500 font-medium">
            Explore our range of premium Parle products
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="What are you looking for?"
              className="px-5 py-3 rounded-xl border-2 border-gray-100 focus:border-red-600 focus:outline-none transition-all placeholder:text-gray-300 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-5 py-3 rounded-xl border-2 border-gray-100 focus:border-red-600 focus:outline-none transition-all bg-white font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Link
              href="/shop/cart"
              className="w-full flex items-center justify-center h-14 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-red-100"
            >
              View Shopping Cart
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 font-bold uppercase tracking-widest">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
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
