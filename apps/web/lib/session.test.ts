import { describe, expect, it } from 'vitest';

import { getResumeKey, parseResumeKey } from './session';

describe('cross-device resume keys', () => {
  it('round-trips a versioned private resume key', () => {
    const session = {
      id: 'c102a5cd-b19d-4c54-8fa6-167573b4247c',
      resumeToken: 'a'.repeat(64),
    };

    expect(parseResumeKey(getResumeKey(session))).toEqual(session);
  });

  it('rejects malformed or incomplete keys', () => {
    expect(parseResumeKey('c102a5cd-b19d-4c54-8fa6-167573b4247c')).toBeNull();
    expect(parseResumeKey('v1:not-a-uuid:short')).toBeNull();
  });
});
