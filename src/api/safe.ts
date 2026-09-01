/**
 * 数组/对象防御统一工具。
 *
 * 在 API 响应边界处使用这些纯函数，确保后端返回非预期形状时
 * 不会抛出 "Cannot read properties of undefined (reading 'length'/'map')"。
 */

/**
 * 将任意输入收窄为数组。
 * - 数组直接返回
 * - null / undefined / 非数组返回 []
 */
export function asArray<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d;
  return [];
}

/**
 * 将任意输入收窄为对象。
 * - 非 null 对象（且非数组）直接返回
 * - 其他返回 {}
 */
export function asRecord(d: unknown): Record<string, unknown> {
  if (d !== null && typeof d === 'object' && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  return {};
}

/**
 * 判断值是否为非空字符串。
 */
export function isNonEmptyString(d: unknown): d is string {
  return typeof d === 'string' && d.length > 0;
}
