import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils';

export function AlertDialog({ children, ...props }) {
  return <AlertDialogPrimitive.Root {...props}>{children}</AlertDialogPrimitive.Root>;
}

export function AlertDialogTrigger(props) {
  return <AlertDialogPrimitive.Trigger {...props} />;
}

export function AlertDialogPortal(props) {
  return <AlertDialogPrimitive.Portal {...props} />;
}

export function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/60', className)}
      {...props}
    />
  );
}

export function AlertDialogContent({ className, ...props }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e5e7eb] bg-white p-6 text-slate-900 shadow-xl dark:border-[#233648] dark:bg-[#1a2632] dark:text-white',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ className, ...props }) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }) {
  return <div className={cn('mt-6 flex justify-end gap-3', className)} {...props} />;
}

export function AlertDialogTitle(props) {
  return <AlertDialogPrimitive.Title className="text-lg font-bold" {...props} />;
}

export function AlertDialogDescription(props) {
  return <AlertDialogPrimitive.Description className="text-sm text-[#637588] dark:text-[#92adc9]" {...props} />;
}

export function AlertDialogCancel({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(
        'rounded-xl border border-[#e5e7eb] px-4 py-2 text-sm font-bold text-[#637588] transition-colors hover:bg-[#f0f2f4] dark:border-[#233648] dark:text-[#92adc9] dark:hover:bg-[#233648]',
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogAction({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Action
      className={cn('rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700', className)}
      {...props}
    />
  );
}
