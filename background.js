chrome.runtime.onInstalled.addListener(() => {
  console.log("WebObfusc8 Extension Installed");
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'deleteUnnecessaryLinks') {
    deleteUnnecessaryLinks();
  }
});

async function deleteUnnecessaryLinks() {
  const jsonURL = chrome.runtime.getURL('scripts/visited_links.json');
  try {
    const response = await fetch(jsonURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const visitedLinks = await response.json();
    const historyItems = await new Promise((resolve, reject) => {
      chrome.history.search({ text: '', maxResults: 1000 }, (items) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(items);
        }
      });
    });

    for (const item of historyItems) {
      if (!visitedLinks.includes(item.url)) {
        chrome.history.deleteUrl({ url: item.url }, () => {
          console.log(`Deleted URL from history: ${item.url}`);
        });
      }
    }
    console.log("Unnecessary links deleted from browser history.");
  } catch (error) {
    console.error("Error deleting unnecessary links:", error);
  }
}
