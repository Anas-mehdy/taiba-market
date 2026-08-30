'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  quantity: number;
  unit_type?: 'piece' | 'kg' | 'gram' | 'liter' | 'custom' | string;
  unit_label?: string;
  min_quantity?: number;
  step_quantity?: number;
  pricing_unit_step?: number;
  applied_offer?: string | null;
}

export interface AddToCartPayload {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  unit_type?: 'piece' | 'kg' | 'gram' | 'liter' | 'custom' | string;
  unit_label?: string;
  min_quantity?: number;
  step_quantity?: number;
  pricing_unit_step?: number;
  applied_offer?: string | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: AddToCartPayload) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalQuantity: number;
  totalItemsCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const calculateItemTotal = (item: CartItem): number => {
  const price = Number(item.price || 0);
  const qty = Number(item.quantity || 0);
  const pricingStep = item.pricing_unit_step && item.pricing_unit_step > 0 ? Number(item.pricing_unit_step) : 1;
  return (price * qty) / pricingStep;
};

export const formatQuantityWithUnit = (quantity: number, unitLabel?: string, unitType?: string): string => {
  const cleanQty = Number(quantity.toFixed(3)).toString();
  const label = unitLabel || (unitType === 'kg' ? 'كغ' : unitType === 'gram' ? 'غرام' : 'قطعة');
  
  if (unitType === 'gram' && quantity >= 1000 && quantity % 1000 === 0) {
    return `${quantity / 1000} كغ (${quantity} غرام)`;
  }
  return `${cleanQty} ${label}`;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from LocalStorage on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('tayba_cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage', error);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to LocalStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('tayba_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
    }
  }, [cart, isLoaded]);

  const addToCart = (product: AddToCartPayload) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      const step = product.step_quantity && product.step_quantity > 0 ? product.step_quantity : 1;
      const min = product.min_quantity && product.min_quantity > 0 ? product.min_quantity : step;
      const pricingStep = product.pricing_unit_step && product.pricing_unit_step > 0 ? product.pricing_unit_step : 1;
      const unitLabel = product.unit_label || (product.unit_type === 'kg' ? 'كغ' : product.unit_type === 'gram' ? 'غرام' : 'قطعة');

      if (existingItem) {
        const currentStep = existingItem.step_quantity || step;
        const newQty = Math.round((existingItem.quantity + currentStep) * 1000) / 1000;
        return prevCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: newQty,
                unit_type: product.unit_type || item.unit_type,
                unit_label: unitLabel || item.unit_label,
                min_quantity: min,
                step_quantity: currentStep,
                pricing_unit_step: pricingStep,
                applied_offer: product.applied_offer || item.applied_offer
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          ...product,
          quantity: min,
          unit_type: product.unit_type || 'piece',
          unit_label: unitLabel,
          min_quantity: min,
          step_quantity: step,
          pricing_unit_step: pricingStep
        }
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId);
      if (!existingItem) return prevCart;

      const step = existingItem.step_quantity && existingItem.step_quantity > 0 ? existingItem.step_quantity : 1;
      const min = existingItem.min_quantity && existingItem.min_quantity > 0 ? existingItem.min_quantity : step;
      const newQty = Math.round((existingItem.quantity - step) * 1000) / 1000;

      if (newQty < min || newQty <= 0.0001) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQty } : item
      );
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0.0001) {
      setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === productId ? { ...item, quantity: Math.round(quantity * 1000) / 1000 } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItemsCount = cart.length;
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + calculateItemTotal(item), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalQuantity,
        totalItemsCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
