import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommandPalette from '../CommandPalette'

describe('CommandPalette', () => {
  const mockTopics = [
    { id: 't1', title: 'Artificial General Intelligence', category: 'Technology' },
    { id: 't2', title: 'Universal Basic Income', category: 'Economics' }
  ]

  const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithRouter(
      <CommandPalette 
        isOpen={false} 
        onClose={vi.fn()} 
        topics={mockTopics}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders search input and topic list when isOpen is true', () => {
    renderWithRouter(
      <CommandPalette 
        isOpen={true} 
        onClose={vi.fn()} 
        topics={mockTopics}
      />
    )

    expect(screen.getByPlaceholderText(/Type a command or search throughlines/i)).toBeDefined()
    expect(screen.getByText('Artificial General Intelligence')).toBeDefined()
    expect(screen.getByText('Universal Basic Income')).toBeDefined()
  })

  it('filters topics by search query', () => {
    renderWithRouter(
      <CommandPalette 
        isOpen={true} 
        onClose={vi.fn()} 
        topics={mockTopics}
      />
    )

    const input = screen.getByPlaceholderText(/Type a command or search throughlines/i)
    fireEvent.change(input, { target: { value: 'Income' } })

    expect(screen.getByText('Universal Basic Income')).toBeDefined()
    expect(screen.queryByText('Artificial General Intelligence')).toBeNull()
  })

  it('invokes onSelectTopic when clicking a topic item', () => {
    const onSelectTopic = vi.fn()
    const onClose = vi.fn()

    renderWithRouter(
      <CommandPalette 
        isOpen={true} 
        onClose={onClose} 
        topics={mockTopics}
        onSelectTopic={onSelectTopic}
      />
    )

    const topicItem = screen.getByText('Artificial General Intelligence')
    fireEvent.click(topicItem)

    expect(onSelectTopic).toHaveBeenCalledWith(mockTopics[0].id)
    expect(onClose).toHaveBeenCalled()
  })

  it('triggers quick action when clicking quick action item', () => {
    const onCreateNewTopic = vi.fn()
    const onClose = vi.fn()

    renderWithRouter(
      <CommandPalette 
        isOpen={true} 
        onClose={onClose} 
        topics={mockTopics}
        onCreateNewTopic={onCreateNewTopic}
      />
    )

    const newTopicAction = screen.getByText(/Start New Throughline/i)
    fireEvent.click(newTopicAction)

    expect(onCreateNewTopic).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()

    renderWithRouter(
      <CommandPalette 
        isOpen={true} 
        onClose={onClose} 
        topics={mockTopics}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

