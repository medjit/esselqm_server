console.log("Server is starting...");

const express = require("express");
const serveIndex = require("serve-index");
const path = require("path");
const os = require("os");
const fs = require("fs");
const id3 = require('node-id3');
const mp3Duration = require('mp3-duration');

const app = express();
const PORT = 3333;

const server = app.listen(PORT, listening);

function listening() {
  console.log(`Server is running at http://localhost:${PORT}`);
}

// Serve static files and directory listings for /data
app.use('/media_files', express.static(path.join(__dirname, 'media_files')));
app.use('/media_files', serveIndex(path.join(__dirname, 'media_files'), { 'icons': true }));

// Serve index page from the data directory at the root URL
app.use(express.static(path.join(__dirname, 'frontend')));

//=============================== EsSelqm new frontend functions =================================

/**
 * Template for an MP3 file object.
 * 
 * @typedef {Object} Mp3FileTemplate
 * @property {string} name - The name of the MP3 file.
 * @property {string} path - The file path of the MP3 file.
 * @property {Object} data - Metadata of the MP3 file.
 * @property {string|null} data.album - The album name.
 * @property {string|null} data.artist - The artist name.
 * @property {string|null} data.comment - Any comments.
 * @property {string|null} data.partOfSet - Part of a set information.
 * @property {string|null} data.genre - The genre of the music.
 * @property {string|null} data.title - The title of the track.
 * @property {string|null} data.trackNumber - The track number.
 * @property {string|null} data.year - The release year.
 * @property {string|null} data.image - The album cover image.
 * @property {string} data.duration - The duration of the track.
 * @property {string} timestamp - The timestamp of when the file was created or modified.
 */
const mp3FileTemplate = {
    name: '',
    path: '',
    data: {
        album: null,
        artist: null,
        comment: null,
        partOfSet: null,
        genre: null,
        title: null,
        trackNumber: null,
        year: null,
        image: null,
        duration: ''
    },
    timestamp: ''
};

/**
 * An array to store data for every scanned mp3 file.
 * @type {Array}
 */
let allMp3FilesData = [];

/**
 * Indicates whether a scanning process is currently in progress.
 * @type {boolean}
 */
let isScanning = false;

/**
 * @type {number}
 * @description Tracks the count of already scanned files.
 */
let count = 0;


/**
 * Calculates the duration of an MP3 file and returns it as a formatted string.
 *
 * @param {string} filePath - The path to the MP3 file.
 * @returns {Promise<string>} A promise that resolves to the duration of the MP3 file in the format "MM:SS".
 * @throws {Error} If there is an error reading the MP3 file.
 */
function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        mp3Duration(filePath, (err, duration) => {
            if (err) {
                return reject(err);
            }

            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            resolve(durationString);
        });
    });
}

/**
 * Retrieves metadata from an MP3 file.
 *
 * @param {string} filePath - The path to the MP3 file.
 * @returns {Promise<Object>} A promise that resolves to an object containing the MP3 metadata.
 * @property {string} name - The name of the MP3 file.
 * @property {string} path - The relative path of the MP3 file.
 * @property {Object} data - The metadata of the MP3 file.
 * @property {string|null} data.album - The album name.
 * @property {string|null} data.artist - The artist name.
 * @property {string|null} data.comment - Any comments.
 * @property {string|null} data.partOfSet - The part of set information.
 * @property {string|null} data.genre - The genre of the music.
 * @property {string|null} data.title - The title of the track.
 * @property {string|null} data.trackNumber - The track number.
 * @property {string|null} data.year - The year of release.
 * @property {string|null} data.image - The album cover image in base64 format.
 * @property {string} data.duration - The duration of the track.
 * @property {string} timestamp - The timestamp when the metadata was retrieved.
 */
function getMp3Data(filePath) {
    return new Promise((resolve, reject) => {
        id3.read(filePath, async (err, tags) => {
            if (err) {
                return reject(err);
            }

            try {
                const durationString = await getDuration(filePath);

                const mp3Data = {
                    ...mp3FileTemplate,
                    name: path.basename(filePath),
                    path: filePath.replace(__dirname, '').replace(/\\/g, '/'),
                    data: {
                        album: tags.album || null,
                        artist: tags.artist || null,
                        comment: tags.comment || null,
                        partOfSet: tags.partOfSet || null,
                        genre: tags.genre || null,
                        title: tags.title || null,
                        trackNumber: tags.trackNumber || null,
                        year: tags.year || null,
                        image: tags.image ? tags.image.imageBuffer.toString('base64') : null,
                        duration: durationString
                    },
                    timestamp: new Date().toISOString()
                };

                resolve(mp3Data);
            } catch (durationErr) {
                reject(durationErr);
            }
        });
    });
}



/**
 * Updates the MP3 file data in the global `allMp3FilesData` array.
 * If the file already exists and its data is different, it updates the existing file data.
 * If the file does not exist, it adds the new file data to the array.
 *
 * @param {Object} mp3FileData - The MP3 file data to update or add.
 * @param {string} mp3FileData.name - The name of the MP3 file.
 * @param {Object} mp3FileData.data - The data of the MP3 file.
 */
