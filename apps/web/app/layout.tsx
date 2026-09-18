export const metadata = {
  title: "Elkano · Embat · HackSpain 2026",
  description: "Tesorería en tiempo real con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
