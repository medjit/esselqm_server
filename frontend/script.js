//================== General ==================
// If using Cloudflared hosted frontend, set API_ADDRESS to 'https://api.esselqm.com/'
// If using localhost, set API_ADDRESS to '/'
const API_ADDRESS = '/';

// Add event listener for the hamburger menu click
document.getElementById('hamburger').addEventListener('click', function () {
   // Toggle the 'show' class on the sidebar to show/hide it
   const sidebar = document.getElementById('sidebar');
   sidebar.classList.toggle('show');
});

// Add event listener for the theme toggle button click
document.getElementById('theme-toggle').addEventListener('click', function () {
   const body = document.body;
   // Determine the current theme by checking the class on the body element
   const currentTheme = body.classList.contains('light-theme')
      ? 'light'
      : 'dark';
   // Toggle the theme
   const newTheme = currentTheme === 'light' ? 'dark' : 'light';
   // Remove the current theme class from the body
   body.classList.remove(`${currentTheme}-theme`);
   // Add the new theme class to the body
   body.classList.add(`${newTheme}-theme`);
   // Save the new theme to localStorage
   localStorage.setItem('theme', newTheme);
});

/**
 * Asynchronously checks the status of the API.
 * 
 * This function attempts to fetch data from the API using the provided `API_ADDRESS`.
 * If the API is not accessible (i.e., the response is not ok), it throws an error.
 * In case of an error, the user is redirected to the 'technicalservice.html' page.
 * 
 * @async
 * @function checkAPIStatus
 * @throws Will throw an error if the API is not accessible.
 */
async function checkAPIStatus() {
   try {
      // Attempt to fetch data from the API using the provided API_ADDRESS
      const response = await fetch(API_ADDRESS);
      // If the response is not ok, throw an error
      if (!response.ok) {
         throw new Error('API not accessible');
      }
   } catch (error) {
      // If an error occurs, redirect the user to the 'technicalservice.html' page
      window.location.href = 'technicalservice.html';
   }
}

document.addEventListener('DOMContentLoaded', function () {
   // Check the status of the API when the document is loaded
   checkAPIStatus();

   // If the current page is 'lectors.html', fetch and display lectors
   if (window.location.pathname.endsWith('lectors.html')) {
      getLectors();
   }

   // If the current page is 'index.html' or the root '/', fetch and display random files
   if (
      window.location.pathname.endsWith('index.html') ||
      window.location.pathname === '/'
   ) {
      getRandom(35);
   }

   // If the current page is 'audioplayer.html', fetch and display random files
   if (window.location.pathname.endsWith('audioplayer.html')) {
      getRandom(11);
   }

   // If the current page is 'books.html', fetch and display books
   if (window.location.pathname.endsWith('books.html')) {
      getBooks();
   }

   // Apply the saved theme from localStorage, default to 'light-theme' if not set
   const savedTheme = localStorage.getItem('theme');
   if (savedTheme) {
      document.body.classList.add(`${savedTheme}-theme`);
   } else {
      document.body.classList.add('light-theme');
   }
});

