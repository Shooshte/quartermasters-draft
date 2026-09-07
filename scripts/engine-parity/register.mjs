// Node 24 strips types; resolve the reference engine's extensionless TS imports.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier, context.parentURL);
    if (!existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(`${url}.ts`))) {
      return nextResolve(`${url}.ts`, context);
    }
  }
  return nextResolve(specifier, context);
}});
