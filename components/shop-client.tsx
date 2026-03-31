"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/product-card";
import { useCart } from "@/hooks/useCart";
import { Search, ShoppingCart, Filter } from "lucide-react";

interface Variation {
  weight?: string;
  flavor?: string;
  price: number;
  stock: number;
  image?: string;
  isDefault?: boolean;
  isBulk?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  variations: Variation[];
  description?: string;
  isBulk?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ShopClient({ 
  initialProducts, 
  categories 
}: { 
  initialProducts: any[], 
  categories: any[] 
}) {
  const { addItem } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [search, setSearch] = useState("");

  // Sync state with URL
  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      setSelectedCategory(category);
    } else {
      setSelectedCategory("all");
    }
  }, [searchParams]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    router.push(`/shop?${params.toString()}`, { scroll: false });
  };

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const isBulkMatch = selectedCategory === "bulk" && product.isBulk;
      const byCategory =
        selectedCategory === "all" || 
        product.category === selectedCategory ||
        isBulkMatch;
      
      const query = search.trim().toLowerCase();
      const bySearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.description || "")
          .toLowerCase()
          .includes(query);

      return byCategory && bySearch;
    });
  }, [initialProducts, selectedCategory, search]);

  return (
    <>
      {/* Search & Filters Interface */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 mb-12 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-xl shadow-gray-200/40">
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-2 flex items-center gap-2">
             <Search className="w-3 h-3" /> Search
          </label>
          <div className="relative group">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full px-5 py-3 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 group-hover:border-gray-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-2 flex items-center gap-2">
             <Filter className="w-3 h-3" /> Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-5 py-3 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-black focus:outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="bulk" className="text-red-600 font-black">🎁 BULK / FAMILY PACKS</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Link
            href="/shop/cart"
            className="w-full flex items-center justify-center gap-3 h-[52px] rounded-xl bg-red-600 text-white font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 text-xs group"
          >
            <ShoppingCart className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            View Cart
          </Link>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-100">
           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-200" />
           </div>
           <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No products found</p>
           <p className="text-xs font-medium text-gray-300 mt-2 uppercase tracking-widest">Try adjusting your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
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
    </>
  );
}
