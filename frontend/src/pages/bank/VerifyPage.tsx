import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiService } from "../../services/api.service";

type VerifyState = "loading" | "success" | "error";

export function VerifyPage() {
  const [searchParms] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successData, setSuccessData] = useState<{ connections: number }>({
    connections: 0,
  });

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParms.get("code");
      if (!code) {
        setErrorMessage("Invalid code");
        setState("error");
        return;
      }
      try {
        const response = await apiService.createBankConnectionCallback({
          code,
        });

        setState("success");
        setSuccessData({
          connections: response.total || response.connections.length,
        });
      } catch (error) {
        console.error(error);
        setState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      }
    };
    handleCallback();
  }, [searchParms]);

  const handleGoToAccounts = () => {
    navigate("/accounts");
  };
  const handleTryAgain = () => {
    navigate("/accounts");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          {state === "loading" && (
            <>
              <div
                className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center
  mb-4"
              >
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <CardTitle>Connecting Your Bank Account</CardTitle>
              <CardDescription>
                Please wait while we verify your bank connection...
              </CardDescription>
            </>
          )}

          {state === "success" && (
            <>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-green-600">
                Connection Successful!
              </CardTitle>
              <CardDescription>
                {successData.connections === 1
                  ? "Your bank account has been connected successfully."
                  : `${successData.connections} bank accounts have been connected successfully.`}
              </CardDescription>
            </>
          )}

          {state === "error" && (
            <>
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Connection Failed</CardTitle>
              <CardDescription>
                We couldn't connect your bank account.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {state === "loading" && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                This may take a few moments...
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                You can now view your connected accounts and start importing
                transactions automatically.
              </p>
              <Button onClick={handleGoToAccounts} className="w-full">
                View My Accounts
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleTryAgain}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button onClick={handleGoToAccounts} className="flex-1">
                  Go to Accounts
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
