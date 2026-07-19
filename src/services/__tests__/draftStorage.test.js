import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraft, getDraft, removeDraft } from '../draftStorage'

describe('draftStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves drafts via fallback local storage when indexedDB is mocked/absent', async () => {
    const key = 'test_topic_draft_1'
    const value = 'This is a test draft for my throughline'

    await saveDraft(key, value)
    const retrieved = await getDraft(key)
    expect(retrieved).toBe(value)
  })

  it('removes drafts cleanly', async () => {
    const key = 'test_topic_draft_2'
    const value = 'Draft to be deleted'

    await saveDraft(key, value)
    await removeDraft(key)
    const retrieved = await getDraft(key)
    expect(retrieved).toBeNull()
  })
})
