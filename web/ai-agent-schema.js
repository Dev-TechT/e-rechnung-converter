(function (root, factory) {
  const schema = factory();
  if (typeof module === 'object' && module.exports) module.exports = schema;
  root.XINVOICE_AGENT_FIELD_FILL_SCHEMA = schema;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  return Object.freeze({
    version: '2026-05-18',
    task: 'fill_xrechnung_invoice_fields',
    locale: 'de-DE',
    connectionPolicy: Object.freeze({
      noApiKeyInBrowser: true,
      secretsInFrontend: false,
      allowedModes: Object.freeze(['hermes-copy-paste', 'local-hermes-bridge', 'secure-inbox-outbox']),
      forbiddenModes: Object.freeze(['browser-byok', 'direct-cloud-api-key', 'frontend-bearer-token']),
      localHermesBridge: Object.freeze({
        mode: 'local-hermes-bridge',
        endpoint: 'http://127.0.0.1:<port>',
        secretHandling: 'Hermes/KeePassXC/local secret store only; never GitHub Pages or browser persistence',
      }),
      onlineInboxOutbox: Object.freeze({
        mode: 'secure-inbox-outbox',
        requiredEnvelope: Object.freeze(['jobId', 'nonce', 'expiresAt', 'targetFormat', 'documentKind']),
        candidateTransports: Object.freeze(['imap-smime-pgp', 'webdav-nextcloud-e2e', 'hermes-gateway-authorized-channel', 'webhook-mtls-one-time-link']),
      }),
    }),
    securityRules: Object.freeze([
      'no-api-key-in-browser',
      'no-frontend-secret-persistence',
      'do-not-invent-values',
      'return-only-json',
      'source-required-per-field',
      'confidence-required-per-field',
      'human-review-required',
    ]),
    requestContract: Object.freeze({
      task: 'fill_xrechnung_invoice_fields',
      requiredTopLevelKeys: Object.freeze(['task', 'locale', 'targetFormat', 'documentKind', 'sourceText', 'existingFields', 'requiredFields', 'fieldCatalog', 'rules', 'connectionPolicy']),
    }),
    responseContract: Object.freeze({
      requiredTopLevelKeys: Object.freeze(['ok', 'fields', 'missingRequired', 'warnings', 'cannotDetermine']),
      fieldObjectRequiredKeys: Object.freeze(['value', 'confidence', 'source', 'reviewRequired']),
    }),
  });
});
