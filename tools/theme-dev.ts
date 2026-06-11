/** Starts `shopify theme dev` against the store configured in .env (loaded by
 * the npm script via node --env-file) rather than whatever store the CLI has
 * cached. SHOPIFY_FLAG_* are the CLI's documented env equivalents of flags. */
import { spawn } from 'node:child_process';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — copy .env.example to .env and fill it in.`);
  return value;
}

const env: NodeJS.ProcessEnv = {
  ...process.env,
  SHOPIFY_FLAG_STORE: requiredEnv('SHOPIFY_STORE_DOMAIN')
};

// Storefront password — only needed while the store is password-protected.
const storePassword = process.env['SHOPIFY_STORE_PASSWORD'];
if (storePassword) env['SHOPIFY_FLAG_STORE_PASSWORD'] = storePassword;

const child = spawn('shopify', ['theme', 'dev'], { stdio: 'inherit', env });
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
