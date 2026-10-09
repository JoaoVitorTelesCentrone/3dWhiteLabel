"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/base-ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { updateCustomer, type CustomerFormState } from "./actions";

export type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

const initialState: CustomerFormState = {};

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateCustomer, initialState);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${customer.name}`} title={`Editar ${customer.name}`} />}>
        <Pencil aria-hidden="true" />
      </SheetTrigger>
      <SheetContent className="record-create-sheet gap-0 overflow-y-auto p-0" aria-label={`Editar ${customer.name}`}>
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-xl">Editar cliente</SheetTitle>
          <SheetDescription>Atualize os dados de contato de {customer.name}.</SheetDescription>
        </SheetHeader>
        <div className="record-create-sheet-body">
          <form action={action} className="panel">
            <input type="hidden" name="id" value={customer.id} />
            <label>Nome<input name="name" defaultValue={customer.name} required minLength={2} maxLength={160} /></label>
            <label>Empresa<input name="companyName" defaultValue={customer.company_name ?? ""} maxLength={160} /></label>
            <label>E-mail<input type="email" name="email" defaultValue={customer.email ?? ""} maxLength={254} /></label>
            <label>Telefone<input type="tel" name="phone" defaultValue={customer.phone ?? ""} maxLength={40} /></label>
            <label>Observações<textarea name="notes" defaultValue={customer.notes ?? ""} maxLength={4000} rows={4} /></label>
            {state.error ? <p className="error" role="alert">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
