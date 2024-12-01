let scrollInterval;
let clickTimeout;
let scrollCount = 0; // To keep track of the number of scrolls
let maxCycles = 3; // Define the maximum number of cycles before switching to Facebook
let redditPostCount = 0; // Tracks the number of Reddit posts opened
let maxFBScrolls = 0;
let currentFBscroll = 0;

let cycleCount = 0; // Tracks the number of cycles completed
let selectedCategory = null; // Tracks the current category for the 3 cycles
let linkList = [];
let openedTabs = [];
let linksOpenedCount = 0;

// Function to start auto scrolling
function autoScroll() {
  let lastScrollY = 0;

  scrollInterval = setInterval(() => {
    let scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    let scrollStep = 500;

    window.scrollBy(0, scrollStep); // Scroll down by a fixed step
    scrollCount++;
    console.log(`Scroll ${scrollCount}`);

    // Stop scrolling after 5 scrolls
    if (scrollCount >= 5) {
      clearInterval(scrollInterval); // Stop the scrolling interval
      scrollInterval = null;
      scrollCount = 0; // Reset scroll count
      console.log("Auto-scrolling stopped.");
      clickReelDiv();
    }

    // Adjust the scroll height if new content loads dynamically
    if (window.scrollY + window.innerHeight >= scrollHeight || window.scrollY === lastScrollY) {
      lastScrollY = window.scrollY;
      if (window.scrollY + window.innerHeight >= scrollHeight) {
        scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
      }
    }
  }, Math.random() * 2000 + 1000); // Randomized interval between scrolls
}

// Function to stop auto scrolling
function stopScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval); // Clears the scrolling interval
    scrollInterval = null;
    scrollCount = 0; // Reset scroll count
    console.log("Scrolling stopped");
  }
}

// Function to click "Next card" div at random intervals
function clickNextCardDivRandomly() {
  function clickWithRandomInterval() {
    currentFBscroll++;
    const nextCardDiv = document.querySelector('div[aria-label="Next card"]');
    console.log(`current scroll number: ${currentFBscroll} `);
    console.log(`current scroll number: ${maxFBScrolls} `);

    if (currentFBscroll >= maxFBScrolls) {
      chrome.storage.local.set({ startGoogleAgain: true }, () => {
        console.log("Restarting google search");
      });
      // resetCycleState(); // Reset the cycle state once the limit is reached
      goToGoogleAndRestart();
      return;
    }
    if (nextCardDiv) {
      nextCardDiv.click();
      saveVisitedUrl(window.location.href);
      console.log("Next card div clicked");
      const randomInterval = Math.floor(Math.random() * (10 - 5 + 1) + 5) * 1000;
      console.log(`Next click in ${randomInterval / 1000} seconds`);
      clickTimeout = setTimeout(clickWithRandomInterval, randomInterval);
    } else {
      console.log("Next card div not found");
    }
  }
  maxFBScrolls = Math.floor(Math.random() * 20);
  clickWithRandomInterval();

}

function clickReelDiv() {
  console.log("Attempting to find the Reel div...");
  const reelsContainer = document.querySelector('div[aria-label="Reels"]');

  if (reelsContainer) {
    console.log("Reels container found.");
    const reelDiv = reelsContainer.querySelector('a[aria-label="reel"]');
    if (reelDiv) {
      try {
        reelDiv.click();
        saveVisitedUrl(window.location.href);
        console.log("Saved this URL.");
        console.log("Reel div clicked successfully.");
        stopScroll();
        setTimeout(() => {
          console.log("Sending message after delay...");
          clickNextCardDivRandomly();
        }, 5000); // Delay of 5 seconds
      } catch (error) {
        console.error("Error clicking Reel div:", error);
      }
    } else {
      console.error("Reel div not found under Reels container.");
      autoScroll(); // Start scrolling again if reel div is not found
    }
  } else {
    console.error("Reels container not found. Will scroll again.");
    autoScroll();
  }
}

// Function to stop clicking "Next card"
function stopClicking() {
  if (clickTimeout) {
    clearTimeout(clickTimeout);
    console.log("Clicking on Next card stopped");
  }
}

// Debugging helper
function logCycleState() {
  console.log(`Cycle count: ${cycleCount}`);
  console.log(`Selected category: ${selectedCategory}`);
}

