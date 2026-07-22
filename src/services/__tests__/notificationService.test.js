import { describe, it, expect, vi } from 'vitest'
import { requestNotificationPermission, isNotificationSupported, sendNativeNotification } from '../notificationService'

describe('notificationService', () => {
  it('detects notification support correctly', () => {
    expect(isNotificationSupported()).toBe(typeof window !== 'undefined' && 'Notification' in window)
  })

  it('requests notification permissions when supported', async () => {
    const originalNotification = globalThis.Notification
    globalThis.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted')
    }

    const granted = await requestNotificationPermission()
    expect(granted).toBe(true)
    expect(globalThis.Notification.requestPermission).toHaveBeenCalled()

    globalThis.Notification = originalNotification
  })

  it('triggers native notification when permission is granted', async () => {
    const showNotificationSpy = vi.fn().mockResolvedValue(true)
    const originalNotification = globalThis.Notification
    
    globalThis.Notification = {
      permission: 'granted',
      requestPermission: vi.fn()
    }

    // Mock navigator serviceWorker ready
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          showNotification: showNotificationSpy
        })
      },
      writable: true,
      configurable: true
    })

    await sendNativeNotification('Test Title', { body: 'Test notification body' })
    expect(showNotificationSpy).toHaveBeenCalledWith(
      'Test Title',
      expect.objectContaining({ body: 'Test notification body' })
    )

    globalThis.Notification = originalNotification
  })
})
