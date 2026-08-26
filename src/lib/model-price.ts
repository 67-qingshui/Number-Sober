/**
 * 模型单价与 Token 成本计算(纯函数)。
 * 单价单位为美元 / 百万 token。
 */

export interface ModelPrice {
  inputPrice: number;
  outputPrice: number;
  cacheHitPrice: number;
}

export function computeCost(
  inputTokens: number,
  cacheHitTokens: number,
  outputTokens: number,
  price: ModelPrice,
): number {
  const input = (inputTokens / 1_000_000) * price.inputPrice;
  const cache = (cacheHitTokens / 1_000_000) * price.cacheHitPrice;
  const output = (outputTokens / 1_000_000) * price.outputPrice;
  return input + cache + output;
}
