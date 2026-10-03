import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DemoWelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoWelcomeModal({ open, onOpenChange }: DemoWelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to the Live Demo 🎾</DialogTitle>
          <DialogDescription className="space-y-3 pt-4 text-base text-foreground/80">
            <p>
              You are viewing a simulated <strong>Mexicano format</strong> tournament in progress.
            </p>
            <p>
              Watch the scores update automatically to see how the standings shift in real-time, or click around the tabs to explore the interface just like a real player would.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 sm:justify-center">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Explore the demo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}