function updateMp3FileData(mp3FileData) {
    const existingFileIndex = allMp3FilesData.findIndex(file => file.name === mp3FileData.name);

    if (existingFileIndex !== -1) {
        // Update existing file data if different
        const existingFile = allMp3FilesData[existingFileIndex];
        if (JSON.stringify(existingFile.data) !== JSON.stringify(mp3FileData.data)) {
            allMp3FilesData[existingFileIndex] = mp3FileData;
        }
    } else {
        // Add new file data
        allMp3FilesData.push(mp3FileData);
    }
}

/**
 * Recursively scans a directory for all .mp3 files and processes them incrementally.
 *
 * @param {string} dir - The directory to scan for .mp3 files.
 * @returns {Promise<void>} A promise that resolves when all .mp3 files have been scanned.
 *
 * @throws {Error} If there is an error reading the directory or processing an .mp3 file.
 */
async function scanAllMp3FilesIncremental(dir) {
    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of list) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await scanAllMp3FilesIncremental(filePath);
        } else if (file.isFile() && path.extname(file.name) === '.mp3') {
            try {
                const mp3Data = await getMp3Data(filePath);
                count++;
                console.log(`${count} - Scanned: ${mp3Data.name}`);
                console.log(`\tAlbum: ${mp3Data.data.album}`);
                console.log(`\tArtist: ${mp3Data.data.artist}`);
                //console.log(`\tComment: ${mp3Data.data.comment}`);
                console.log(`\tPart of Set: ${mp3Data.data.partOfSet}`);
                //console.log(`\tGenre: ${mp3Data.data.genre}`);
                console.log(`\tTitle: ${mp3Data.data.title}`);
                //console.log(`\tTrack Number: ${mp3Data.data.trackNumber}`);
                //console.log(`\tYear: ${mp3Data.data.year}`);
                console.log(`\tImage: ${mp3Data.data.image ? 'Yes' : 'No'}`);
                console.log(`\tDuration: ${mp3Data.data.duration}`);
                console.log(`\tTimestamp: ${mp3Data.timestamp}`);
                console.log('');
                updateMp3FileData(mp3Data);
            } catch (err) {
                console.error(`Error scanning file ${file.name}:`, err);
            }
        }
    }
}

/**
 * Asynchronously initializes and scans MP3 data incrementally.
 * 
 * This function checks if a scanning process is already in progress. If not, it sets the scanning flag to true and proceeds to scan all MP3 files incrementally from the specified audio directory. Once the scanning is complete, it saves the scanned MP3 data to a JSON file.
 * 
 * @async
 * @function initializeMp3DataIncremental
 * @returns {Promise<void>} A promise that resolves when the scanning and saving process is complete.
 * @throws Will throw an error if there is an issue during the scanning process.
 */
async function initializeMp3DataIncremental() {
    if (isScanning) {
        console.log("Scanning is already in progress...");
        return;
    }
    isScanning = true;

    const audioDir = path.join(__dirname, 'media_files', 'audio');
    try {
        await scanAllMp3FilesIncremental(audioDir);
        console.log(`Finished scanning ${allMp3FilesData.length} MP3 files.`);
        const dataFilePath = path.join(__dirname, 'allMp3FilesData.json');
        await fs.promises.writeFile(dataFilePath, JSON.stringify(allMp3FilesData, null, 2));
        console.log(`MP3 data saved to ${dataFilePath}`);
    } catch (err) {
        console.error("Error during scanning:", err);
    } finally {
        isScanning = false;
    }
}


/**
 * Asynchronously loads MP3 data from a JSON file and filters out non-existent files.
 * The function reads the JSON file containing MP3 file metadata, verifies the existence of each file,
 * and stores the valid data in the global `allMp3FilesData` variable.
 * It also triggers an incremental scan of the MP3 data.
 *
 * @async
 * @function loadMp3DataFromFile
 * @returns {Promise<void>} A promise that resolves when the MP3 data has been loaded and processed.
 * @throws Will throw an error if there is an issue reading or parsing the JSON file.
 */
async function loadMp3DataFromFile() {
    const dataFilePath = path.join(__dirname, 'allMp3FilesData.json');
    try {
        const data = await fs.promises.readFile(dataFilePath, 'utf8');
        const parsedData = JSON.parse(data);

        allMp3FilesData = await Promise.all(parsedData.map(async (file) => {
            const filePath = path.join(__dirname, file.path);
            if (fs.existsSync(filePath)) {
                return file;
            } else {
                console.warn(`File not found: ${filePath}`);
                return null;
            }
        }));

        allMp3FilesData = allMp3FilesData.filter(file => file !== null);
        console.log(`Loaded ${allMp3FilesData.length} MP3 files from ${dataFilePath}`);
    } catch (err) {
        console.error("Error loading MP3 data from file:", err);
    }

    // Trigger the incremental scan
    initializeMp3DataIncremental();
}

// Load MP3 data from file on startup
loadMp3DataFromFile();