function generateFileBoxes(files) {
   const container = document.getElementById('main-content');
   container.innerHTML = ''; // Clear any existing content

   files.forEach((file) => {
      const cardWrapper = document.createElement('div');
      cardWrapper.classList.add('card-wrapper');
      cardWrapper.id = file.name;

      // Create div for the image
      const imageDiv = document.createElement('div');
      imageDiv.classList.add('image');

      const thumbnail = document.createElement('img');
      if (file.data.image) {
         // If file.data.image is already a base64 string, just use it directly
         thumbnail.src = `data:image/png;base64,${file.data.image}`;
      } else {
         thumbnail.src = 'default-thumbnail.png'; // Fallback image if file.data.image is not available
      }
      thumbnail.alt = `${file.title} thumbnail`;
      imageDiv.appendChild(thumbnail);

      // Append the image div to the card wrapper
      cardWrapper.appendChild(imageDiv);

      // Create div for the card info
      const cardInfo = document.createElement('div');
      cardInfo.classList.add('card-info');

      const title = document.createElement('h3');
      title.textContent = file.data.title;
      cardInfo.appendChild(title);

      const artist = document.createElement('p');
      artist.textContent = file.data.artist;
      cardInfo.appendChild(artist);

      const year = document.createElement('p');
      year.textContent = `Времетраене: ${file.data.duration}`;
      cardInfo.appendChild(year);

      // Create div for actions (e.g., play and download buttons)
      const actionsDiv = document.createElement('div');
      actionsDiv.classList.add('actions');

      // Check if the file is listened or has a time record in localStorage
      const progressKey = `audioProgress_${file.path}`;
      const progressValue = localStorage.getItem(progressKey);

      if (progressValue) {
         const icon = document.createElement('span');
         
         if (progressValue === "listened") {
            // Append the check symbol for "listened"
            icon.textContent = '✔';
            icon.classList.add('check-icon'); // Add class for styling
         } else if (!isNaN(Number(progressValue))) {
            // Append the clock symbol for time record
            icon.textContent = '🕒';
            icon.classList.add('clock-icon'); // Add class for styling
         }
         
         actionsDiv.appendChild(icon);
      }

      // Download button
      const downloadButton = document.createElement('button');
      downloadButton.textContent = '▼ Изтегляне';
      downloadButton.addEventListener('click', () => {
         // Logic for downloading the file
         const fileNameWithoutExtension = file.name.replace('.mp3', '');
         window.location.href = `download_mp3?id=${encodeURIComponent(
            fileNameWithoutExtension
         )}`;
      });
      actionsDiv.appendChild(downloadButton);

      // Play button
      const playButton = document.createElement('button');
      playButton.textContent = '▶ Слушай';
      playButton.addEventListener('click', () => {
         //window.location.href = `audioplayer.html?file=${encodeURIComponent(
         //   file.path
         //)}`;
         init_player(file.name);
      });
      actionsDiv.appendChild(playButton);

      // Append the actions div to the card info div
      cardInfo.appendChild(actionsDiv);
      // Append the card info div to the card wrapper
      cardWrapper.appendChild(cardInfo);
      // Append the card wrapper to the container
      container.appendChild(cardWrapper);
   });

   // Add button with event listener
   const randomButton = document.createElement('button');
   randomButton.textContent = 'Още';
   randomButton.id = 'load-more-btn';
   randomButton.addEventListener('click', () => {
      getRandom(33);
      window.scrollTo({ top: 0, behavior: 'smooth' });
   });
   container.appendChild(randomButton);
}

//==================== Home ===================
//==================== Home ===================
// Function to fetch and display random files
async function getRandom(amount = 33) {
   try {
      // Fetch random data from the API
      const response = await fetch(`${API_ADDRESS}get_random?amount=${amount}`);
      if (!response.ok) {
         throw new Error('Failed to fetch random data');
      }
      // Parse the response as JSON
      const randomData = await response.json();
      console.log(randomData);
      // Generate file boxes using the fetched data
      generateFileBoxes(randomData);
   } catch (error) {
      console.error('Error:', error);
   }
}
//=================== Lectors =================

function generateFolderBoxes(folders) {
   const container = document.getElementById('main-content');
   //container.innerHTML = ''; // Clear any existing content

   folders.forEach((folder) => {
      // Create a div element for each folder
      const folderBox = document.createElement('div');
      folderBox.classList.add('folder-box');

      // Create an img element for the folder thumbnail
      const thumbnail = document.createElement('img');
      thumbnail.src = `data:image/png;base64,${folder.thumbnail}`;
      thumbnail.alt = `${folder.name} thumbnail`;
      folderBox.appendChild(thumbnail);

      // Create an h3 element for the folder name
      const name = document.createElement('h3');
      name.textContent = folder.name;
      folderBox.appendChild(name);

      // Create a p element for the file count
      const fileCount = document.createElement('p');
      fileCount.textContent = `Файлове: ${folder.fileCount}`;
      folderBox.appendChild(fileCount);

      // Create a p element for the folder size
      const size = document.createElement('p');
      size.textContent = `Общ размер: ${formatSize(folder.size)}`;
      folderBox.appendChild(size);

      // Add click event listener to folderBox to fetch and display lectures for the selected folder
      folderBox.addEventListener('click', () => {
         getLecturesForLector(folder.name);
      });

      // Append the folderBox to the container
      container.appendChild(folderBox);
   });
}

