import React from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, User, Lock, ArrowRight, AlertCircle, Shield } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export function SetupScreen() {
  const [username, setUsername] = React.useState("admin");
  const [name, setName] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [focus, setFocus] = React.useState<"username" | "name" | "pin" | "confirm">("name");
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !name || !pin || !confirmPin) return;

    if (pin !== confirmPin) {
      setError("Los PINs no coinciden");
      return;
    }
    if (pin.length < 4) {
      setError("El PIN debe tener al menos 4 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear usuario");
        setLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      useAuthStore.setState({
        isAuthenticated: true,
        user: data.user,
        token: data.token,
      });
      navigate("/pos");
    } catch {
      setError("Error de conexion");
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
          <h1 className="text-2xl font-bold text-text-primary">Vanity POS</h1>
          <p className="text-sm text-text-muted mt-1">Configuracion inicial del sistema</p>
        </div>

        {/* Setup Card */}
        <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
          <div className="flex items-center gap-2 justify-center mb-6">
            <Shield className="w-4 h-4 text-mauve" />
            <h2 className="text-sm font-semibold text-text-muted tracking-wider uppercase">
              Crear Usuario Administrador
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocus("name")}
                  placeholder="Tu nombre"
                  autoFocus
                  className={`w-full h-11 pl-10 pr-4 rounded-lg bg-bg border text-sm text-text-secondary placeholder:text-text-dim transition-all ${
                    focus === "name"
                      ? "border-mauve/50 ring-1 ring-mauve/20"
                      : "border-bg-active"
                  }`}
                />
              </div>
            </div>

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
                  placeholder="admin"
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
                PIN (minimo 4 caracteres)
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
                      : "border-bg-active"
                  }`}
                />
              </div>
            </div>

            {/* Confirm PIN */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Confirmar PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  onFocus={() => setFocus("confirm")}
                  placeholder="Repite tu PIN"
                  maxLength={8}
                  className={`w-full h-11 pl-10 pr-4 rounded-lg bg-bg border text-sm text-text-secondary placeholder:text-text-dim transition-all ${
                    focus === "confirm"
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
              disabled={!username || !name || !pin || !confirmPin || loading}
              className="w-full h-11 rounded-lg bg-mauve text-bg font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                <>
                  Crear Usuario y Continuar
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
