"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Loader2, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StartSessionButtonProps {
  templateId: string;
}

const StartSessionButton = ({ templateId }: StartSessionButtonProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/interview/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error.length > 0
            ? data.error
            : "Failed to create session",
        );
      }

      if (data.sessionId) {
        router.push(`/interview/session/${data.sessionId}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start interview";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStart}
      disabled={loading}
      variant="gradient"
      size="lg"
      className="w-full "
    >
      {loading ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          Initializing…
        </>
      ) : (
        <>
          <PlayCircle className="size-5" />
          Start Interview
        </>
      )}
    </Button>
  );
};
export default StartSessionButton;
