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
   //container.innerHTML = ''; // Clear any existing content

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
      artist.textContent = `Изпълнител: ${file.data.artist}`;
      cardInfo.appendChild(artist);

      const album = document.createElement('p');
      album.textContent = `Албум: ${file.data.album}`;
      cardInfo.appendChild(album);

      const year = document.createElement('p');
      year.textContent = `Времетраене: ${file.data.duration}`;
      cardInfo.appendChild(year);

      // Create div for actions (e.g., play and download buttons)
      const actionsDiv = document.createElement('div');
      actionsDiv.classList.add('actions');

      // Play button
      const playButton = document.createElement('button');
      playButton.textContent = '▶ Слушай';
      playButton.addEventListener('click', () => {
         window.location.href = `audioplayer.html?file=${encodeURIComponent(
            file.path
         )}`;
      });
      actionsDiv.appendChild(playButton);

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
      cardInfo.appendChild(actionsDiv);
      cardWrapper.appendChild(cardInfo);
      container.appendChild(cardWrapper);
   });
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
      fetch(
         `${API_ADDRESS}get_mp3_data?filePath=${encodeURIComponent(audioFile)}`
      )
         .then((response) => {
            if (!response.ok) {
               throw new Error('Failed to fetch MP3 data');
            }
            return response.json();
         })
         .then((data) => {
            console.log(data);
            //TODO: previe on player image and some data if it useful
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

      // Throttle requests to the server
      let lastRequestTime = 0;
      const throttleInterval = 1000; // 1 second

      audioPlayer.ontimeupdate = function () {
         const currentTime = Date.now();

         if (currentTime - lastRequestTime > throttleInterval) {
            // Only send a request if more than 1 second has passed
            console.log('Send request to server now...');
            lastRequestTime = currentTime;
         }
      };
   }
});

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