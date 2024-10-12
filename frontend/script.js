
//================== General ==================
// If using Cloudflared hosted frontend, set API_ADDRESS to 'https://api.esselqm.com/'
// If using localhost, set API_ADDRESS to '/'
const API_ADDRESS = '/';

document.getElementById('hamburger').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
});

document.getElementById('theme-toggle').addEventListener('click', function() {
    const body = document.body;
    const currentTheme = body.classList.contains('novel-theme') ? 'novel' : 'storybook';
    const newTheme = currentTheme === 'novel' ? 'storybook' : 'novel';
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

document.addEventListener('DOMContentLoaded', function() {
    checkAPIStatus();

    if (window.location.pathname.endsWith('lectors.html')) {
        getLectors();
    }

    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        getRandom();
    }

    if (window.location.pathname.endsWith('audioplayer.html')) {
        getRandom();
    }

    if (window.location.pathname.endsWith('books.html')) {
        getBooks();
    }
});

function generateFileBoxes(files) {
    const container = document.getElementById('main-content');
    container.innerHTML = ''; // Clear any existing content

    files.forEach(file => {
        const fileBox = document.createElement('div');
        fileBox.classList.add('file-box');

        const thumbnail = document.createElement('img');
        thumbnail.src = `data:image/png;base64,${file.thumbnail}`;
        thumbnail.alt = `${file.name} thumbnail`;
        fileBox.appendChild(thumbnail);

        const name = document.createElement('h3');
        name.textContent = file.name;
        fileBox.appendChild(name);

        const size = document.createElement('p');
        size.textContent = `Size: ${formatSize(file.size)}`;
        fileBox.appendChild(size);

        fileBox.addEventListener('click', () => {
            window.location.href = `audioplayer.html?file=${encodeURIComponent(file.path)}`;
        });

        container.appendChild(fileBox);
    });
}
//==================== Home ===================
async function getRandom() {
    try {
        const response = await fetch(`${API_ADDRESS}get_random`);
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
    container.innerHTML = ''; // Clear any existing content

    folders.forEach(folder => {
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
        fileCount.textContent = `Files: ${folder.fileCount}`;
        folderBox.appendChild(fileCount);

        const size = document.createElement('p');
        size.textContent = `Size: ${formatSize(folder.size)}`;
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
        const response = await fetch(`${API_ADDRESS}get_lectures_for?lector=${encodeURIComponent(lectorName)}`);
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
    container.innerHTML = ''; // Clear any existing content

    pdfFiles.forEach(pdf => {
        const pdfBox = document.createElement('div');
        pdfBox.classList.add('pdf-box');

        const thumbnail = document.createElement('img');
        thumbnail.src = `data:image/png;base64,${pdf.thumbnail}`;
        thumbnail.alt = `${pdf.name} thumbnail`;
        pdfBox.appendChild(thumbnail);

        const name = document.createElement('h3');
        name.textContent = pdf.name;
        pdfBox.appendChild(name);

        const size = document.createElement('p');
        size.textContent = `Size: ${formatSize(pdf.size)}`;
        pdfBox.appendChild(size);

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
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const audioFile = urlParams.get('file');
    if (audioFile) {
        const audioSource = document.querySelector('audio source');
        audioSource.src = audioFile;
        const audioPlayer = document.querySelector('audio');
        audioPlayer.autoplay = true;
        audioPlayer.load();
        audioPlayer.play();

        // Throttle requests to the server
        let lastRequestTime = 0;
        const throttleInterval = 1000; // 1 second

        audioPlayer.ontimeupdate = function() {
            const currentTime = Date.now();

            if (currentTime - lastRequestTime > throttleInterval) {
                // Only send a request if more than 1 second has passed
                console.log("Send request to server now...");
                lastRequestTime = currentTime;
            }
        };
    }
});