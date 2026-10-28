import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Hoàn Lão Pickleball — Hẹn nhau trên sân",
  description:
    "Câu lạc bộ Pickleball xã Hoàn Lão. Cập nhật giải đấu, đăng ký thi đấu và những khoảnh khắc trên sân.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
