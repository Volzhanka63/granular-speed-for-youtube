// Event page. Firefox starts it only for install and update events, then
// unloads it. It opens the welcome page once, on first install, and clears
// keys earlier versions left behind on update.
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') browser.tabs.create({ url: 'welcome.html' });
  // The first-run hint (1.4.0) and a temporary test switch.
  if (reason === 'update') browser.storage.local.remove(['hintDone', 'devVariant']);
});
