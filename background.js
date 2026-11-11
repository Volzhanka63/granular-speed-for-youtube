// Event page. Firefox starts it only for install and update events, then
// unloads it. It opens the welcome page once, on first install.
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') browser.tabs.create({ url: 'welcome.html' });
});
