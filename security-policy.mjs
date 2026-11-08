export function securityPolicy(development = false) {
  return ["default-src 'none'", "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data: blob:",
    "worker-src 'self' blob:", development ? "connect-src 'self' ws://127.0.0.1:* ws://localhost:*" : "connect-src 'self'",
    "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
}
