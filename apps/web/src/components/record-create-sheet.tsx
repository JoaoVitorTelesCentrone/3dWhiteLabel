"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/watermelon-ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type RecordCreateSheetProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const RecordCreateSheetContext = createContext<(() => void) | null>(null);

export function useRecordCreateSheet() {
  return useContext(RecordCreateSheetContext);
}

export function RecordCreateSheet({ title, description, children }: RecordCreateSheetProps) {
  const [open, setOpen] = useState(false);
  const closeSheet = useCallback(() => setOpen(false), []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="lg"><Plus aria-hidden="true" />{title}</Button>} />
      <SheetContent className="record-create-sheet gap-0 overflow-y-auto p-0" aria-label={title}>
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <RecordCreateSheetContext.Provider value={closeSheet}>
          <div className="record-create-sheet-body">{children}</div>
        </RecordCreateSheetContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
