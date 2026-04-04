import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CosmicBackground } from "@/components/CosmicBackground";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setLocation("/");
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center overflow-hidden relative">
      <CosmicBackground />
      <Card className="w-full max-w-md z-20 bg-black/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-white">
            {isRegister ? "Register" : "Login"}
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            {isRegister
              ? "Create an account to access OBSIDIAN"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Loading..." : isRegister ? "Register" : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isRegister
                ? "Already have an account? Login"
                : "Need an account? Register"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