app.get('/getalldata', (req, res) => {
    res.json(allMp3FilesData);
});

app.get('/get_lectors', (req, res) => {
    const audioDir = path.join(__dirname, 'media_files', 'audio');

    fs.readdir(audioDir, { withFileTypes: true }, async (err, files) => {
        if (err) {
            console.error("Error reading audio directory:", err);
            return res.status(500).send("Internal Server Error");
        }

        const folders = await Promise.all(files
            .filter(dirent => dirent.isDirectory())
            .map(async dirent => {
                const folderPath = path.join('media_files', 'audio', dirent.name);
                const folderFiles = await fs.promises.readdir(folderPath);
                const folderSize = folderFiles.reduce((total, file) => {
                    const filePath = path.join(folderPath, file);
                    const stats = fs.statSync(filePath);
                    return total + stats.size;
                }, 0);

                let thumbnailBase64 = null;
                const thumbnailPath = path.join(folderPath, 'thumbnail.jpg');
                if (fs.existsSync(thumbnailPath)) {
                    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
                    thumbnailBase64 = thumbnailBuffer.toString('base64');
                }

                return {
                    name: dirent.name,
                    path: folderPath,
                    fileCount: folderFiles.length,
                    size: folderSize,
                    thumbnail: thumbnailBase64
                };
            })
        );

        res.json(folders);
    });
});

app.get('/get_lectures_for', (req, res) => {
    const lectorName = req.query.lector;
    if (!lectorName) {
        return res.status(400).send("Lector name is required");
    }

    const filteredLectures = allMp3FilesData.filter(file => file.data.artist && file.data.artist.toLowerCase() === lectorName.toLowerCase());

    if (filteredLectures.length === 0) {
        return res.status(404).send("Lector not found");
    }

    res.json(filteredLectures);
});

app.get('/get_random', (req, res) => {
    const amount = parseInt(req.query.amount) || 33;

    try {
        const randomFiles = [];
        const usedIndices = new Set();
        while (randomFiles.length < amount && usedIndices.size < allMp3FilesData.length) {
            const randomIndex = Math.floor(Math.random() * allMp3FilesData.length);
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                randomFiles.push(allMp3FilesData[randomIndex]);
            }
        }
        res.json(randomFiles);
    } catch (err) {
        console.error("Error getting random files:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/get_books', (_, res) => {
    const booksDir = path.join(__dirname, 'media_files', 'books');

    fs.readdir(booksDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error("Error reading books directory:", err);
            return res.status(500).send("Internal Server Error");
        }

        const pdfFiles = files
            .filter(dirent => dirent.isFile() && path.extname(dirent.name) === '.pdf')
            .map(dirent => ({
                name: dirent.name,
                path: path.join('media_files', 'books', dirent.name)
            }));

        res.json(pdfFiles);
    });
});

app.get('/get_mp3_data', async (req, res) => {
    const filePath = req.query.filePath;
    if (!filePath) {
        return res.status(400).send("File path is required");
    }

    const file = allMp3FilesData.find(file => file.path === filePath);
    if (!file) {
        return res.status(404).send("File not found");
    }

    try {
        const mp3Data = allMp3FilesData.find(file => file.path === filePath);
        res.json(mp3Data);
    } catch (err) {
        console.error("Error reading MP3 data:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/download_mp3', (req, res) => {
    const fileId = req.query.id;
    if (!fileId) {
        return res.status(400).send("File ID is required");
    }

    const file = allMp3FilesData.find(file => path.basename(file.name, '.mp3') === fileId);
    if (!file) {
        return res.status(404).send("File not found");
    }

    const { artist, title } = file.data;
    const newFileName = `${fileId} - ${artist || 'Unknown Artist'} - ${title || 'Unknown Title'}.mp3`;
    const filePath = path.join(__dirname, file.path);

    res.download(filePath, newFileName, (err) => {
        if (err) {
            console.error("Error downloading file:", err);
            res.status(500).send("Internal Server Error");
        }
    });
});

app.get('/search', (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).send("Query parameter is required");
    }

    const lowerCaseQuery = query.toLowerCase();
    const results = allMp3FilesData.filter(file => {
        const fileData = { ...file.data };
        delete fileData.image;
        return Object.values(fileData).some(value => 
            value && value.toString().toLowerCase().includes(lowerCaseQuery)
        ) || file.name.toLowerCase().includes(lowerCaseQuery);
    });

    res.json(results);
});

app.get('/print_scanned_mp3_files', (req, res) => {
    let responseText = '';
    for (let i = 0; i <= 65535; i++) {
        const fileId = i.toString().padStart(5, '0');
        const file = allMp3FilesData.find(file => path.basename(file.name, '.mp3') === fileId);
        if (file) {
            responseText += `${fileId} - ${file.data.artist || 'Unknown Artist'} - ${file.data.title || 'Unknown Title'}\n`;
        } else {
            responseText += `${fileId}\n`;
        }
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(responseText);
});
//------------------------------- EsSelqm new frontend functions ---------------------------------