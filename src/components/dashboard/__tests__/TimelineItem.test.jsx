import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TimelineItem from '../TimelineItem'

describe('TimelineItem', () => {
  const mockEntryPrivate = {
    id: 'entry_101',
    content: 'Exploring vector search algorithms in PostgreSQL',
    confidence_rating: 80,
    entry_date: '2026-05-15T12:00:00Z',
    public_posts: []
  }

  const mockEntryPublic = {
    id: 'entry_102',
    content: 'Public announcement on ThroughLines release',
    confidence_rating: 95,
    entry_date: '2026-06-01T12:00:00Z',
    public_posts: [{ moderation_status: 'approved' }]
  }

  it('renders private entry card correctly and triggers onPublish', () => {
    const onPublish = vi.fn()
    const onUnpublish = vi.fn()

    render(
      <TimelineItem 
        entry={mockEntryPrivate}
        isSelected={false}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />
    )

    expect(screen.getByText(/Exploring vector search/i)).toBeDefined()
    const publishBtn = screen.getByRole('button', { name: /Publish this entry/i })
    fireEvent.click(publishBtn)
    expect(onPublish).toHaveBeenCalledWith(mockEntryPrivate)
  })

  it('renders public entry card correctly and triggers onUnpublish', () => {
    const onPublish = vi.fn()
    const onUnpublish = vi.fn()

    render(
      <TimelineItem 
        entry={mockEntryPublic}
        isSelected={true}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />
    )

    expect(screen.getByText(/Public announcement/i)).toBeDefined()
    const unpublishBtn = screen.getByRole('button', { name: /Make private/i })
    fireEvent.click(unpublishBtn)
    expect(onUnpublish).toHaveBeenCalledWith(mockEntryPublic)
  })

  it('enters inline edit mode and triggers onUpdate callback', async () => {
    const onUpdate = vi.fn().mockResolvedValue(true)

    render(
      <TimelineItem 
        entry={mockEntryPrivate}
        isSelected={false}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onUpdate={onUpdate}
      />
    )

    const editBtn = screen.getByRole('button', { name: /Edit/i })
    fireEvent.click(editBtn)

    const textarea = screen.getByRole('textbox')
    expect(textarea.value).toBe(mockEntryPrivate.content)

    fireEvent.change(textarea, { target: { value: 'Updated vector search reflections' } })
    const saveBtn = screen.getByRole('button', { name: /Save/i })
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    expect(onUpdate).toHaveBeenCalledWith('entry_101', 'Updated vector search reflections', 80)
  })
})
