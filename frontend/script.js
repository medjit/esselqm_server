//================== General ==================
// If using Cloudflared hosted frontend, set API_ADDRESS to 'https://api.esselqm.com/'
// If using localhost, set API_ADDRESS to '/'
const API_ADDRESS = '/';

document.getElementById('hamburger').addEventListener('click', function () {
   const sidebar = document.getElementById('sidebar');
   sidebar.classList.toggle('show');
});

document.getElementById('theme-toggle').addEventListener('click', function () {
   const body = document.body;
   const currentTheme = body.classList.contains('light-theme')
      ? 'light'
      : 'dark';
   const newTheme = currentTheme === 'light' ? 'dark' : 'light';
   body.classList.remove(`${currentTheme}-theme`);
   body.classList.add(`${newTheme}-theme`);
   localStorage.setItem('theme', newTheme);
});

async function checkAPIStatus() {
   try {
      const response = await fetch(API_ADDRESS);
      if (!response.ok) {
         throw new Error('API not accessible');
      }
   } catch (error) {
      window.location.href = 'technicalservice.html';
   }
}

document.addEventListener('DOMContentLoaded', function () {
   checkAPIStatus();

   if (window.location.pathname.endsWith('lectors.html')) {
      getLectors();
   }

   if (
      window.location.pathname.endsWith('index.html') ||
      window.location.pathname === '/'
   ) {
      getRandom(35);
   }

   if (window.location.pathname.endsWith('audioplayer.html')) {
      getRandom(11);
   }

   if (window.location.pathname.endsWith('books.html')) {
      getBooks();
   }

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
         window.location.href = `audioplayer.html?file=${encodeURIComponent(
            file.path
         )}`;
      });
      actionsDiv.appendChild(playButton);

      cardInfo.appendChild(actionsDiv);
      cardWrapper.appendChild(cardInfo);
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
async function getRandom(amount = 33) {
   try {
      const response = await fetch(`${API_ADDRESS}get_random?amount=${amount}`);
      if (!response.ok) {
         throw new Error('Failed to fetch random data');
      }
      const randomData = await response.json();
      console.log(randomData);
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
      const folderBox = document.createElement('div');
      folderBox.classList.add('folder-box');

      const thumbnail = document.createElement('img');
      thumbnail.src = `data:image/png;base64,${folder.thumbnail}`;
      thumbnail.alt = `${folder.name} thumbnail`;
      folderBox.appendChild(thumbnail);

      const name = document.createElement('h3');
      name.textContent = folder.name;
      folderBox.appendChild(name);

      //const path = document.createElement('a');
      //path.href = folder.path;
      //path.textContent = folder.path;
      //folderBox.appendChild(path);

      const fileCount = document.createElement('p');
      fileCount.textContent = `Файлове: ${folder.fileCount}`;
      folderBox.appendChild(fileCount);

      const size = document.createElement('p');
      size.textContent = `Общ размер: ${formatSize(folder.size)}`;
      folderBox.appendChild(size);

      // Add click event listener to folderBox
      folderBox.addEventListener('click', () => {
         getLecturesForLector(folder.name);
      });

      container.appendChild(folderBox);
   });
}

function formatSize(bytes) {
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes === 0) return '0 Byte';
   const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

async function getLecturesForLector(lectorName) {
   try {
      const response = await fetch(
         `${API_ADDRESS}get_lectures_for?lector=${encodeURIComponent(
            lectorName
         )}`
      );
      if (!response.ok) {
         throw new Error('Failed to fetch lectures');
      }
      const lectures = await response.json();
      console.log(lectures);
      
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = ''; // Clear all content from main-content
      generateFileBoxes(lectures);
   } catch (error) {
      console.error('Error:', error);
   }
}

async function getLectors() {
   try {
      const response = await fetch(`${API_ADDRESS}get_lectors`);
      if (!response.ok) {
         throw new Error('Failed to fetch lectors');
      }
      const lectors = await response.json();
      console.log(lectors);
      generateFolderBoxes(lectors);
   } catch (error) {
      console.error('Error:', error);
   }
}