/**
 * Formats the given size in bytes to a human-readable string.
 * 
 * This function converts a size in bytes to a more readable format (e.g., KB, MB, GB).
 * It uses logarithms to determine the appropriate unit and rounds the result to 2 decimal places.
 * 
 * @param {number} bytes - The size in bytes to be formatted.
 * @returns {string} The formatted size string.
 */
function formatSize(bytes) {
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; // Array of size units
   if (bytes === 0) return '0 Byte'; // Return '0 Byte' if the size is 0
   const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024))); // Determine the appropriate unit
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]; // Calculate and return the formatted size
}

/**
 * Fetches lectures for a given lector and updates the main content with the fetched lectures.
 *
 * @async
 * @function getLecturesForLector
 * @param {string} lectorName - The name of the lector whose lectures are to be fetched.
 * @throws Will throw an error if the fetch operation fails.
 */
async function getLecturesForLector(lectorName) {
   try {
      // Fetch lectures for the given lector from the API
      const response = await fetch(
         `${API_ADDRESS}get_lectures_for?lector=${encodeURIComponent(
            lectorName
         )}`
      );
      // Check if the response is not ok, throw an error
      if (!response.ok) {
         throw new Error('Failed to fetch lectures');
      }
      // Parse the response as JSON
      const lectures = await response.json();
      console.log(lectures);
      
      // Get the main content container and clear all existing content
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = ''; // Clear all content from main-content
      
      // Generate file boxes using the fetched lectures data
      generateFileBoxes(lectures);
   } catch (error) {
      // Log any errors that occur during the fetch operation
      console.error('Error:', error);
   }
}

/**
 * Fetches the list of lectors from the API and processes the response.
 * 
 * This function makes an asynchronous request to the API endpoint to retrieve
 * the list of lectors. If the request is successful, it logs the lectors to the
 * console and calls the `generateFolderBoxes` function with the lectors data.
 * If the request fails, it logs an error message to the console.
 * 
 * @async
 * @function getLectors
 * @throws {Error} Throws an error if the fetch request fails.
 */
async function getLectors() {
   try {
      // Fetch the list of lectors from the API
      const response = await fetch(`${API_ADDRESS}get_lectors`);
      // Check if the response is not ok, throw an error
      if (!response.ok) {
         throw new Error('Failed to fetch lectors');
      }
      // Parse the response as JSON
      const lectors = await response.json();
      console.log(lectors);
      // Generate folder boxes using the fetched lectors data
      generateFolderBoxes(lectors);
   } catch (error) {
      // Log any errors that occur during the fetch operation
      console.error('Error:', error);
   }
}

//================== Books ===================
function generatePDFBoxes(pdfFiles) {
   const container = document.getElementById('main-content');
   //container.innerHTML = ''; // Clear any existing content

   pdfFiles.forEach((pdf) => {
      // Create a div element for each PDF file
      const pdfBox = document.createElement('div');
      pdfBox.classList.add('pdf-box');

      // Create an anchor element for the PDF title
      const titleLink = document.createElement('a');
      titleLink.href = pdf.path; // Set the href attribute to the PDF path
      titleLink.textContent = pdf.name; // Set the text content to the PDF name
      pdfBox.appendChild(titleLink); // Append the title link to the pdfBox

      // Append the pdfBox to the container
      container.appendChild(pdfBox);
   });
}

/**
 * Fetches a list of books from the API and processes the response.
 * 
 * This function sends a GET request to the API endpoint to retrieve a list of books.
 * If the request is successful, it logs the books to the console and calls the
 * `generatePDFBoxes` function to process the books. If the request fails, it logs
 * an error message to the console.
 * 
 * @async
 * @function getBooks
 * @throws {Error} Throws an error if the fetch request fails.
 */
