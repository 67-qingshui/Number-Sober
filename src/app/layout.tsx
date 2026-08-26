import "./globals.css";

export const metadata = {
  title: "Number Sober 明算",
  description: "记账 · 分账 · 资产管理工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
