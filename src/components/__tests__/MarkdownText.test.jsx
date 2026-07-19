import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownText from '../MarkdownText'

describe('MarkdownText component', () => {
  it('renders bold and italic inline syntax', () => {
    const html = renderToStaticMarkup(<MarkdownText content="This is **bold** and *italic*." />)
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders inline code blocks', () => {
    const html = renderToStaticMarkup(<MarkdownText content="Use `npm run dev` to start." />)
    expect(html).toContain('<code')
    expect(html).toContain('npm run dev')
  })

  it('renders bullet list items', () => {
    const html = renderToStaticMarkup(<MarkdownText content="- Point A\n- Point B" />)
    expect(html).toContain('<ul')
    expect(html).toContain('Point A')
    expect(html).toContain('Point B')
    expect(html).toContain('<li')
  })
})
