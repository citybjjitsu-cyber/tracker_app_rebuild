import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RetryStateProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function RetryState({ message, onRetry, isRetrying = false, className = '' }: RetryStateProps) {
  return (
    <div role="alert" className={`rounded-xl border border-error/40 bg-error-container/20 p-6 text-center ${className}`}>
      <AlertCircle className="mx-auto mb-3 h-7 w-7 text-error" aria-hidden="true" />
      <p className="text-sm text-on-error-container">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        isLoading={isRetrying}
        className="mt-4"
      >
        {!isRetrying && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
        Retry
      </Button>
    </div>
  );
}
