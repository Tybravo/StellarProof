"use client";

import { useEffect, useState } from "react";
import {
  fetchDigitalProducts,
  type DigitalProduct,
} from "@/services/productMock";
import ProductCard from "./ProductCard";
import { useWallet } from "@/context/WalletContext";

export default function ProductGrid() {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
//   const [loading, setLoading] = useState(true);
  const { isConnected, publicKey } = useWallet();

 useEffect(() => {
  if (!isConnected || !publicKey) {
    return;
  }

  const loadProducts = async () => {
    // setLoading(true);

    try {
      const data = await fetchDigitalProducts(publicKey);
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
    //   setLoading(false);
    }
  };

  loadProducts();
}, [isConnected, publicKey]);

  if (!isConnected || !publicKey) {
    return (
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">
          My Products
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          My Products
        </h2>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {products.length} Products
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}