async function getBooks() {
   try {
      // Fetch the list of books from the API
      const response = await fetch(`${API_ADDRESS}get_books`);
      // Check if the response is not ok, throw an error
      if (!response.ok) {
         throw new Error('Failed to fetch books');
      }
      // Parse the response as JSON
      const books = await response.json();
      console.log(books);
      // Generate PDF boxes using the fetched books data
      generatePDFBoxes(books);
   } catch (error) {
      // Log any errors that occur during the fetch operation
      console.error('Error:', error);
   }
}

//================= search ==================
/**
 * Searches for files based on the provided query.
 * 
 * This function sends a search request to the API with the given query.
 * If the query is less than 3 characters long, it displays a message indicating that the query is too short.
 * If the request is successful, it displays the search results using the generateFileBoxes function.
 * If no results are found, it displays a message indicating that no results were found.
 * If the request fails, it displays an error message.
 * 
 * @async
 * @function search
 * @param {string} query - The search query.
 */
async function search(query) {
   // Check if the query is less than 3 characters long
   if (query.length < 3) {
      // Display a message indicating that the query is too short
      document.getElementById('main-content').innerHTML = '<p>Search query must be at least 3 characters long</p>';
      return;
   }
   try {
      // Send a search request to the API with the given query
      const response = await fetch(`${API_ADDRESS}search?query=${encodeURIComponent(query)}`);
      // Check if the response is not ok, throw an error
      if (!response.ok) {
         throw new Error('Failed to fetch search results');
      }
      // Parse the response as JSON
      const results = await response.json();
      console.log(results);
      // Get the main content container and clear previous results
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = ''; // Clear previous results

      // Check if there are any results
      if (results.length > 0) {
         // Generate file boxes using the search results
         generateFileBoxes(results);
      } else {
         // Display a message indicating that no results were found
         mainContent.innerHTML = '<p>No results found</p>';
      }
   } catch (error) {
      // Display an error message if the request fails
      document.getElementById('main-content').innerHTML = '<p>Error fetching search results</p>';
   }
}

// Add event listener for the search button click
document.getElementById('search-button').addEventListener('click', function () {
   // Get the search query from the search field
   const query = document.getElementById('search-field').value;
   // Call the search function with the query
   search(query);
});

// Add event listener for the search field keypress event
document.getElementById('search-field').addEventListener('keypress', function (e) {
   // Check if the pressed key is 'Enter'
   if (e.key === 'Enter') {
      // Get the search query from the search field
      const query = document.getElementById('search-field').value;
      // Call the search function with the query
      search(query);
   }
});

//================= Alternative Audio Player ================

/**
 * Searches for elements with the 'audio-player' class in the page and logs them to the console.
 * 
 * This function selects all elements with the 'audio-player' class and iterates over them,
 * logging each element to the console.
 */
function findAndCloseAudioPlayers() {
   // Select all elements with the 'audio-player' class
   const cardWrapper = document.querySelectorAll('.audio-player');
   
   // Iterate over the selected elements and log each one to the console
   cardWrapper.forEach((cardWrapper) => {
      console.log(cardWrapper);
      cardWrapper.classList.remove('audio-player');
      cardWrapper.classList.add('card-wrapper');

      const elementsToRemove = cardWrapper.querySelectorAll('.audio-thumbnail, .audio-info, .audio-buttons, audio');
      elementsToRemove.forEach(element => {
         element.remove();
      });

      const elementsToShow = cardWrapper.querySelectorAll('.image, .card-info, .actions');
      elementsToShow.forEach(element => {
         element.style.display = 'flex';
      });
   });
}