// Save cycle state in chrome.storage
async function saveCycleState() {
  return new Promise((resolve) => {
    const stateToSave = { cycleCount };
    if (selectedCategory) {
      stateToSave.selectedCategory = selectedCategory;
    }
    chrome.storage.local.set(stateToSave, () => {
      console.log("Cycle state saved:", stateToSave);
      resolve();
    });
  });
}

// Load cycle state from chrome.storage
async function loadCycleState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["selectedCategory", "cycleCount", "startFacebookScroll"], (data) => {
      selectedCategory = data.selectedCategory || null;
      cycleCount = data.cycleCount || 0;
      console.log("Cycle state loaded:", { selectedCategory, cycleCount });

      // Check if we need to start Facebook scrolling
      if (data.startFacebookScroll) {
        console.log("Facebook scrolling flag detected. Starting Facebook scrolling...");
        chrome.storage.local.remove("startFacebookScroll", () => {
          startFacebookScrolling();
        });
      }
      resolve();
    });
  });
}

function searchReddit() {
  fetchSearchTerm((searchTerm) => {
    const redditSearchTerm = `${searchTerm} reddit`;
    console.log(`Searching on Google with term: ${redditSearchTerm}`);

    const searchBox = document.querySelector('textarea[name="q"]');
    if (searchBox) {
      searchBox.value = redditSearchTerm;
      searchBox.dispatchEvent(new Event('input', { bubbles: true }));
      console.log(`Typed search term: "${redditSearchTerm}"`);

      // Trigger search by submitting the form directly
      const searchForm = searchBox.closest('form');
      if (searchForm) {
        chrome.storage.local.set({ startReddit: true }, () => {
          console.log("Reddit scroll flag set");
          searchForm.submit();
        });

        console.log("Search form submitted directly.");
        setTimeout(() => {
          saveVisitedUrl(window.location.href);
          console.log("Saved this URL.");  
          checkFirstRedditLink(); // Proceed to check the first Reddit link after the search results are loaded
        }, 5000); // Wait for search results to load
      } else {
        console.error("Search form not found for Reddit search.");
      }
    } else {
      console.error("Search box not found for Reddit search.");
    }
  });
}


function checkFirstRedditLink() {
  const firstResult = document.querySelector('.tF2Cxc a');
  if (firstResult && firstResult.href.includes("reddit.com")) {
    const redditUrl = firstResult.href;
    console.log(`First link is a Reddit link: ${redditUrl}`);

    if (redditUrl.match(/reddit\.com\/r\/[^\/]+\/$/)) {
      // It's a subreddit link (e.g., https://www.reddit.com/r/DetectiveConan/)
      console.log("The link is to a subreddit page.");
      chrome.storage.local.set({ redditPage: true }, () => {
        console.log("this is a reddit page link.");
      });

    } else if (redditUrl.match(/reddit\.com\/r\/[^\/]+\/comments\/.+/)) {
      // It's a subreddit post link (e.g., https://www.reddit.com/r/DetectiveConan/comments/1h21xgp/detective_conan_dit_it_before_it_was_a_thing/)
      console.log("The link is to a specific subreddit post.");
      chrome.storage.local.set({ redditPost: true }, () => {
        console.log("this is a reddit post link.");
      });

    } else {
      console.log("The link is not recognized as a subreddit or subreddit post.");
    }

    // Navigate to the Reddit link
    window.location.href = redditUrl;

    // Start scrolling after the Reddit page is loaded
    setTimeout(() => {
      saveVisitedUrl(window.location.href);
      console.log("Saved this URL.");
      startRedditScrolling();
    }, 5000);
  } else {
    console.error("First link is not a Reddit link or no link found.");
  }
}

