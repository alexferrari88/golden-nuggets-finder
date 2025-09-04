/**
 * Finds and clicks all "Show more" buttons on a Twitter/X thread page,
 * but only for the tweets written by the original author of the thread.
 * This helps to fully expand a thread for easier reading without leaving the page.
 */
function expandAuthorTweets() {
  console.log("Starting to expand author's tweets...");

  // 1. Find the first tweet on the page to identify the Original Poster (OP).
  // We assume the first <article> in the main timeline is the start of the thread.
  const firstTweet = document.querySelector('article[data-testid="tweet"]');
  if (!firstTweet) {
    console.error("Error: Could not find any tweets on the page. Please make sure you are on a thread page.");
    return;
  }

  // 2. Extract the author's unique profile link (href) from the first tweet.
  // This is a reliable way to identify the author throughout the thread.
  // e.g., href="/elonmusk"
  const authorProfileLinkElement = firstTweet.querySelector('div[data-testid="User-Name"] a[href^="/"]');
  if (!authorProfileLinkElement) {
    console.error("Error: Could not identify the original author of the thread.");
    return;
  }
  const authorHref = authorProfileLinkElement.getAttribute('href');
  console.log(`Original author identified: ${authorHref}`);

  let clickCount = 0;

  // 3. Find all tweets currently loaded on the page.
  const allTweets = document.querySelectorAll('article[data-testid="tweet"]');
  console.log(`Found ${allTweets.length} tweets to check.`);

  // 4. Iterate over each tweet to check if it's by the OP and has a "Show more" button.
  allTweets.forEach((tweet, index) => {
    // 5. For each tweet, find its author's profile link.
    const currentAuthorLinkElement = tweet.querySelector('div[data-testid="User-Name"] a[href^="/"]');
    
    // Ensure the element exists before trying to get its attribute
    if (currentAuthorLinkElement) {
      const currentAuthorHref = currentAuthorLinkElement.getAttribute('href');

      // 6. Compare the current tweet's author with the OP.
      if (currentAuthorHref === authorHref) {
        // 7. If it's the OP's tweet, find the "Show more" button inside it.
        // This specific button expands truncated tweet text.
        const showMoreButton = tweet.querySelector('button[data-testid="tweet-text-show-more-link"]');
        
        if (showMoreButton) {
          console.log(`Found a "Show more" button in a tweet by ${authorHref}. Clicking...`);
          showMoreButton.click();
          clickCount++;
        }
      }
    }
  });

  if (clickCount > 0) {
    console.log(`✅ Success! Clicked ${clickCount} "Show more" button(s).`);
  } else {
    console.log("ℹ️ No expandable tweets by the original author were found. The thread might already be fully expanded.");
  }
}

// Execute the function
expandAuthorTweets();