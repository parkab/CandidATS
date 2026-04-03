import Image from 'next/image';
import PolaroidShell from '@/components/dashboard/polaroid-shell';

//can't actually add applications yet!
//TODO: implement add application flow
export default function PolaroidAddCard() {
  return (
    <PolaroidShell useTilt={false}>
      <div className="min-h-48 overflow-hidden rounded-xs shadow-inner">
        <Image
          src="/images/polaroid-camera.jpg"
          alt="Polaroid camera"
          width={600}
          height={400}
          className="h-48 w-full object-cover"
        />
      </div>

      <div className="mt-4 flex items-center justify-center text-base">
        <p className="font-semibold tracking-wide">+ Add a Job</p>
      </div>
    </PolaroidShell>
  );
}
