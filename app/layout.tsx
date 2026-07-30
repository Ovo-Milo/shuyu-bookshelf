import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2eee5",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  return {
    title: "书屿 · 我的私人书架",
    description:
      "搜索公开书目，收藏想读、在读和读完的书，记录评分、日期与阅读笔记。",
    applicationName: "书屿",
    alternates: { canonical: baseUrl },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      url: baseUrl,
      siteName: "书屿",
      title: "书屿 · 把读过的书，留在这里",
      description: "一座安静、好用的私人书架，收好每一本书与每一次阅读。",
      images: [
        {
          url: `${baseUrl}/og.png`,
          width: 1200,
          height: 630,
          alt: "书屿私人书架",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "书屿 · 把读过的书，留在这里",
      description: "搜索、收藏、评分，慢慢建立自己的阅读档案。",
      images: [`${baseUrl}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
