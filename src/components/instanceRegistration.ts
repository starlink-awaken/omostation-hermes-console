const SERVICE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const ENDPOINT_PATTERN = /^(https?|wss?|stdio):\/\/[^\s]+$/i;

export function validateInstanceRegistration(service: string, endpoint: string): string | null {
  const normalizedService = service.trim();
  const normalizedEndpoint = endpoint.trim();
  if (!SERVICE_NAME_PATTERN.test(normalizedService)) {
    return '服务名需为 1-64 位字母、数字、下划线、点、冒号或连字符。';
  }
  if (!ENDPOINT_PATTERN.test(normalizedEndpoint)) {
    return 'MCP 地址需使用 http(s)、ws(s) 或 stdio URI。';
  }
  return null;
}
