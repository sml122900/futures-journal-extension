// src/core/auth.js

const Auth = {
  async getToken() {
    const data = await chrome.storage.local.get(Config.STORAGE_KEYS.TOKEN);
    return data[Config.STORAGE_KEYS.TOKEN] || null;
  },

  async setToken(token) {
    await chrome.storage.local.set({ [Config.STORAGE_KEYS.TOKEN]: token });
  },

  async clear() {
    await chrome.storage.local.remove(Config.STORAGE_KEYS.TOKEN);
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  },

  async isEnabled() {
    const data = await chrome.storage.local.get(Config.STORAGE_KEYS.ENABLED);
    const val = data[Config.STORAGE_KEYS.ENABLED];
    return val === undefined ? true : !!val;
  },

  async setEnabled(val) {
    await chrome.storage.local.set({ [Config.STORAGE_KEYS.ENABLED]: !!val });
  },

  async getCustomSentence() {
    const data = await chrome.storage.local.get(Config.STORAGE_KEYS.CUSTOM_SENTENCE);
    return data[Config.STORAGE_KEYS.CUSTOM_SENTENCE] || Config.DEFAULT_SENTENCE;
  },

  async setCustomSentence(sentence) {
    await chrome.storage.local.set({ [Config.STORAGE_KEYS.CUSTOM_SENTENCE]: sentence });
  }
};
