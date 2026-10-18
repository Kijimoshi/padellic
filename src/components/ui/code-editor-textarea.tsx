import * as React from "react";
import { cn } from "@/lib/utils";

export interface CodeEditorTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

export const CodeEditorTextarea = React.forwardRef<HTMLTextAreaElement, CodeEditorTextareaProps>(
  ({ className, value, onScroll, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const gutterRef = React.useRef<HTMLDivElement | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    // Split lines by newline
    const lines = React.useMemo(() => {
      return (value ?? "").split("\n");
    }, [value]);

    // Compute line number only for non-empty (trimmed) lines
    const lineNumbers = React.useMemo(() => {
      let count = 0;
      return lines.map((line) => {
        if (line.trim().length > 0) {
          count += 1;
          return count;
        }
        return null;
      });
    }, [lines]);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (gutterRef.current) {
        gutterRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      onScroll?.(e);
    };

    return (
      <div className="relative flex w-full overflow-hidden rounded-md border border-input bg-background/50 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        {/* Code editor line-numbers gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="pointer-events-none select-none overflow-hidden border-r border-border/60 bg-muted/40 py-2 pl-2.5 pr-2 font-mono text-xs text-muted-foreground/60 transition-colors"
        >
          {lineNumbers.map((num, i) => (
            <div
              key={i}
              className="h-5.5 leading-5.5 min-w-7 text-right tabular-nums"
            >
              {num !== null ? num : ""}
            </div>
          ))}
        </div>

        {/* Editor textarea */}
        <textarea
          ref={innerRef}
          value={value}
          onScroll={handleScroll}
          wrap="off"
          className={cn(
            "flex min-h-50 w-full resize-y bg-transparent px-3 py-2 font-mono text-sm leading-5.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

CodeEditorTextarea.displayName = "CodeEditorTextarea";
