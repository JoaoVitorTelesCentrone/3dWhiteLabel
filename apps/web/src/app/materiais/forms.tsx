"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as WatermelonButton } from "@/components/watermelon-ui/button";
import { Button as BaseButton } from "@/components/base-ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { showToast } from "@/components/toast-center";
import { useRecordCreateSheet } from "@/components/record-create-sheet";
import { adjustSpool, createMaterial, receiveSpool, setSpoolAvailable, type StockState } from "./actions";

const initial: StockState = {};

export function MaterialForm() {
  const [state, action, pending] = useActionState(createMaterial, initial);
  const closeSheet = useRecordCreateSheet();
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    closeSheet?.();
    showToast(state.success);
    router.refresh();
  }, [state, closeSheet, router]);

  return <form action={action} className="material-form">
    <label>Nome do material<Input name="name" required minLength={2} maxLength={120} placeholder="Ex.: PLA preto fosco" /></label>
    <div className="material-form-grid">
      <label>Tipo<select name="kind" defaultValue="PLA">{["PLA", "PETG", "ABS", "ASA", "TPU", "resin", "other"].map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
      <label>Cor<Input name="color" maxLength={80} placeholder="Ex.: Preto" /></label>
    </div>
    <label>Custo por kg (R$)<Input name="cost" inputMode="decimal" placeholder="0,00" required /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <WatermelonButton type="submit" disabled={pending}>{pending ? "Cadastrando…" : "Cadastrar material"}</WatermelonButton>
  </form>;
}

export function SpoolForm({ materials }: { materials: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(receiveSpool, initial);
  const closeSheet = useRecordCreateSheet();
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    closeSheet?.();
    showToast(state.success);
    router.refresh();
  }, [state, closeSheet, router]);

  return <form action={action} className="material-form">
    <label>Material<select name="materialId" required defaultValue=""><option value="" disabled>Selecione um material</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label>
    <label>Código da bobina<Input name="code" required maxLength={80} placeholder="Ex.: PLA-PRETO-02" /></label>
    <div className="material-form-grid">
      <label>Peso bruto (g)<Input name="gross" type="number" min={1} max={100000} required placeholder="1000" /></label>
      <label>Tara (g)<Input name="tare" type="number" min={0} max={100000} defaultValue={0} required /></label>
    </div>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <WatermelonButton type="submit" disabled={pending || !materials.length}>{pending ? "Registrando…" : "Receber bobina"}</WatermelonButton>
  </form>;
}

export function SpoolAdjustSheet({ id, code, currentGross }: { id: string; code: string; currentGross: number }) {
  const [state, action, pending] = useActionState(adjustSpool, initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    showToast(state.success);
    router.refresh();
  }, [state, router]);

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant="outline" size="sm" aria-label={`Ajustar peso da bobina ${code}`}><Pencil aria-hidden="true" />Ajustar</Button>} />
    <SheetContent className="material-adjust-sheet gap-0 overflow-y-auto p-0" aria-label={`Ajustar bobina ${code}`}>
      <SheetHeader className="border-b px-6 py-5 pr-14">
        <SheetTitle className="text-xl">Ajustar bobina</SheetTitle>
        <SheetDescription>{code} · informe o novo peso bruto medido. O saldo será atualizado com registro de auditoria.</SheetDescription>
      </SheetHeader>
      <form action={action} className="material-form material-adjust-form">
        <input type="hidden" name="id" value={id} />
        <div className="material-adjust-current"><Scale aria-hidden="true" /><span>Peso bruto atual</span><strong>{currentGross.toLocaleString("pt-BR")} g</strong></div>
        <label>Novo peso bruto (g)<Input name="gross" type="number" min={0} max={100000} defaultValue={currentGross} required /></label>
        <label>Motivo do ajuste<Input name="reason" required minLength={2} maxLength={500} placeholder="Ex.: pesagem após impressão" /></label>
        {state.error ? <p className="error" role="alert">{state.error}</p> : null}
        <SheetFooter className="sticky bottom-0 mt-auto flex-row justify-end border-t bg-popover px-6 py-4">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}><X aria-hidden="true" />Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar ajuste"}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>;
}

export function SpoolAvailableForm({ id, code, availableG }: { id: string; code: string; availableG: number }) {
  const [state, action, pending] = useActionState(setSpoolAvailable, initial);
  const [value, setValue] = useState(String(availableG));
  const router = useRouter();

  useEffect(() => setValue(String(availableG)), [availableG]);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  const unchanged = Number(value) === availableG;
  return <form action={action} className="material-available-form">
    <input type="hidden" name="id" value={id} />
    <label htmlFor={`available-${id}`} className="sr-only">Saldo disponível da bobina {code} em gramas</label>
    <Input id={`available-${id}`} name="available" type="number" min={0} max={100000} step={1}
      value={value} onChange={(event) => setValue(event.target.value)} required aria-label={`Saldo disponível da bobina ${code} em gramas`} />
    <span aria-hidden="true">g</span>
    <BaseButton type="submit" variant="ghost" size="icon-sm" disabled={pending || unchanged || value === ""}
      aria-label={`Salvar saldo da bobina ${code}`} title="Salvar saldo disponível"><Save aria-hidden="true" /></BaseButton>
    {state.error ? <small className="material-available-error" role="alert">{state.error}</small> : null}
  </form>;
}
