// Register ssl-root-cas so that Node can verify certificates whose
// intermediate CAs are missing from the default bundle (common on older
// university or government sites).
//
// Importing this module for its side-effect is enough – it patches the
// default https.globalAgent once per process. Other modules can also call
// `rootCas.addFile()` at runtime to append additional PEMs if necessary.
//
// Usage (server-side only):
//   import '@/lib/server/setup-ssl-root-cas'
// Or, if you need the rootCas instance:
//   import rootCas from '@/lib/server/setup-ssl-root-cas'

import https from 'https'
import sslRootCas from 'ssl-root-cas'

// Build an extended CA bundle based on Mozilla roots bundled with
// ssl-root-cas. We append to the existing CA set because Next.js / Vercel may
// pre-configure their own certificates.
const rootCas = (sslRootCas as any).create()

https.globalAgent.options.ca = [
  // Keep any CA that was already present (e.g. set by another lib)
  ...(https.globalAgent.options.ca ?? []),
  ...rootCas
]

export default rootCas; 