async function init_player(audioFile) {
   findAndCloseAudioPlayers();
   let data;
   const cardWrapper = document.getElementById(audioFile);
   if (cardWrapper) {
      cardWrapper.scrollIntoView({ behavior: 'smooth' });
   }
   
   try {
      const response = await fetch(`${API_ADDRESS}get_mp3_data_by_name?filename=${encodeURIComponent(audioFile)}`);
      if (!response.ok) {
         throw new Error('Failed to fetch MP3 data by name');
      }
      data = await response.json();
      console.log(data);
   } catch (error) {
      console.error('Error:', error);
   }

   const elementsToHide = cardWrapper.querySelectorAll('.image, .card-info, .actions');
   elementsToHide.forEach(element => {
      element.style.display = 'none';
   });
   

   const audioThumbnail = document.createElement('img');
   audioThumbnail.src = `data:image/png;base64,${data.data.image}`;
   audioThumbnail.alt = 'Audio Thumbnail';
   audioThumbnail.classList.add('audio-thumbnail');

   const audioInfo = document.createElement('div');
   audioInfo.classList.add('audio-info');

   const audioTitle = document.createElement('h2');
   audioTitle.classList.add('audio-title');
   audioTitle.textContent = data.data.title;

   const audioAuthor = document.createElement('p');
   audioAuthor.classList.add('audio-author');
   audioAuthor.textContent = data.data.artist;

   const audioId = document.createElement('p');
   audioId.classList.add('audio-id');
   audioId.textContent = `ID: ${data.name.replace('.mp3', '')}`;

   audioInfo.appendChild(audioTitle);
   audioInfo.appendChild(audioAuthor);
   audioInfo.appendChild(audioId);

   const audioButtons = document.createElement('div');
   audioButtons.classList.add('audio-buttons');

   const autoplayControl = document.createElement('div');
   autoplayControl.classList.add('autoplay-control');

   const autoplayLabel = document.createElement('label');
   autoplayLabel.setAttribute('for', 'autoplay-checkbox');
   autoplayLabel.textContent = 'Автоматично пускане';

   const autoplayCheckbox = document.createElement('input');
   autoplayCheckbox.type = 'checkbox';
   autoplayCheckbox.id = 'autoplay-checkbox';

   // Check local storage for autoplay checkbox state
   const savedAutoplayState = localStorage.getItem('autoplayCheckboxState');
   if (savedAutoplayState !== null) {
      autoplayCheckbox.checked = JSON.parse(savedAutoplayState);
   } else {
      autoplayCheckbox.checked = true; // Default to checked if no state is saved
   }

   // Save the autoplay checkbox state to local storage when changed
   autoplayCheckbox.addEventListener('change', () => {
      localStorage.setItem('autoplayCheckboxState', JSON.stringify(autoplayCheckbox.checked));
   });

   autoplayControl.appendChild(autoplayLabel);
   autoplayControl.appendChild(autoplayCheckbox);

   const downloadButton = document.createElement('button');
   downloadButton.classList.add('download-button');
   downloadButton.textContent = '▼ Изтегляне';

   const shareButton = document.createElement('button');
   shareButton.classList.add('share-button');
   shareButton.textContent = '🔗 Споделяне';

   audioButtons.appendChild(autoplayControl);
   audioButtons.appendChild(downloadButton);
   audioButtons.appendChild(shareButton);

   const audioFile1 = data.path;

   const audioPlayer = document.createElement('audio');
   audioPlayer.controls = true;
   audioPlayer.controlsList = 'nodownload'; // Disable download option in controls

   const audioSource = document.createElement('source');
   audioSource.src = audioFile1;
   audioSource.type = 'audio/mpeg';

   audioPlayer.appendChild(audioSource);
   audioPlayer.autoplay = true;
   audioPlayer.load();
   audioPlayer.play();

   cardWrapper.appendChild(audioThumbnail);
   cardWrapper.appendChild(audioInfo);
   cardWrapper.appendChild(audioButtons);
   cardWrapper.appendChild(audioPlayer);
   cardWrapper.classList.remove('card-wrapper');
   cardWrapper.classList.add('audio-player');

   setupDownloadButton(data.name);
   setupShareButton(audioFile1);
   checkAndResumeProgress(audioPlayer, audioFile1);

   audioPlayer.addEventListener('timeupdate', () => saveProgress(audioPlayer, audioFile1));
   audioPlayer.addEventListener('ended', playNext);
}