//================== Books ===================
function generatePDFBoxes(pdfFiles) {
   const container = document.getElementById('main-content');
   //container.innerHTML = ''; // Clear any existing content

   pdfFiles.forEach((pdf) => {
      const pdfBox = document.createElement('div');
      pdfBox.classList.add('pdf-box');

      //const thumbnail = document.createElement('img');
      //if (pdf.data.image) {
      //    thumbnail.src = `data:image/png;base64,${pdf.data.image}`;
      //} else {
      //    thumbnail.src = 'default-thumbnail.png'; // Fallback image if pdf.data.image is not available
      //}
      //thumbnail.alt = `${pdf.title} thumbnail`;
      //pdfBox.appendChild(thumbnail);

      const titleLink = document.createElement('a');
      titleLink.href = pdf.path;
      titleLink.textContent = pdf.name;
      pdfBox.appendChild(titleLink);

      //const author = document.createElement('p');
      //author.textContent = `Author: ${pdf.path}`;
      //pdfBox.appendChild(author);

      container.appendChild(pdfBox);
   });
}

async function getBooks() {
   try {
      const response = await fetch(`${API_ADDRESS}get_books`);
      if (!response.ok) {
         throw new Error('Failed to fetch books');
      }
      const books = await response.json();
      console.log(books);
      generatePDFBoxes(books);
   } catch (error) {
      console.error('Error:', error);
   }
}

//================= Audio Player ================
document.addEventListener('DOMContentLoaded', function () {
   const urlParams = new URLSearchParams(window.location.search);
   const audioFile = urlParams.get('file');

   if (audioFile) {
      fetchAudioData(audioFile)
         .then((data) => {
            updateAudioDetails(data);
            setupDownloadButton(data.name);
            setupShareButton(audioFile);
         })
         .catch((error) => {
            console.error('Error:', error);
         });

      const audioSource = document.querySelector('audio source');
      audioSource.src = audioFile;
      const audioPlayer = document.querySelector('audio');
      audioPlayer.autoplay = true;
      audioPlayer.load();
      audioPlayer.play();
      audioPlayer.controlsList = 'nodownload';

      // Check and resume progress
      checkAndResumeProgress(audioPlayer, audioFile);

      // Save progress on timeupdate
      audioPlayer.addEventListener('timeupdate', () =>
         saveProgress(audioPlayer, audioFile)
      );
   }
});

/**
 * Fetches audio metadata from the server.
 */
async function fetchAudioData(audioFile) {
   const response = await fetch(
      `${API_ADDRESS}get_mp3_data?filePath=${encodeURIComponent(audioFile)}`
   );
   if (!response.ok) {
      throw new Error('Failed to fetch MP3 data');
   }
   return await response.json();
}

/**
 * Updates audio details (thumbnail, title, author, ID) in the DOM.
 */
function updateAudioDetails(data) {
   const audioThumbnail = document.querySelector('.audio-thumbnail');
   audioThumbnail.src = `data:image/png;base64,${data.data.image}`;

   const audioTitle = document.querySelector('.audio-title');
   audioTitle.textContent = data.data.title;

   const audioAuthor = document.querySelector('.audio-author');
   audioAuthor.textContent = data.data.artist;

   const audioId = document.querySelector('.audio-id');
   audioId.textContent = `ID: ${data.name.replace('.mp3', '')}`;
}

/**
 * Sets up the download button functionality.
 */
function setupDownloadButton(fileName) {
   const downloadButton = document.querySelector('.download-button');
   downloadButton.addEventListener('click', () => {
      const fileNameWithoutExtension = fileName.replace('.mp3', '');
      window.location.href = `download_mp3?id=${encodeURIComponent(
         fileNameWithoutExtension
      )}`;
   });
}

/**
 * Sets up the share button functionality.
 */
