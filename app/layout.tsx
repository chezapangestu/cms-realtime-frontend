import "./globals.css";

export const metadata = {
  title: "Landing Masjid Al-Ukhuwah PBCVR",
  description: "Informasi seputar Masjid Al-Ukhuwah PBCVR",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-white text-zinc-900">
        <div className="mx-auto max-w-8xl">{children}</div>
      </body>
    </html>
  );
}
