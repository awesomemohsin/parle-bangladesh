"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugUrl, setDebugUrl] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDebugUrl("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to submit request");
        return;
      }

      setMessage(data.message);
      if (data.debug_url) {
        setDebugUrl(data.debug_url);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h1>
        <p className="text-sm text-gray-600 mb-6">Enter your email to receive a password reset link.</p>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !!message}>
            {isLoading ? "Submitting..." : "Send Reset Link"}
          </Button>
        </form>

        {debugUrl && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-xs break-all">
            <span className="font-bold text-yellow-800">Development Mode:</span> <br/>
            Click this link to reset password (since email is not configured):<br />
            <a href={debugUrl} className="text-blue-600 underline font-mono mt-2 inline-block">
              {debugUrl}
            </a>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </Card>
    </div>
  );
}