/**
 * Sets up the download button functionality.
 * 
 * This function adds an event listener to the download button. When the button is clicked,
 * it triggers the download of the specified audio file by navigating to the download URL.
 * 
 * @param {string} fileName - The name of the audio file to be downloaded.
 */
function setupDownloadButton(fileName) {
   // Select the download button element
   const downloadButton = document.querySelector('.download-button');
   
   // Add click event listener to the download button
   downloadButton.addEventListener('click', () => {
      // Remove the '.mp3' extension from the file name
      const fileNameWithoutExtension = fileName.replace('.mp3', '');
      window.location.href = `download_mp3?id=${encodeURIComponent(
         fileNameWithoutExtension
      )}`;
   });
}

/**
 * Fallback method to copy the share URL to the clipboard manually.
 * 
 * This function creates a temporary textarea element, sets its value to the share URL,
 * and appends it to the document body. It then selects the text and attempts to copy it
 * using the `execCommand('copy')` method. If successful, it shows an alert indicating
 * that the link has been copied. If not, it shows an alert with instructions to copy manually.
 * Finally, it removes the temporary textarea element from the document body.
 * 
 * @param {string} shareUrl - The URL to be copied to the clipboard.
 */
function fallbackCopyToClipboard(shareUrl) {
   // Create a temporary textarea element
   const manualCopyPrompt = document.createElement('textarea');
   // Set the value of the textarea to the share URL
   manualCopyPrompt.value = shareUrl;
   // Append the textarea to the document body
   document.body.appendChild(manualCopyPrompt);
   // Select the text inside the textarea
   manualCopyPrompt.select();
   manualCopyPrompt.setSelectionRange(0, 99999); // For mobile devices

   try {
      // Attempt to copy the selected text to the clipboard
      const successful = document.execCommand('copy');
      // Show an alert indicating whether the copy was successful or not
      alert(successful ? 'The share link has been copied to the clipboard!' : 'Failed to copy link. Please copy manually.');
   } catch (error) {
      // Show an alert with instructions to copy manually if the copy fails
      alert('Copy to clipboard not supported. Please copy manually: ' + shareUrl);
   }
   // Remove the temporary textarea element from the document body
   document.body.removeChild(manualCopyPrompt);
}

/**
 * Sets up the share button functionality for an audio file.
 * 
 * This function adds a click event listener to the share button. When the button is clicked,
 * it attempts to share the audio file URL using the Web Share API if available. If the Web Share API
 * is not available, it falls back to copying the URL to the clipboard.
 * 
 * @param {string} audioFile - The name or path of the audio file to be shared.
 */
function setupShareButton(audioFile) {
   // Select the share button element
   const shareButton = document.querySelector('.share-button');
   
   // Add click event listener to the share button
   shareButton.addEventListener('click', async () => {
      // Construct the share URL using the current origin and audio file path
      const shareUrl = `${window.location.origin}/audioplayer.html?file=${encodeURIComponent(audioFile)}`;

      // Check if the Web Share API is available
      if (navigator.share) {
         try {
            // Use the Web Share API to share the URL
            await navigator.share({
               title: 'Esselqm',
               text: 'Чуйте това:',
               url: shareUrl,
            });
            console.log('Successful share');
         } catch (error) {
            // Handle any errors that occur during sharing
            console.error('Error using share:', error);
            alert('Sharing failed. Please try again.');
         }
      } 
      // Check if the Clipboard API is available
      else if (navigator.clipboard && navigator.clipboard.writeText) {
         try {
            // Copy the share URL to the clipboard
            await navigator.clipboard.writeText(shareUrl);
            alert('Линкът за споделяне е копиран в клипборда!');
         } catch (error) {
            // Handle any errors that occur during copying
            console.error('Error copying link:', error);
            alert('Failed to copy link. Please try again.');
         }
      } 
      // Fallback method to manually copy the share URL
      else {
         fallbackCopyToClipboard(shareUrl);
      }
   });
}

