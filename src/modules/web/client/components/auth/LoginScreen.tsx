import React from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, User, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export function LoginScreen() {
  const [username, setUsername] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [focus, setFocus] = React.useState<"username" | "pin">("username");
  const [storeName, setStoreName] = React.useState("Vanity POS");
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.storeName) setStoreName(data.storeName);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !pin) return;
    setLoading(true);
    setError("");
    const ok = await login(username, pin);
    if (ok) {
      navigate("/pos");
    } else {
      setError("Usuario o PIN incorrectos");
      setPin("");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-mauve/10 flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-mauve" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{storeName}</h1>
        </div>

        {/* Login Card */}
        <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
          <h2 className="text-center text-sm font-semibold text-text-muted mb-6 tracking-wider uppercase">
            Acceso al Sistema
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocus("username")}
                  placeholder="Tu usuario"
                  autoFocus
                  className={`w-full h-11 pl-10 pr-4 rounded-lg bg-bg border text-sm text-text-secondary placeholder:text-text-dim transition-all ${
                    focus === "username"
                      ? "border-mauve/50 ring-1 ring-mauve/20"
                      : "border-bg-active"
                  }`}
                />
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onFocus={() => setFocus("pin")}
                  placeholder="Tu PIN"
                  maxLength={8}
                  className={`w-full h-11 pl-10 pr-4 rounded-lg bg-bg border text-sm text-text-secondary placeholder:text-text-dim transition-all ${
                    focus === "pin"
                      ? "border-mauve/50 ring-1 ring-mauve/20"
                      : error
                      ? "border-red/50"
                      : "border-bg-active"
                  }`}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!username || !pin || loading}
              className="w-full h-11 rounded-lg bg-mauve text-bg font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                <>
                  Acceder
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-dim mt-6">
          Developed by{" "}
          <a
            href="https://soul23.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mauve hover:underline"
          >
            soul23
          </a>
        </p>
      </div>
    </div>
  );
}