function cycleRedditPosts() {
  console.log("Starting search and click operation...");

  if (redditPostCount >= 5) {
    console.log("Reached the limit of 5 Reddit posts opened. Stopping the Reddit cycle.");
    resetCycleState(); // Reset the cycle state once the limit is reached
    chrome.storage.local.remove("redditPost", () => {
      console.log("Removed redditPost flag");
    });
    chrome.storage.local.set({ startGoogleAgain: true }, () => {
      console.log("Restarting google search");
    });


    goToGoogleAndRestart();
    return;
  }
  console.log("Not Reached 5 yet.");
  console.log(`Now cycle number ${redditPostCount}.`);

  // Find the target div with slot and data-slug attributes
  const targetDiv = document.querySelector('div[slot="page-1"][data-slug="pdp_right_rail_related"]');

  if (!targetDiv) {
    // console.error("Target div with slot='page-1' and data-slug='pdp_right_rail_related' not found.");
    retryCycle(); // Retry after some delay if target div is not found
    return;
  } else {
    // console.log("Target div found successfully.");
  }

  // Find all <li> elements under the target div
  const liElements = targetDiv.querySelectorAll('ul > li');

  if (liElements.length === 0) {
    console.error("No <li> elements found under the target div.");
    retryCycle(); // Retry after some delay if no <li> elements are found
    return;
  } else {
    console.log(`Found ${liElements.length} <li> elements under the target div.`);
  }

  // Create an array of <a> elements containing post links
  const postLinks = [];

  liElements.forEach((liElement, index) => {
    // Find all <a> elements inside the <li>
    const links = liElement.querySelectorAll('a');
    links.forEach((link) => {
      if (link.href.includes("/comments/")) {
        // console.log(`Adding post link from <li> element #${index + 1}: ${link.href}`);
        postLinks.push(link);
      } else {
        // console.log(`Skipping subreddit link in <li> element #${index + 1}: ${link.href}`);
      }
    });
  });

  if (postLinks.length === 0) {
    console.error("No post links found under the target div.");
    retryCycle(); // Retry after some delay if no post links are found
    return;
  }

  // Choose a random post link from the valid links found
  const randomIndex = Math.floor(Math.random() * postLinks.length);
  const postLink = postLinks[randomIndex];

  if (postLink) {
    console.log(`Clicking on post link: ${postLink.href}`);
    redditPostCount++; // Increment the Reddit post count
    saveVisitedUrl(window.location.href);
    console.log("Saved this URL.");
    postLink.click();

    console.log(`Reddit post count: ${redditPostCount}`);

    // Wait for the new content to load, then start the next cycle if the limit is not reached
    if (redditPostCount < 5) {
      setTimeout(() => {
        cycleRedditPosts();
      }, 10000); // 10-second delay for content to load after clicking the post
    }
    else {
      console.log("Reached the limit of 5 Reddit posts opened. Stopping the Reddit cycle.");
      chrome.storage.local.remove("redditPost", () => {
        console.log("Removed redditPost flag");
      });
      chrome.storage.local.set({ startGoogleAgain: true }, () => {
        console.log("Restarting google search");
      });
      // resetCycleState(); // Reset the cycle state once the limit is reached
      goToGoogleAndRestart();
      return;


    }
  } else {
    console.error("No valid post link found to click.");
    retryCycle(); // Retry if no valid post link is found
  }

  console.log("Search and click operation completed.");
}

// Function to retry the cycle after a delay
function retryCycle() {
  if (redditPostCount >= 5) {
    console.log("Reddit post count limit reached. No retry needed.");
    return;
  }

  console.log("Retrying cycle after a 15-second delay...");
  setTimeout(() => {
    cycleRedditPosts();
  }, 15000); // 15-second delay before retrying
}

// Reset the reddit post count when necessary
function resetCycleState() {
  redditPostCount = 0; // Reset the Reddit post count
  chrome.storage.local.set({ selectedCategory: null, cycleCount: 0 }, () => {
    console.log("Cycle state reset: selectedCategory, cycleCount, and redditPostCount have been set to null/0 respectively.");
  });
}



// Function to fetch a random search term from words.json
function fetchSearchTerm(callback) {
  const jsonURL = chrome.runtime.getURL('scripts/words.json');
  logCycleState();
  fetch(jsonURL)
    .then((response) => response.json())
    .then((data) => {
      if (!selectedCategory) {
        // Select a random category if not already selected
        const categories = Object.keys(data);
        selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        console.log(`Selected category: ${selectedCategory}`);
        chrome.storage.local.set({ selectedCategory }, () => {
          console.log("Selected category saved to storage:", selectedCategory);
        });
      }

      // Pick a random term from the selected category
      const terms = data[selectedCategory];
      const randomIndex = Math.floor(Math.random() * terms.length);
      const searchTerm = terms[randomIndex];
      console.log(`Selected search term: ${searchTerm}`);
      callback(searchTerm);
    })
    .catch((error) => {
      console.error("Error fetching search terms:", error);
    });
}

