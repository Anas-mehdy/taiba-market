import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import BottomNav from "@/components/BottomNav";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "ماركت طيبة - عروض اليوم والكتالوج الإلكتروني",
  description: "ماركت طيبة - تسوق أجود المواد الغذائية والخضار والمنتجات اليومية مع عروض حصرية وطلب مباشر عبر واتساب.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
        <CartProvider>
          {children}
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
