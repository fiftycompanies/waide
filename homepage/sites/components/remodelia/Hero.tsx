import Image from "next/image";
import { images } from "@/data/remodelia";

export default function Hero() {
  return (
    <section className="relative w-full mt-[65px]">
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9]">
        <Image
          src={images.hero}
          alt="리모델리아 인테리어 메인 이미지"
          fill
          className="object-cover"
          priority
          unoptimized
        />
      </div>
    </section>
  );
}
