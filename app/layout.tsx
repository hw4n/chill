import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const notoSansKR = Noto_Sans_KR({
    variable: "--font-noto-sans-kr",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "C.H.I.L.L",
    description: "Create Hierarchical Interactive Language Layers",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={`${notoSansKR.variable} antialiased`}>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