/**
 * Checks and resumes playback progress from localStorage.
 * 
 * This function retrieves the saved playback progress for the specified audio file from localStorage.
 * If progress is found, it resumes playback from the saved position, adjusting slightly for a smooth transition.
 * If the file was marked as 'listened', it starts playback from the beginning.
 * 
 * @param {HTMLAudioElement} audioPlayer - The audio player element.
 * @param {string} audioFile - The path to the audio file.
 */
function checkAndResumeProgress(audioPlayer, audioFile) {
   // Retrieve the saved progress from localStorage
   const savedProgress = localStorage.getItem(`audioProgress_${audioFile}`);

   // If there is saved progress
   if (savedProgress) {
      // If the file was marked as 'listened', start playback from the beginning
      if (savedProgress === "listened") {
         audioPlayer.currentTime = 0;
         console.log('Starting playback from the beginning.');
         return;
      }
      // Parse the saved progress as a float
      const currentTime = parseFloat(savedProgress);
      // Resume playback from the saved position, adjusting slightly for a smooth transition
      audioPlayer.currentTime = currentTime > 5 ? currentTime - 5 : currentTime;
      console.log(`Resuming playback from ${audioPlayer.currentTime} seconds.`);
   }
}

/**
 * Saves the playback progress of the audio file to localStorage.
 * 
 * This function calculates the progress percentage of the audio file being played.
 * Depending on the progress percentage, it either removes the progress from localStorage,
 * marks the file as 'listened', or saves the current progress time.
 * 
 * @param {HTMLAudioElement} audioPlayer - The audio player element.
 * @param {string} audioFile - The path to the audio file.
 */
function saveProgress(audioPlayer, audioFile) {
   const duration = audioPlayer.duration; // Get the total duration of the audio file
   const currentTime = audioPlayer.currentTime; // Get the current playback time

   // Check if the duration is available and is a valid number
   if (!duration || isNaN(duration)) {
      console.warn("Audio duration is not available yet.");
      return; // Ensure duration is loaded before saving progress
   }

   // Calculate the progress percentage
   const progressPercentage = (currentTime / duration) * 100;

   // If less than 5% of the file is listened, do not save progress
   if (progressPercentage < 5) {
      // Less than 5% listened, do not save progress
      localStorage.removeItem(`audioProgress_${audioFile}`);
      console.log("Progress not saved. Listened less than 5% of the file.");
   } else if (progressPercentage >= 95) {
      // More than 95% listened, mark as 'listened'
      localStorage.setItem(`audioProgress_${audioFile}`, "listened");
      console.log("File marked as 'listened'.");
   } else {
      // Between 5% and 95%, save the current progress
      localStorage.setItem(`audioProgress_${audioFile}`, currentTime);
      console.log(`Progress saved at ${currentTime} seconds (${Math.round(progressPercentage)}%).`);
   }
}

   /**
    * Plays the next audio file after a delay if the autoplay checkbox is checked.
    * 
    * This function waits for 7 seconds before checking the state of the autoplay checkbox.
    * If the checkbox is checked, it retrieves the current audio file number from the URL,
    * increments it to get the next file number, and then navigates to the next audio file.
    * 
    * @function
    */
   //TODO: fix this function to shrink current player and play nex in the list.
   function playNext() {
      // Wait for 7 seconds before checking the autoplay setting
      setTimeout(() => {
         // Get the autoplay checkbox element
         const autoplayCheckbox = document.getElementById('autoplay-checkbox');
         // If the autoplay checkbox is checked
         if (autoplayCheckbox.checked) {
            // Get the current audio file from the URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const currentFile = urlParams.get('file');
            // Extract the current file number from the file name
            const currentFileNumber = parseInt(currentFile.match(/\d+/)[0], 10);
            // Increment the file number to get the next file number
            const nextFileNumber = currentFileNumber + 1;
            // Replace the current file number with the next file number in the file name
            const nextAudioFile = currentFile.replace(currentFileNumber, nextFileNumber);
            // If the next audio file exists, navigate to the next audio file
            if (nextAudioFile) {
               window.location.href = `audioplayer.html?file=${encodeURIComponent(nextAudioFile)}`;
            } else {
               console.log('No next audio file found.');
            }
         }
      }, 7000);
   }