function searchAndClickRandomLinkByClass() {
  // Find all article elements with the specified class
  const articleElements = document.querySelectorAll('article.w-full.m-0');

  if (articleElements.length === 0) {
    console.error("No article elements found with class 'w-full m-0'.");
    return;
  }

  // Choose a random article element from the list
  const randomIndex = Math.floor(Math.random() * articleElements.length);
  const randomArticle = articleElements[randomIndex];

  // Find a link inside the selected article and click it
  const link = randomArticle.querySelector('a');
  if (link) {
    console.log(`Clicking on link inside random article #${randomIndex + 1}: ${link.href}`);
    chrome.storage.local.set({ redditPost: true }, () => {
      console.log("Setting redditPost to be true.");
    });

    setTimeout(() => { link.click(); }, 2000);
    // setTimeout(() => {cycleRedditPosts();}, 5000);

    // link.click();
  } else {
    console.error("No link found inside the selected article element.");
  }
}


// Function to navigate to Facebook and start scrolling
async function goToFacebookAndScroll() {
  console.log("Navigating to Facebook...");
  await saveCycleState();
  chrome.storage.local.set({ startFacebookScroll: true }, () => {
    window.location.href = "https://www.facebook.com";
  });

}

async function goToFacebookAndScroll() {
  console.log("Navigating to Facebook...");
  await saveCycleState();

  chrome.storage.local.set({ startFacebookScroll: true }, () => {
    console.log("Facebook scroll flag set. Redirecting to Facebook...");
    window.location.href = "https://www.facebook.com";
  });


}

// Function to handle the full cycle of Google searches and transitions
async function startCycleProcess() {
  await loadCycleState();
  if (cycleCount < maxCycles) {
    cycleCount++; // Increment cycle count
    logCycleState();
    await saveCycleState();

    console.log(`Starting cycle ${cycleCount}...`);
    setTimeout(() => {
      searchCelebrity(); // Call searchCelebrity directly to restart the process
    }, 5000);
  } else {
    console.log("Completed 3 cycles. Switching to Reddit...");
    // Randomly decide between calling searchReddit or goToFacebookAndScroll
    let randomChoice = Math.random() < 0.5 ? 'reddit' : 'facebook';

    if (randomChoice === 'reddit') {
      console.log("Randomly chosen: Reddit");
      searchReddit();
    } else {
      console.log("Randomly chosen: Facebook");
      goToFacebookAndScroll();
    }
  }
}



function clearSearchBar() {
  const searchBox = document.querySelector('textarea[name="q"]');
  if (searchBox) {
    searchBox.value = "";
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    console.log("Search bar cleared.");
  } else {
    console.error("Error: Search box not found.");
  }
}

function resetCycleState() {
  chrome.storage.local.set({ selectedCategory: null, cycleCount: 0 }, () => {
    console.log("Cycle state reset: selectedCategory and cycleCount have been set to null and 0 respectively.");
  });
}


// Function to collect search result links
function collectSearchResultLinks() {
  console.log("Collecting search result links...");
  const results = [
    ...document.querySelectorAll('.K7khPe'),
    ...document.querySelectorAll('.MjjYud'),
    ...document.querySelectorAll('.SC7lYd')
  ];
  linkList = Array.from(new Set(results.map(element => {
    const link = element.querySelector('a');
    return link ? link.href : null;
  }).filter(url => url !== null)));
  console.log(`Collected ${linkList.length} unique links.`);
}
function checkSavedLinks() {
  chrome.storage.local.get(['linksVisited'], function(result) {
    console.log("Currently saved links:", result.linksVisited);
  });
}

// Call this function whenever you need to check the saved links
checkSavedLinks();


// Function to open a random link from the list
function openRandomLinkFromList() {
  if (linksOpenedCount < 3 && linkList.length > 0) {
    const randomIndex = Math.floor(Math.random() * linkList.length);
    const selectedLink = linkList[randomIndex];
    console.log(`Opening link: ${selectedLink}`);
    saveVisitedUrl(selectedLink); // Save the link being opened here
    const newTab = window.open(selectedLink, '_blank');
    openedTabs.push(newTab);
    linkList.splice(randomIndex, 1);
    linksOpenedCount++;
    console.log(`Remaining links: ${linkList.length}`);
    if (linksOpenedCount < 3 && linkList.length > 0) {
      setTimeout(openRandomLinkFromList, 10000);
    } else {
      setTimeout(closeOpenedTabs, 10000);
    }
  }
}

// Function to close opened tabs
function closeOpenedTabs() {
  console.log("Closing opened tabs...");
  for (const tab of openedTabs) {
    if (tab) {
      tab.close();
    }
  }
  openedTabs = [];
  linksOpenedCount = 0;
  console.log(`Cycle ${cycleCount} completed.`);
  clearSearchBar(); // Clear the search bar before starting the next cycle
  setTimeout(startCycleProcess, 5000);
}

