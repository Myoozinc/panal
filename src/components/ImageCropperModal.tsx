import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Crop, Check } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

const VIEWPORT_SIZE = 300; // Display viewport width and height in px
const CROP_RADIUS = 135;   // Radius of the circular crop area in viewport px
const EXPORT_SIZE = 800;   // High-res square output size

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      setImgElement(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgElement(img);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw preview on canvas whenever image, offset, zoom, or rotation changes
  useEffect(() => {
    if (!canvasRef.current || !imgElement) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Determine scale to cover the crop circle
    const minCover = CROP_RADIUS * 2;
    const isSideways = rotation === 90 || rotation === 270;
    const effWidth = isSideways ? imgElement.naturalHeight : imgElement.naturalWidth;
    const effHeight = isSideways ? imgElement.naturalWidth : imgElement.naturalHeight;

    const baseScale = Math.max(minCover / effWidth, minCover / effHeight);
    const scale = baseScale * zoom;

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Draw background
    ctx.fillStyle = "#18181b"; // Dark neutral canvas background
    ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Transform and draw image
    ctx.save();
    ctx.translate(VIEWPORT_SIZE / 2 + offset.x, VIEWPORT_SIZE / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(
      imgElement,
      -imgElement.naturalWidth / 2,
      -imgElement.naturalHeight / 2
    );
    ctx.restore();
  }, [imgElement, offset, zoom, rotation]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag & pinch-to-zoom handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDistRef.current;
      const newZoom = Math.min(3, Math.max(1, initialZoomRef.current * factor));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistRef.current = null;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      return Math.min(3, Math.max(1, +(prev + delta).toFixed(2)));
    });
  };

  // Export cropped 800x800 JPEG File
  const handleConfirm = () => {
    if (!imgElement) return;

    const minCover = CROP_RADIUS * 2;
    const isSideways = rotation === 90 || rotation === 270;
    const effWidth = isSideways ? imgElement.naturalHeight : imgElement.naturalWidth;
    const effHeight = isSideways ? imgElement.naturalWidth : imgElement.naturalHeight;

    const baseScale = Math.max(minCover / effWidth, minCover / effHeight);
    const scale = baseScale * zoom;

    const exportScaleRatio = (EXPORT_SIZE / 2) / CROP_RADIUS;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Fill white backing
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

    ctx.save();
    ctx.translate(
      EXPORT_SIZE / 2 + offset.x * exportScaleRatio,
      EXPORT_SIZE / 2 + offset.y * exportScaleRatio
    );
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * exportScaleRatio, scale * exportScaleRatio);
    ctx.drawImage(
      imgElement,
      -imgElement.naturalWidth / 2,
      -imgElement.naturalHeight / 2
    );
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `avatar-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCropComplete(file);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-[94vw] rounded-3xl p-5 border border-border/60 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Crop className="w-5 h-5 text-primary" /> Encuadrar foto de perfil
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Arrastra la foto para posicionarla y usa el zoom para ajustarla dentro del círculo.
          </p>
        </DialogHeader>

        {/* Interactive Viewport */}
        <div className="flex justify-center my-2 select-none">
          <div
            className="relative w-[300px] h-[300px] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-border/40 touch-none shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Live rendered canvas */}
            <canvas
              ref={canvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              className="w-full h-full block"
            />

            {/* Circular mask overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
            >
              <defs>
                <mask id="circle-overlay-mask">
                  <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill="white" />
                  <circle
                    cx={VIEWPORT_SIZE / 2}
                    cy={VIEWPORT_SIZE / 2}
                    r={CROP_RADIUS}
                    fill="black"
                  />
                </mask>
              </defs>
              {/* Darkened area outside the circular avatar */}
              <rect
                width={VIEWPORT_SIZE}
                height={VIEWPORT_SIZE}
                fill="rgba(0, 0, 0, 0.58)"
                mask="url(#circle-overlay-mask)"
              />
              {/* Subtle guide ring */}
              <circle
                cx={VIEWPORT_SIZE / 2}
                cy={VIEWPORT_SIZE / 2}
                r={CROP_RADIUS}
                fill="none"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            </svg>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="space-y-3 px-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition"
              aria-label="Disminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(val) => setZoom(val[0])}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons: Rotate & Reset */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-full text-xs gap-1.5 h-8"
            >
              <RotateCw className="w-3.5 h-3.5" /> Rotar 90°
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOffset({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
              }}
              className="rounded-full text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Centrar
            </Button>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-row items-center justify-end gap-2 mt-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-full text-sm h-10 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="rounded-full text-sm h-10 px-5 gap-1.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:opacity-95"
          >
            <Check className="w-4 h-4" /> Aplicar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
