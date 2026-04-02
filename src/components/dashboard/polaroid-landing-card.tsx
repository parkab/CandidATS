import Image from 'next/image';
import PolaroidShell from '@/components/dashboard/polaroid-shell';

type PolaroidLandingCardProps = {
  imageSrc: string;
  imageAlt: string;
  caption: string;
  angle?: number;
};

// purely cosmetic card for landing page
export default function PolaroidLandingCard({
  imageSrc,
  imageAlt,
  caption,
  angle = 0,
}: PolaroidLandingCardProps) {
  return (
    <PolaroidShell angle={angle}>
      <div className="min-h-48 overflow-hidden rounded-xs shadow-inner">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={600}
          height={400}
          className="h-48 w-full object-cover"
        />
      </div>

      <div className="mt-4 flex items-center justify-center text-center text-base">
        <p className="line-clamp-2 font-semibold leading-snug tracking-wide">
          {caption}
        </p>
      </div>
    </PolaroidShell>
  );
}