// Function to restart Google search
function goToGoogleAndRestart() {
  console.log("Navigating back to Google to start the next cycle...");
  setTimeout(() => {
    window.location.href = "https://www.google.com";
    saveVisitedUrl(window.location.href); // Save the Google link here

  }, 5000); // Delay to ensure smooth navigation
  window.addEventListener('load', () => {
    console.log("Google page loaded. Starting next cycle...");
    setTimeout(startCycleProcess, 5000);
  });

}

// Function to manage Google search cycles and open links
function startLinkOpeningProcess() {
  collectSearchResultLinks(); // Collect links from the search results page
  logCycleState();

  if (linkList.length > 0) {
    openRandomLinkFromList(); // Start by opening the first random link
  } else {
    console.error("No links found to open.");
    setTimeout(startCycleProcess, 5000); // Retry starting the cycle if no links found
  }
}

// Function to search celebrity in Google
function searchCelebrity() {
  fetchSearchTerm((searchTerm) => {
    const searchBox = document.querySelector('textarea[name="q"]');
    if (searchBox) {
      console.log("Search box found. Starting to type the search term...");
      searchBox.focus();
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < searchTerm.length) {
          searchBox.value += searchTerm[index];
          searchBox.dispatchEvent(new Event('input', { bubbles: true }));
          console.log(`Typed character: "${searchTerm[index]}"`);
          index++;
        } else {
          clearInterval(typingInterval);
          console.log("Finished typing the search term in the search box.");
          setTimeout(() => {
            const suggestionList = document.querySelectorAll('.sbct.PZPZlf');
            if (suggestionList.length > 0) {
              const randomIndex = Math.floor(Math.random() * Math.min(6, suggestionList.length));
              chrome.storage.local.set({ clickSearchResult: true }, () => {
                console.log("Flag set to click a search result on the next page.");
                saveCycleState();
                logCycleState();
                suggestionList[randomIndex].click();
                console.log(`Clicked on autocomplete suggestion ${randomIndex + 1}.`);
              });
            } else {
              console.error("No autocomplete suggestions found.");
              setTimeout(startCycleProcess, 5000); // Retry cycle if no suggestions found
            }
          }, 5000);
        }
      }, 200);
    } else {
      console.error("Error: Search box not found.");
      setTimeout(startCycleProcess, 5000); // Retry cycle if search box is not found
    }
  });
}

function saveCurrentUrlToChromeStorage() {
  // Get the current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) {
      console.error("No active tab found to save the URL.");
      return;
    }
    
    const currentUrl = tabs[0].url;

    // Retrieve the list of visited URLs from chrome storage
    chrome.storage.local.get("visitedLinks", function (result) {
      let visitedLinks = result.visitedLinks || [];

      // Append the current URL if it doesn't already exist in the list
      if (!visitedLinks.includes(currentUrl)) {
        visitedLinks.push(currentUrl);
        
        // Save the updated list back to chrome storage
        chrome.storage.local.set({ visitedLinks: visitedLinks }, function () {
          console.log(`URL "${currentUrl}" saved to chrome storage.`);
        });
      } else {
        console.log(`URL "${currentUrl}" is already saved in chrome storage.`);
      }
    });
  });
}

let isSavingInProgress = false;

async function saveVisitedUrl(url) {
  // If a saving process is in progress, do nothing until it's finished
  if (isSavingInProgress) {
    console.log("Saving in progress, waiting...");
    return;
  }

  // Fetch the current linksVisited array from chrome.storage.local
  chrome.storage.local.get(["linksVisited"], async (result) => {
    let linksVisited = result.linksVisited || [];

    // Add the new URL to the array
    linksVisited.push(url);

    // Check if the array has reached the limit of 100 URLs
    if (linksVisited.length >= 50) {
      console.log("Limit of 100 URLs reached. Saving to file...");

      // Set saving in progress flag
      isSavingInProgress = true;

      // Pause all other activity to save the URLs to a file
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause for 1 second to ensure saving happens correctly

      // Save the URLs to a file
      await saveUrlsToFile(linksVisited);

      // Clear the linksVisited array in chrome.storage.local
      chrome.storage.local.set({ linksVisited: [] }, () => {
        console.log("linksVisited array cleared in chrome.storage.local.");

        // Reset the saving in progress flag
        isSavingInProgress = false;
      });
    } else {
      // Save the updated linksVisited array back to chrome.storage.local
      chrome.storage.local.set({ linksVisited: linksVisited }, () => {
        console.log(`URL added. Current array length: ${linksVisited.length}`);
      });
    }
  });
}

