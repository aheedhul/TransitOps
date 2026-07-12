import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { Card } from '../../../components/ui/card.js';
import { Button } from '../../../components/ui/button.js';

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
        dark: '#0f172a',
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
    <Card className="flex flex-col items-center gap-3 p-5">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <QrCode className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t('qrCode.title')}</h3>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-2">
        <canvas ref={canvasRef} className="rounded" />
      </div>
      <div className="text-center">
        <p className="font-mono text-xs font-semibold text-foreground">
          {registrationNumber}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{t('qrCode.description')}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Download className="h-3.5 w-3.5" />}
        onClick={handleDownload}
        className="w-full"
      >
        {t('qrCode.download')}
      </Button>
    </Card>
  );
}