function setupShareButton(audioFile) {
   const shareButton = document.querySelector('.share-button');
   shareButton.addEventListener('click', async () => {
      const shareUrl = `${window.location.origin}/audioplayer.html?file=${encodeURIComponent(audioFile)}`;

      if (navigator.share) {
         try {
            await navigator.share({
               title: 'Audio Player',
               text: 'Check out this audio file!',
               url: shareUrl,
            });
            console.log('Successful share');
         } catch (error) {
            console.error('Error using share:', error);
            alert('Sharing failed. Please try again.');
         }
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
         try {
            await navigator.clipboard.writeText(shareUrl);
            alert('The share link has been copied to the clipboard!');
         } catch (error) {
            console.error('Error copying link:', error);
            alert('Failed to copy link. Please try again.');
         }
      } else {
         fallbackCopyToClipboard(shareUrl);
      }
   });
}

/**
 * Fallback method to copy share URL manually.
 */
function fallbackCopyToClipboard(shareUrl) {
   const manualCopyPrompt = document.createElement('textarea');
   manualCopyPrompt.value = shareUrl;
   document.body.appendChild(manualCopyPrompt);
   manualCopyPrompt.select();
   manualCopyPrompt.setSelectionRange(0, 99999); // For mobile devices

   try {
      const successful = document.execCommand('copy');
      alert(successful ? 'The share link has been copied to the clipboard!' : 'Failed to copy link. Please copy manually.');
   } catch (error) {
      alert('Copy to clipboard not supported. Please copy manually: ' + shareUrl);
   }
   document.body.removeChild(manualCopyPrompt);
}

/**
 * Checks if progress exists in localStorage and resumes playback.
 */
function checkAndResumeProgress(audioPlayer, audioFile) {
   const savedProgress = localStorage.getItem(`audioProgress_${audioFile}`);

   if (savedProgress) {
      if (savedProgress === "listened") {
         audioPlayer.currentTime = 0;
         console.log('Starting playback from the beginning.');
         return;
      }
      const currentTime = parseFloat(savedProgress);
      if (askToResumeOrRestart(currentTime > 5 ? currentTime - 5 : currentTime)) {
         audioPlayer.currentTime = currentTime > 5 ? currentTime - 5 : currentTime;
         console.log(`Resuming playback from ${audioPlayer.currentTime} seconds.`);
      } else {
         audioPlayer.currentTime = 0;
         console.log('Starting playback from the beginning.');
      }
   }
}

/**
 * Asks the user whether to continue from the saved progress or start from the beginning.
 * Adds a 7-second timer that defaults to "Cancel" if the user doesn't respond.
 */
function askToResumeOrRestart(currentTime) {
   const minutes = Math.floor(currentTime / 60);
   const seconds = Math.floor(currentTime % 60);
   const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
   const message = `Искате ли да продължите от ${formattedTime}?`;
   
   let timer;
   const promise = new Promise((resolve) => {
       timer = setTimeout(() => {
           resolve(false); // Default to "Cancel"
       }, 7000);

       const userResponse = confirm(message);
       clearTimeout(timer);
       resolve(userResponse);
   });

   return promise;
}

/**
 * Saves playback progress to localStorage based on how much of the file is played.
 */
function saveProgress(audioPlayer, audioFile) {
   const duration = audioPlayer.duration;
   const currentTime = audioPlayer.currentTime;

   if (!duration || isNaN(duration)) {
      console.warn("Audio duration is not available yet.");
      return; // Ensure duration is loaded before saving progress
   }

   const progressPercentage = (currentTime / duration) * 100;

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

//================= search ==================
async function search(query) {
   if (query.length < 3) {
      document.getElementById('main-content').innerHTML = '<p>Search query must be at least 3 characters long</p>';
      return;
   }
   try {
      const response = await fetch(`${API_ADDRESS}search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
         throw new Error('Failed to fetch search results');
      }
      const results = await response.json();
      console.log(results);
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = ''; // Clear previous results

      if (results.length > 0) {
         generateFileBoxes(results);
      } else {
         mainContent.innerHTML = '<p>No results found</p>';
      }
   } catch (error) {
      document.getElementById('main-content').innerHTML = '<p>Error fetching search results</p>';
   }
}

document.getElementById('search-button').addEventListener('click', function () {
   const query = document.getElementById('search-field').value;
   search(query);
});

document.getElementById('search-field').addEventListener('keypress', function (e) {
   if (e.key === 'Enter') {
      const query = document.getElementById('search-field').value;
      search(query);
   }
});
