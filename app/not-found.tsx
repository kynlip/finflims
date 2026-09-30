import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Navbar handled by RootLayout */}

      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
          {/* Text Content */}
          <div className="order-2 flex flex-col items-center space-y-6 md:order-1 md:items-start">
            <h1 className="text-primary font-serif text-8xl font-black tracking-tighter drop-shadow-sm md:text-9xl">
              404
            </h1>
            <h2 className="text-foreground text-2xl font-bold md:text-4xl">
              Hmm!? Có vẻ bạn đã đi lạc?
            </h2>
            <p className="text-muted-foreground max-w-md text-lg">
              Giống như Zoro, có lẽ bạn đã bị lạc đường trong thế giới này.
              Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
            </p>

            <Link
              href="/"
              className="bg-primary text-primary-foreground hover:shadow-primary/30 rounded-full px-8 py-3 text-lg font-bold transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95"
            >
              Quay Về Trang Chủ
            </Link>
          </div>

          {/* Image */}
          <div className="animate-in fade-in zoom-in relative order-1 h-[300px] w-full duration-500 md:order-2 md:h-[500px]">
            {/* Using a placeholder for Zoro - User should replace with actual transparent PNG */}
            <div className="relative h-full w-full">
              {/* Decorative Elements */}
              <div className="bg-primary/5 absolute inset-0 rounded-full blur-[100px]" />

              <Image
                src="/images/zoro-404.png"
                alt="Zoro Lost"
                fill
                className="relative z-10 object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                unoptimized
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