// Function to save URLs to a file
async function saveUrlsToFile(links) {
  return new Promise((resolve) => {
    // Create a Blob from the array of URLs
    const blob = new Blob([JSON.stringify(links, null, 2)], { type: "application/json" });

    // Create a URL for the Blob and create an anchor element to trigger the download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visited_links_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up after download
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("URLs saved to file and download link removed.");
      resolve(); // Resolve the promise after everything is cleaned up
    }, 100);
  });
}

async function deleteUnnecessaryLinks() {
  const jsonURL = chrome.runtime.getURL('scripts/visited_links.json');
  try {
    const response = await fetch(jsonURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const visitedLinks = await response.json();

    if (chrome.history && chrome.history.search) {
      chrome.history.search({ text: '', maxResults: 1000 }, (items) => {
        resolve(items);
      });
    } else {
      console.error("chrome.history API is not available.");
      reject("chrome.history API is not available.");
    }
    

    const historyItems = await new Promise((resolve, reject) => {
      chrome.history.search({ text: '', maxResults: 1000 }, (items) => {
        resolve(items);
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



// Manage state flags on page load
chrome.storage.local.get(["clickSearchResult", "startSearch", "selectedCategory", "cycleCount", "startFacebookScroll", "startReddit", "redditPage", "redditPost", "startGoogleAgain"], (data) => {
  selectedCategory = data.selectedCategory || null;
  cycleCount = data.cycleCount || 0;
  console.log(`Restored state: { selectedCategory: ${selectedCategory}, cycleCount: ${cycleCount} }`);

  if (data.clickSearchResult) {
    chrome.storage.local.remove("clickSearchResult", () => {
      console.log("clickSearchResult flag detected and removed. Starting link opening process...");
      startLinkOpeningProcess();
    });
  } else if (data.startSearch) {
    chrome.storage.local.remove("startSearch", () => {
      console.log("startSearch flag detected and removed. Running searchCelebrity...");
      searchCelebrity();
    });
  }
  else if (data.startFacebookScroll) {
    console.log("Facebook scrolling flag detected. Starting Facebook scrolling...");
    chrome.storage.local.remove("startFacebookScroll", () => {
      clickReelDiv();
    });
  }
  else if (data.startReddit) {
    console.log("Reddit Term has been searched. Checking for validity now");
    chrome.storage.local.remove("startReddit", () => {
      checkFirstRedditLink();
    });
  }
  else if (data.redditPage) {
    console.log("Reddit Page");
    chrome.storage.local.remove("redditPage", () => {
      searchAndClickRandomLinkByClass();
    });
  }
  else if (data.redditPost) {
    console.log("Reddit Post");
    setTimeout(cycleRedditPosts, 5000);
  }
  else if (data.startGoogleAgain) {
    console.log("Starting Google Again");
    chrome.storage.local.remove(["redditPage", "redditPost", "startGoogleAgain"], () => {
      resetCycleState();
      startCycleProcess();
    });
  }



});




// Listening for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start') {
    console.log("Start action received");
    autoScroll();
  }
  if (request.action === 'stopnextvid') {
    console.log("Stop Next Vid action received");
    stopClicking();
  }
  if (request.action === 'searchCelebrity') {
    console.log("Celebrity search action received");
    chrome.storage.local.set({ cycleCount: 0, selectedCategory: null, redditPage: null, redditPost: null }, () => {
      console.log("Cycle count reset to 0 for new celebrity search.");
    });

    searchCelebrity();
  }
  if (request.action === 'stop') {
    console.log("Stop action received");
    chrome.storage.local.remove("redditPost", () => {
      console.log("Removed redditPost flag");
    });

    resetCycleState();

  }
  if (request.action === 'nextvid') {
    console.log("Next Vid action received");
    chrome.storage.local.set({ redditPost: true }, () => {
      console.log("Setting redditPost to be true.");
    });
  }
  if (request.action === 'deleteHistory') {
    console.log("Deleting History");
    chrome.runtime.sendMessage({ action: 'deleteUnnecessaryLinks' });
  }

  if (request.action === 'activatereel') {
    console.log("Activating Reels");
    clickReelDiv();
  }
});
