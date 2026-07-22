/**
 * Browser & OS Native Push Notification Service
 */

/**
 * Request Notification Permission from User
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Check if Notification Permission is granted
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Trigger native OS notification
 * @param {string} title 
 * @param {Object} options 
 */
export async function sendNativeNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        const registration = await navigator.serviceWorker.ready
        registration.showNotification(title, {
          body: options.body || '',
          data: options.url || '/dashboard',
          tag: options.tag || 'throughlines_notification',
          ...options
        })
      } else {
        new Notification(title, {
          body: options.body || '',
          ...options
        })
      }
    } catch (err) {
      console.warn('Native notification execution warning:', err)
    }
  }
}
