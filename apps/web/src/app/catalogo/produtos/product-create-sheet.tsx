"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, LoaderCircle, PackagePlus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as WatermelonButton } from "@/components/watermelon-ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { showToast } from "@/components/toast-center";
import { createProductWithImage } from "./actions";

const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maximumImageBytes = 5 * 1024 * 1024;
export function ProductCreateSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function chooseFile(candidate?: File) {
    setError("");
    if (!candidate) return;
    if (!acceptedTypes.has(candidate.type)) {
      setFieldErrors((current) => ({ ...current, image: "Escolha uma imagem PNG, JPG ou WebP." }));
      return;
    }
    if (candidate.size > maximumImageBytes) {
      setFieldErrors((current) => ({ ...current, image: "A imagem precisa ter no máximo 5 MB." }));
      return;
    }
    setFieldErrors((current) => ({ ...current, image: "" }));
    setFile(candidate);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(candidate);
    });
  }

  function onSelect(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const price = String(form.get("price") ?? "").trim();
    const cost = String(form.get("cost") ?? "").trim();
    const validationErrors: Record<string, string> = {};
    if (!file) validationErrors.image = "Adicione uma imagem para o produto.";
    if (name.length < 2) validationErrors.name = "O nome precisa ter pelo menos 2 caracteres.";
    if (!/^\d{1,10}(?:[,.]\d{1,2})?$/.test(price) || /^0+(?:[,.]0{1,2})?$/.test(price)) {
      validationErrors.price = "Informe um preço maior que zero, como 89,90.";
    }
    if (!/^\d{1,10}(?:[,.]\d{1,2})?$/.test(cost)) validationErrors.cost = "Informe um custo válido, como 32,50.";
    if (Object.keys(validationErrors).length) { setFieldErrors(validationErrors); return; }
    if (!file) return;

    setPending(true);
    const productId = crypto.randomUUID();
    form.set("id", productId);
    form.set("image", file);
    const result = await createProductWithImage(form);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    formElement.reset();
    setOpen(false);
    setFile(null);
    setPreview((current) => { if (current) URL.revokeObjectURL(current); return ""; });
    showToast(result.success ?? "Produto cadastrado.");
    setPending(false);
    router.refresh();
  }

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<WatermelonButton size="lg"><PackagePlus aria-hidden="true" />Cadastrar produto</WatermelonButton>} />
      <SheetContent className="product-create-sheet-panel gap-0 overflow-y-auto p-0" aria-label="Cadastrar produto">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-xl">Cadastrar produto</SheetTitle>
          <SheetDescription>Adicione a imagem e os valores para incluir este produto no catálogo.</SheetDescription>
        </SheetHeader>
        <form className="product-create-form flex min-h-0 flex-1 flex-col" onSubmit={submit} noValidate>
          <div className="grid gap-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Imagem do produto <span className="text-destructive">*</span></span>
              {preview ? (
                <div className="product-upload-preview">
                  <Image src={preview} alt="Prévia da imagem do produto" width={64} height={64} unoptimized />
                  <div className="min-w-0 flex-1"><strong>{file?.name}</strong><span>{((file?.size ?? 0) / 1024 / 1024).toFixed(1)} MB</span></div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remover imagem" onClick={() => { setFile(null); setPreview((current) => { if (current) URL.revokeObjectURL(current); return ""; }); }}><Trash2 /></Button>
                </div>
              ) : (
                <div className="product-upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
                  <input ref={fileInput} className="sr-only" type="file" name="image" accept="image/png,image/jpeg,image/webp" onChange={onSelect} aria-label="Escolher imagem do produto" aria-invalid={Boolean(fieldErrors.image)} aria-describedby={fieldErrors.image ? "product-image-error" : undefined} />
                  <span className="product-upload-icon"><UploadCloud aria-hidden="true" /></span>
                  <strong>Arraste uma imagem até aqui</strong>
                  <span>ou escolha um arquivo PNG, JPG ou WebP · até 5 MB</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}><ImagePlus />Escolher imagem</Button>
                </div>
              )}
              {fieldErrors.image ? <span className="product-form-field-error" id="product-image-error">{fieldErrors.image}</span> : null}
            </div>

            <label className="grid gap-2 text-sm font-medium" htmlFor="product-name"><span>Nome do produto <span className="text-destructive">*</span></span>
              <Input id="product-name" name="name" autoFocus required minLength={2} maxLength={160} placeholder="Ex.: Suporte de parede" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "product-name-error" : undefined} />
              {fieldErrors.name ? <span className="product-form-field-error" id="product-name-error">{fieldErrors.name}</span> : null}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium" htmlFor="product-price"><span>Preço de venda <span className="text-destructive">*</span></span>
                <span className="product-money-input"><span>R$</span><Input id="product-price" name="price" inputMode="decimal" placeholder="0,00" required aria-invalid={Boolean(fieldErrors.price)} aria-describedby={fieldErrors.price ? "product-price-error" : undefined} /></span>
                {fieldErrors.price ? <span className="product-form-field-error" id="product-price-error">{fieldErrors.price}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="product-cost"><span>Custo <span className="text-destructive">*</span></span>
                <span className="product-money-input"><span>R$</span><Input id="product-cost" name="cost" inputMode="decimal" placeholder="0,00" required aria-invalid={Boolean(fieldErrors.cost)} aria-describedby={fieldErrors.cost ? "product-cost-error" : undefined} /></span>
                {fieldErrors.cost ? <span className="product-form-field-error" id="product-cost-error">{fieldErrors.cost}</span> : null}
              </label>
            </div>
            {error ? <p role="alert" className="product-form-error">{error}</p> : null}
          </div>
          <SheetFooter className="sticky bottom-0 mt-auto flex-row justify-end border-t bg-popover px-6 py-4">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
            <WatermelonButton type="submit" disabled={pending || !file}>{pending ? <><LoaderCircle className="animate-spin" />Enviando produto</> : "Cadastrar produto"}</WatermelonButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    </>
  );
}
