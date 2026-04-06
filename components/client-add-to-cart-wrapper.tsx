"use client";

import ProductCard from "@/components/product-card";
import { useCart } from "@/hooks/useCart";

export default function ClientAddToCartWrapper({ product }: { product: any }) {
  const { addItem } = useCart();

  return (
    <ProductCard
      {...product}
      onAddToCart={(variation: any) =>
        addItem({
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          price: variation.discountPrice || variation.price,
          image: product.image,
          quantity: 1,
          weight: variation.weight,
          flavor: variation.flavor,
          stock: variation.stock,
        })
      }
    />
  );
}
