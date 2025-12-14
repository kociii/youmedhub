<template>
  <div>
    <Message
      v-for="message in messageManager.getMessages().value"
      :key="message.id"
      :type="message.type"
      :title="message.title"
      :message="message.message"
      :duration="message.duration"
      @close="messageManager.remove(message.id)"
    />
  </div>
</template>

<script setup lang="ts">
import Message from './Message.vue'
import { messageManager } from '@/utils/message'
</script>