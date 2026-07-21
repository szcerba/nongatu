export const environment = {
  production: true,
  groqApiKey: (window as any).env?.groqApiKey || ''
};
