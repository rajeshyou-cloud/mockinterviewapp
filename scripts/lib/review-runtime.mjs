export function normalizeUsage(usage = {}) {
  const inputTokens = Number(usage.input_tokens ?? usage.promptTokenCount ?? usage.prompt_tokens ?? usage.inputTokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? usage.candidatesTokenCount ?? usage.completion_tokens ?? usage.outputTokens ?? 0);
  const totalTokens = Number(usage.total_tokens ?? usage.totalTokenCount ?? usage.totalTokens ?? inputTokens + outputTokens);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : inputTokens + outputTokens,
  };
}

export function estimateReviewCost(usage, role, env = process.env) {
  const prefix = role === 'critic' ? 'REVIEW_CRITIC' : 'REVIEW_PRIMARY';
  const inputUsdPerMillion = Number(env[`${prefix}_INPUT_USD_PER_MILLION_TOKENS`] ?? 0);
  const outputUsdPerMillion = Number(env[`${prefix}_OUTPUT_USD_PER_MILLION_TOKENS`] ?? 0);
  const estimatedUsd = (usage.inputTokens * inputUsdPerMillion + usage.outputTokens * outputUsdPerMillion) / 1_000_000;
  return {
    currency: 'USD',
    estimatedUsd: Number(estimatedUsd.toFixed(8)),
    ratesConfigured: inputUsdPerMillion > 0 || outputUsdPerMillion > 0,
    inputUsdPerMillion,
    outputUsdPerMillion,
  };
}

export function retryDelayMs(response, attempt, maximumMs = 60_000) {
  const retryAfter = response?.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(maximumMs, Math.max(0, seconds * 1000));
    const timestamp = Date.parse(retryAfter);
    if (Number.isFinite(timestamp)) return Math.min(maximumMs, Math.max(0, timestamp - Date.now()));
  }
  return Math.min(maximumMs, 1_000 * 2 ** attempt);
}

export function shouldRetryStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export function validateCompatibleBaseUrl(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('REVIEW_OPENAI_COMPATIBLE_BASE_URL must use HTTPS (HTTP is allowed only for localhost).');
  }
  return url.toString().replace(/\/$/, '');
}

export function summarizeReviews(reviews) {
  return reviews.reduce((summary, review) => {
    summary.statuses[review.finalStatus] = (summary.statuses[review.finalStatus] ?? 0) + 1;
    summary.usage.inputTokens += review.usage?.inputTokens ?? 0;
    summary.usage.outputTokens += review.usage?.outputTokens ?? 0;
    summary.usage.totalTokens += review.usage?.totalTokens ?? 0;
    summary.cost.estimatedUsd += review.cost?.estimatedUsd ?? 0;
    summary.cost.ratesConfigured ||= Boolean(review.cost?.ratesConfigured);
    return summary;
  }, {
    statuses: {},
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    cost: { currency: 'USD', estimatedUsd: 0, ratesConfigured: false },
  });
}
