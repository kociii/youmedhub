export interface MessageItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

class MessageManager {
  private messages = ref<MessageItem[]>([])
  private idCounter = 0

  getMessages() {
    return this.messages
  }

  add(message: Omit<MessageItem, 'id'>): string {
    const id = `msg-${++this.idCounter}-${Date.now()}`
    this.messages.value.push({ ...message, id })
    return id
  }

  remove(id: string) {
    const index = this.messages.value.findIndex(m => m.id === id)
    if (index > -1) {
      this.messages.value.splice(index, 1)
    }
  }

  success(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'success', title, message, duration })
  }

  error(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'error', title, message, duration: duration || 5000 })
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'warning', title, message, duration: duration || 4000 })
  }

  info(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'info', title, message, duration: duration || 3000 })
  }

  clear() {
    this.messages.value = []
  }
}

export const messageManager = new MessageManager()