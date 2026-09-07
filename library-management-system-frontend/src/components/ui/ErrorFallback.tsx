import React from "react";
import { AlertTriangle } from "lucide-react";
import { FallbackProps } from "react-error-boundary";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

const ErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try refreshing the page or
            contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {error instanceof Error ? error.message : String(error)}
                {error instanceof Error && error.stack && "\n\n" + error.stack}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} className="flex-1">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorFallback;
