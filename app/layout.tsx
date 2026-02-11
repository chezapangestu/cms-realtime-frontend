import "./globals.css";

export const metadata = {
  title: "Realtime CMS",
  description: "CMS realtime images/video",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto max-w-8xl px-4 py-4">{children}</div>
      </body>
    </html>
  );
}
