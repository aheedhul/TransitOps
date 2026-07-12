import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

interface VehicleQRProps {
  registrationNumber: string;
  detailUrl: string;
}

export function VehicleQRCode({ registrationNumber, detailUrl }: VehicleQRProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, detailUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }, [detailUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `vehicle-${registrationNumber}-qr.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('qrCode.title')}</h3>
      <canvas ref={canvasRef} className="rounded border" />
      <p className="text-xs text-muted-foreground">{registrationNumber}</p>
      <p className="text-xs text-muted-foreground">{t('qrCode.description')}</p>
      <button
        onClick={handleDownload}
        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t('qrCode.download')}
      </button>
    </div>
  );
}
