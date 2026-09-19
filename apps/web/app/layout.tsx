import "./globals.css";
import Sidebar from "@/components/shell/Sidebar";

export const metadata = {
  title: "Elkano X-Ray · Embat",
  description: "Plataforma de salud financiera: score, cartera, empresas y productos sobre 1.282 empresas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-16 pt-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
