// Event page: Firefox starts it only when the player panel's settings
// button sends a message, and unloads it again when idle.
// Content scripts can't open the settings page themselves.
browser.runtime.onMessage.addListener((msg) => {
  if (msg === 'open-options') browser.runtime.openOptionsPage();
});
