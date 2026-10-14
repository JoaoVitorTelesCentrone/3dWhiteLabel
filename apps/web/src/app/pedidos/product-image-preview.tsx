"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductImagePreview({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!imageUrl) return <span className="order-product-image order-product-image--empty" title="Produto sem imagem"><Package aria-hidden="true" /></span>;

  return <>
    <button type="button" className="order-product-image" aria-label={`Ampliar imagem de ${name}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Image src={imageUrl} alt="" width={52} height={52} unoptimized />
    </button>
    <dialog ref={dialogRef} className="order-image-dialog" aria-label={`Imagem de ${name}`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="order-image-dialog-content">
        <div className="order-image-dialog-head"><strong>{name}</strong><Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar imagem" onClick={() => setOpen(false)}><X aria-hidden="true" /></Button></div>
        <Image src={imageUrl} alt={`Imagem de ${name}`} width={900} height={900} unoptimized />
      </div>
    </dialog>
  </>;
}
