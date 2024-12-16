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
        // Calculate the duration of the MP3 file
        mp3Duration(filePath, (err, duration) => {
            if (err) {
                // Reject the promise if there is an error
                return reject(err);
            }

            // Calculate minutes and seconds from the duration
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);

            // Format the duration as "MM:SS"
            const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Resolve the promise with the formatted duration string
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
        // Read ID3 tags from the MP3 file
        id3.read(filePath, async (err, tags) => {
            if (err) {
                // Reject the promise if there is an error reading the tags
                return reject(err);
            }

            try {
                // Get the duration of the MP3 file
                const durationString = await getDuration(filePath);

                // Create an object with the MP3 file data
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

                // Resolve the promise with the MP3 file data
                resolve(mp3Data);
            } catch (durationErr) {
                // Reject the promise if there is an error getting the duration
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
    // Find the index of the existing file in the array by its name
    const existingFileIndex = allMp3FilesData.findIndex(file => file.name === mp3FileData.name);

    if (existingFileIndex !== -1) {
        // If the file already exists, check if its data is different
        const existingFile = allMp3FilesData[existingFileIndex];
        if (JSON.stringify(existingFile.data) !== JSON.stringify(mp3FileData.data)) {
            // Update the existing file data if it is different
            allMp3FilesData[existingFileIndex] = mp3FileData;
        }
    } else {
        // If the file does not exist, add the new file data to the array
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
    // Read the contents of the directory
    const list = await fs.promises.readdir(dir, { withFileTypes: true });

    // Iterate over each item in the directory
    for (const file of list) {
        const filePath = path.join(dir, file.name);

        // If the item is a directory, recursively scan it
        if (file.isDirectory()) {
            await scanAllMp3FilesIncremental(filePath);
        } 
        // If the item is an MP3 file, process it
        else if (file.isFile() && path.extname(file.name) === '.mp3') {
            try {
                // Retrieve MP3 metadata
                const mp3Data = await getMp3Data(filePath);
                count++;
                
                // Log the scanned MP3 file details
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

                // Update the global MP3 file data array
                updateMp3FileData(mp3Data);
            } catch (err) {
                // Log any errors that occur during the scanning process
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
    // Check if a scanning process is already in progress
    if (isScanning) {
        console.log("Scanning is already in progress...");
        return;
    }
    // Set the scanning flag to true to indicate that scanning is in progress
    isScanning = true;

    // Define the directory to scan for MP3 files
    const audioDir = path.join(__dirname, 'media_files', 'audio');
    try {
        // Start scanning all MP3 files incrementally
        await scanAllMp3FilesIncremental(audioDir);
        console.log(`Finished scanning ${allMp3FilesData.length} MP3 files.`);
        
        // Define the path to save the scanned MP3 data
        const dataFilePath = path.join(__dirname, 'allMp3FilesData.json');
        
        // Write the scanned MP3 data to a JSON file
        await fs.promises.writeFile(dataFilePath, JSON.stringify(allMp3FilesData, null, 2));
        console.log(`MP3 data saved to ${dataFilePath}`);
    } catch (err) {
        // Log any errors that occur during the scanning process
        console.error("Error during scanning:", err);
    } finally {
        // Reset the scanning flag to false to indicate that scanning is complete
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
    // Define the path to the JSON file containing MP3 data
    const dataFilePath = path.join(__dirname, 'allMp3FilesData.json');
    try {
        // Read the JSON file
        const data = await fs.promises.readFile(dataFilePath, 'utf8');
        // Parse the JSON data
        const parsedData = JSON.parse(data);

        // Verify the existence of each file and filter out non-existent files
        allMp3FilesData = await Promise.all(parsedData.map(async (file) => {
            const filePath = path.join(__dirname, file.path);
            if (fs.existsSync(filePath)) {
                return file;
            } else {
                console.warn(`File not found: ${filePath}`);
                return null;
            }
        }));

        // Filter out null values from the array
        allMp3FilesData = allMp3FilesData.filter(file => file !== null);
        console.log(`Loaded ${allMp3FilesData.length} MP3 files from ${dataFilePath}`);
    } catch (err) {
        // Log any errors that occur during the loading process
        console.error("Error loading MP3 data from file:", err);
    }

    // Trigger the incremental scan to update the MP3 data
    initializeMp3DataIncremental();
}

// Load MP3 data from file on startup
loadMp3DataFromFile();

// Endpoint to get all MP3 file data
app.get('/getalldata', (req, res) => {
    // Respond with the JSON representation of all MP3 files data
    res.json(allMp3FilesData);
});

app.get('/get_lectors', (req, res) => {
    // Define the directory to scan for lector folders
    const audioDir = path.join(__dirname, 'media_files', 'audio');

    // Read the contents of the audio directory
    fs.readdir(audioDir, { withFileTypes: true }, async (err, files) => {
        if (err) {
            // Log any errors that occur during the reading process
            console.error("Error reading audio directory:", err);
            // Respond with a 500 Internal Server Error status
            return res.status(500).send("Internal Server Error");
        }

        // Filter and map the directory contents to get only directories
        const folders = await Promise.all(files
            .filter(dirent => dirent.isDirectory())
            .map(async dirent => {
                // Define the path to the current folder
                const folderPath = path.join('media_files', 'audio', dirent.name);
                // Read the contents of the current folder
                const folderFiles = await fs.promises.readdir(folderPath);
                // Calculate the total size of all files in the folder
                const folderSize = folderFiles.reduce((total, file) => {
                    const filePath = path.join(folderPath, file);
                    const stats = fs.statSync(filePath);
                    return total + stats.size;
                }, 0);

                // Initialize the thumbnail image as null
                let thumbnailBase64 = null;
                // Define the path to the thumbnail image
                const thumbnailPath = path.join(folderPath, 'thumbnail.jpg');
                // Check if the thumbnail image exists
                if (fs.existsSync(thumbnailPath)) {
                    // Read the thumbnail image and convert it to base64
                    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
                    thumbnailBase64 = thumbnailBuffer.toString('base64');
                }

                // Return an object with the folder details
                return {
                    name: dirent.name,
                    path: folderPath,
                    fileCount: folderFiles.length,
                    size: folderSize,
                    thumbnail: thumbnailBase64
                };
            })
        );

        // Respond with the array of folder details as JSON
        res.json(folders);
    });
});

// Endpoint to get lectures for a specific lector
app.get('/get_lectures_for', (req, res) => {
    // Get the lector name from the query parameters
    const lectorName = req.query.lector;
    if (!lectorName) {
        // If no lector name is provided, return a 400 Bad Request response
        return res.status(400).send("Lector name is required");
    }

    // Filter the MP3 files data to find lectures by the specified lector
    const filteredLectures = allMp3FilesData.filter(file => file.data.artist && file.data.artist.toLowerCase() === lectorName.toLowerCase());

    if (filteredLectures.length === 0) {
        // If no lectures are found for the specified lector, return a 404 Not Found response
        return res.status(404).send("Lector not found");
    }

    // Respond with the filtered lectures as JSON
    res.json(filteredLectures);
});

// Endpoint to get a random selection of MP3 files
app.get('/get_random', (req, res) => {
    // Parse the amount of random files to return from the query parameter, default to 33 if not provided
    const amount = parseInt(req.query.amount) || 33;

    try {
        const randomFiles = [];
        const usedIndices = new Set();

        // Loop until we have the desired amount of random files or have exhausted all available files
        while (randomFiles.length < amount && usedIndices.size < allMp3FilesData.length) {
            // Generate a random index
            const randomIndex = Math.floor(Math.random() * allMp3FilesData.length);

            // Ensure the random index has not been used before
            if (!usedIndices.has(randomIndex)) {
                // Add the index to the set of used indices
                usedIndices.add(randomIndex);

                // Add the corresponding MP3 file to the random files array
                randomFiles.push(allMp3FilesData[randomIndex]);
            }
        }

        // Respond with the array of random MP3 files as JSON
        res.json(randomFiles);
    } catch (err) {
        // Log any errors that occur during the process
        console.error("Error getting random files:", err);

        // Respond with a 500 Internal Server Error status
        res.status(500).send("Internal Server Error");
    }
});

// Endpoint to get all PDF books
app.get('/get_books', (_, res) => {
    // Define the directory to scan for PDF books
    const booksDir = path.join(__dirname, 'media_files', 'books');

    // Read the contents of the books directory
    fs.readdir(booksDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            // Log any errors that occur during the reading process
            console.error("Error reading books directory:", err);
            // Respond with a 500 Internal Server Error status
            return res.status(500).send("Internal Server Error");
        }

        // Filter and map the directory contents to get only PDF files
        const pdfFiles = files
            .filter(dirent => dirent.isFile() && path.extname(dirent.name) === '.pdf')
            .map(dirent => ({
                name: dirent.name,
                path: path.join('media_files', 'books', dirent.name)
            }));

        // Respond with the array of PDF files as JSON
        res.json(pdfFiles);
    });
});

// Endpoint to get MP3 data for a specific file
app.get('/get_mp3_data', async (req, res) => {
    // Get the file path from the query parameters
    const filePath = req.query.filePath;
    if (!filePath) {
        // If no file path is provided, return a 400 Bad Request response
        return res.status(400).send("File path is required");
    }

    // Find the MP3 file data in the global array by its path
    const file = allMp3FilesData.find(file => file.path === filePath);
    if (!file) {
        // If the file is not found, return a 404 Not Found response
        return res.status(404).send("File not found");
    }

    try {
        // Respond with the MP3 file data as JSON
        const mp3Data = allMp3FilesData.find(file => file.path === filePath);
        res.json(mp3Data);
    } catch (err) {
        // Log any errors that occur during the process
        console.error("Error reading MP3 data:", err);
        // Respond with a 500 Internal Server Error status
        res.status(500).send("Internal Server Error");
    }
});

// Endpoint to get MP3 data for a specific file by its name
app.get('/get_mp3_data_by_name', (req, res) => {
    // Get the file name from the query parameters
    const fileName = req.query.filename;
    if (!fileName) {
        // If no file name is provided, return a 400 Bad Request response
        return res.status(400).send("File name is required");
    }

    // Find the MP3 file data in the global array by its name
    const file = allMp3FilesData.find(file => file.name === fileName);
    if (!file) {
        // If the file is not found, return a 404 Not Found response
        return res.status(404).send("File not found");
    }

    try {
        // Respond with the MP3 file data as JSON
        res.json(file);
    } catch (err) {
        // Log any errors that occur during the process
        console.error("Error reading MP3 data:", err);
        // Respond with a 500 Internal Server Error status
        res.status(500).send("Internal Server Error");
    }
});

app.get('/download_mp3', (req, res) => {
    // Get the file ID from the query parameters
    const fileId = req.query.id;
    if (!fileId) {
        // If no file ID is provided, return a 400 Bad Request response
        return res.status(400).send("File ID is required");
    }

    // Find the MP3 file data in the global array by its ID (basename without extension)
    const file = allMp3FilesData.find(file => path.basename(file.name, '.mp3') === fileId);
    if (!file) {
        // If the file is not found, return a 404 Not Found response
        return res.status(404).send("File not found");
    }

    // Extract artist and title from the file data
    const { artist, title } = file.data;
    // Create a new file name using the file ID, artist, and title
    const newFileName = `${fileId} - ${artist || 'Unknown Artist'} - ${title || 'Unknown Title'}.mp3`;
    // Get the full file path
    const filePath = path.join(__dirname, file.path);

    // Send the file as a download
    res.download(filePath, newFileName, (err) => {
        if (err) {
            // Log any errors that occur during the download process
            console.error("Error downloading file:", err);
            // Respond with a 500 Internal Server Error status
            res.status(500).send("Internal Server Error");
        }
    });
});

app.get('/search', (req, res) => {
    // Get the search query from the request parameters
    const query = req.query.query;
    if (!query) {
        // If no query is provided, return a 400 Bad Request response
        return res.status(400).send("Query parameter is required");
    }

    // Convert the query to lowercase for case-insensitive search
    const lowerCaseQuery = query.toLowerCase();

    // Filter the MP3 files data to find matches based on the query
    const results = allMp3FilesData.filter(file => {
        // Create a copy of the file data without the image property
        const fileData = { ...file.data };
        delete fileData.image;

        // Check if any value in the file data or the file name includes the query
        return Object.values(fileData).some(value => 
            value && value.toString().toLowerCase().includes(lowerCaseQuery)
        ) || file.name.toLowerCase().includes(lowerCaseQuery);
    });

    // Respond with the search results as JSON
    res.json(results);
});

// Endpoint to print scanned MP3 files
app.get('/print_scanned_mp3_files', (req, res) => {
    let responseText = '';

    // Loop through all possible file IDs from 00000 to 65535
    for (let i = 0; i <= 65535; i++) {
        // Pad the file ID with leading zeros to ensure it is 5 digits long
        const fileId = i.toString().padStart(5, '0');

        // Find the MP3 file data in the global array by its ID (basename without extension)
        const file = allMp3FilesData.find(file => path.basename(file.name, '.mp3') === fileId);

        if (file) {
            // If the file is found, append its details to the response text
            responseText += `${fileId} - ${file.data.artist || 'Unknown Artist'} - ${file.data.title || 'Unknown Title'}\n`;
        } else {
            // If the file is not found, append only the file ID to the response text
            responseText += `${fileId}\n`;
        }
    }

    // Set the response content type to plain text
    res.setHeader('Content-Type', 'text/plain');

    // Send the response text
    res.send(responseText);
});
//------------------------------- EsSelqm new frontend functions ---------------------------------